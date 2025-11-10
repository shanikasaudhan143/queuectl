import { spawn } from 'child_process';
import * as queries from '../db/queries.js'; // <-- THE SYNTAX FIX
import { getConfig } from './configManager.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let isShuttingDown = false;

/**
 * A robust promise-based wrapper for child_process.spawn
 * that handles streaming stdout/stderr, timeouts, and detached state.
 */
function runJob(command, timeoutMs, workerId) {
  return new Promise((resolve, reject) => {
    // Use shell: true to allow commands like 'ping > nul'
    // Use detached: true to fix the graceful shutdown.
    const child = spawn(command, {
      shell: true,
      detached: true, // <-- FIXES GRACEFUL STOP
      timeout: timeoutMs
    });

    let stdout = '';
    let stderr = '';

    // Stream output instead of buffering it
    child.stdout.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        console.log(`[Worker ${workerId}] STDOUT: ${line}`);
        stdout += line + '\n';
      }
    });

    child.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        console.warn(`[Worker ${workerId}] STDERR: ${line}`);
        stderr += line + '\n';
      }
    });

    // Handle a timeout
    child.on('timeout', () => {
      child.kill('SIGKILL'); // Ensure it's dead on timeout
      reject(new Error(`Timeout exceeded ${timeoutMs / 1000}s`));
    });

    // Handle command not found, etc.
    child.on('error', (err) => {
      reject(err);
    });

    // Job finished
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Process exited with code ${code}. Stderr: ${stderr}`));
      }
    });
  });
}


// --- PROCESSJOBS (NOW USING `runJob`) ---

async function processJobs() {
  const workerId = process.pid;
  console.log(`Worker ${workerId} started.`);

  while (!isShuttingDown) {
    let job;
    const startTime = Date.now();
    try {
      if (isShuttingDown) {
        break;
      }

      job = queries.getNextPendingJob();

      if (job) {
        console.log(`[Worker ${workerId}] Processing job: ${job.id} (Priority: ${job.priority})`);
        
        try {
          const jobTimeoutMs = (job.timeout_seconds || 300) * 1000;
          
          // --- THIS IS THE NEW, STABLE CALL ---
          await runJob(job.command, jobTimeoutMs, workerId);
          
          const durationSeconds = (Date.now() - startTime) / 1000;
          console.log(`[Worker ${workerId}] Job ${job.id} completed in ${durationSeconds.toFixed(2)}s.`);
          
          // --- GRACEFUL SHUTDOWN FIX ---
          // This try/catch is separate, and the (!isShuttingDown) 
          // check is REMOVED to allow saving the final job.
          try {
            queries.updateJobSuccess(job.id, durationSeconds);
          } catch (updateError) {
            console.error(`[Worker ${workerId}] CRITICAL: FAILED TO UPDATE JOB SUCCESS:`);
            console.error(updateError.stack);
          }
          // --- END FIX ---

        } catch (execError) {
          // This block is now for *actual* job failures (e.g., timeout or real error)
          
          if (execError.message.includes('Timeout')) {
            console.error(`[Worker ${workerId}] Job ${job.id} FAILED: Timeout exceeded`);
          } else {
            console.error(`[Worker ${workerId}] Job ${job.id} FAILED. Error: ${execError.message}`);
          }
          
          const newAttempts = job.attempts + 1;
          const config = getConfig();

          // --- CRASH-PROOF FIX ---
          try {
            if (newAttempts >= job.max_retries) {
              console.log(`[Worker ${workerId}] Job ${job.id} failed final attempt. Moving to DLQ.`);
              queries.moveJobToDLQ(job, execError.message);
            } else {
              const delayInSeconds = Math.pow(config.backoff_base, newAttempts);
              const nextRunAt = new Date(Date.now() + delayInSeconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
              console.log(`[Worker ${workerId}] Job ${job.id} will retry in ${delayInSeconds}s.`);
              queries.updateJobFailure(job.id, newAttempts, nextRunAt, execError.message);
            }
          } catch (dbUpdateError) {
            console.error(`[Worker ${workerId}] CRITICAL: FAILED TO UPDATE JOB FAILURE/DLQ for ${job.id}:`);
            console.error(dbUpdateError.stack);
          }
          // --- END FIX ---
        }
      } else {
        // Poll for jobs, checking for shutdown
        for (let i = 0; i < 20; i++) {
          if (isShuttingDown) break;
          await sleep(100);
        }
      }
    } catch (dbError) {
      console.error(`[Worker ${workerId}] Database error during job loop:`);
      console.error(dbError.stack);
      
      if (!isShuttingDown) {
        await sleep(5000);
      }
    }
  }

  console.log(`[Worker ${workerId}] Shutdown complete. Exiting.`);
  process.exit(0);
}

process.on('SIGTERM', () => {
  console.log(`[Worker ${process.pid}] Received SIGTERM. Finishing current job and shutting down...`);
  isShuttingDown = true;
});

// Top-level catcher
processJobs().catch(err => {
  console.error(`[Worker ${process.pid}] UNHANDLED CRITICAL ERROR:`);
  console.error(err ? err.stack : 'Unknown Error'); 
  setTimeout(() => {
    process.exit(1); // This is what was causing your `exit 1`
  }, 1000);
});