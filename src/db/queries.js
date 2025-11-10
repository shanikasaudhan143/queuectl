import db from './index.js';

// A cleaner, safer way to get a SQLite-friendly UTC timestamp
function getSQLiteTimestamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function addJob(job) {
  try {
    const now = getSQLiteTimestamp();
    
    db.prepare(
      `INSERT INTO jobs (
         id, command, max_retries, priority, timeout_seconds, run_at, created_at, updated_at
       )
       VALUES (
         @id,
         @command,
         @max_retries,
         @priority,
         COALESCE(@timeout_seconds, 300),
         COALESCE(@run_at, @now),
         @now,
         @now
       )`
    ).run({
      id: job.id,
      command: job.command,
      max_retries: job.max_retries,
      priority: job.priority,
      timeout_seconds: job.timeout_seconds,
      run_at: job.run_at, // run_at is now formatted in enqueue.js
      now: now,
    });
    return true;
  } catch (err) {
    console.error(`Error adding job ${job.id}: ${err.message}`);
    return false;
  }
}

export const getNextPendingJob = db.transaction(() => {
  // Use SQLite's 'now' function for the check
  const now = getSQLiteTimestamp();
  const job = db
    .prepare(
      `SELECT * FROM jobs
       WHERE state = 'pending' AND run_at <= STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
       ORDER BY priority DESC, created_at ASC
       LIMIT 1`
    )
    .get(); // No params needed

  if (job) {
    db.prepare(
      `UPDATE jobs
       SET state = 'processing', updated_at = @now, started_at = @now
       WHERE id = @id`
    ).run({ now, id: job.id });
    
    return { ...job, state: 'processing', started_at: now };
  }
  
  return undefined;
});

export function updateJobSuccess(id, durationSeconds) {
  const now = getSQLiteTimestamp();
  db.prepare(
    `UPDATE jobs
     SET state = 'completed',
         updated_at = @now,
         completed_at = @now,
         duration_seconds = @durationSeconds
     WHERE id = @id`
  ).run({ now, id, durationSeconds });
}

export function updateJobFailure(id, attempts, nextRunAt, error) {
  // 'nextRunAt' is already a formatted string from the worker, so this is fine
  db.prepare(
    `UPDATE jobs
     SET state = 'pending', attempts = ?, run_at = ?, updated_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
     WHERE id = ?`
  ).run(attempts, nextRunAt, id);
}

export const moveJobToDLQ = db.transaction((job, error) => {
  db.prepare(
    `INSERT INTO dead_letter_queue (job_id, command, attempts, last_error, priority)
     VALUES (?, ?, ?, ?, ?)`
  ).run(job.id, job.command, job.attempts, error.toString(), job.priority);
  
  db.prepare(`DELETE FROM jobs WHERE id = ?`).run(job.id);
  console.log(`Moved job ${job.id} to DLQ.`);
});

export const retryDlqJob = db.transaction((jobId) => {
  const job = db.prepare(`SELECT * FROM dead_letter_queue WHERE job_id = ?`).get(jobId);
  if (!job) {
    console.error(`DLQ Job ${jobId} not found.`);
    return false;
  }
  
  db.prepare(
    `INSERT INTO jobs (id, command, max_retries, state, attempts, priority)
     VALUES (?, ?, ?, 'pending', 0, ?)`
  ).run(job.job_id, job.command, job.attempts, job.priority);

  db.prepare(`DELETE FROM dead_letter_queue WHERE job_id = ?`).run(jobId);
  console.log(`Job ${jobId} moved from DLQ back to pending queue.`);
  return true;
});

// --- No changes to the functions below ---
export function getJobCounts() {
  return db.prepare(`SELECT state, COUNT(*) as count FROM jobs GROUP BY state`).all();
}

export function listJobsByState(state) {
  return db.prepare(`SELECT * FROM jobs WHERE state = ?`).all(state);
}

export function listDlqJobs() {
  return db.prepare(`SELECT * FROM dead_letter_queue`).all();
}

export function getJobStats() {
  return db.prepare(
    `SELECT
       COUNT(*) as total_completed,
       AVG(duration_seconds) as avg_duration_sec,
       MIN(duration_seconds) as min_duration_sec,
       MAX(duration_seconds) as max_duration_sec
     FROM jobs
     WHERE state = 'completed' AND duration_seconds IS NOT NULL`
  ).get();
}