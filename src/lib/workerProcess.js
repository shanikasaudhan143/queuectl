import { exec } from 'child_process';
import util from 'util';
import * as queries from '../db/queries.js';
import { getConfig } from './configManager.js';

// Promisify 'exec' to use it with async/await
const execPromise = util.promisify(exec);

// A simple sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function processJobs() {
  const workerId = process.pid;
  console.log(`Worker ${workerId} started.`);

  while (true) {
    let job;
    try {
      // 1. Get a job (this will lock the row)
      job = queries.getNextPendingJob();

      if (job) {
        console.log(`[Worker ${workerId}] Processing job: ${job.id}`);
        
        // 2. Try to execute the command
        try {
          const { stdout, stderr } = await execPromise(job.command);
          
          if (stderr) {
            // Some commands (like 'echo') write to stderr but don't "fail"
            // You might want to log this: console.warn(`[Job ${job.id}] STDERR: ${stderr}`);
          }

          // 3. Handle success
          if (stdout) {
            console.log(`[Worker ${workerId}] Output: ${stdout.trim()}`);
          }
          console.log(`[Worker ${workerId}] Job ${job.id} completed.`);
          queries.updateJobSuccess(job.id);

        } catch (execError) {
          // 4. Handle command execution failure
          console.error(`[Worker ${workerId}] Job ${job.id} FAILED. Error: ${execError.message}`);
          const newAttempts = job.attempts + 1;
          const config = getConfig();

          if (newAttempts >= job.max_retries) {
            // 4a. Move to DLQ
            queries.moveJobToDLQ(job, execError.message);
          } else {
            // 4b. Calculate backoff and schedule retry
            // delay = base ^ attempts
            const delayInSeconds = Math.pow(config.backoff_base, newAttempts);
            const nextRunAt = new Date(Date.now() + delayInSeconds * 1000)
                                .toISOString().replace('T', ' ').replace('Z', '');
            
            console.log(`[Worker ${workerId}] Job ${job.id} will retry in ${delayInSeconds}s.`);
            queries.updateJobFailure(job.id, newAttempts, nextRunAt, execError.message);
          }
        }
      } else {
        // No job found, wait a bit before polling again
        await sleep(2000); // 2-second poll
      }
    } catch (dbError) {
      // This catches errors in the 'getNextPendingJob' query itself
      console.error(`[Worker ${workerId}] Database error:`, dbError.message);
      await sleep(5000); // Wait longer if DB is having issues
    }
  }
}

// Start the worker loop
processJobs();