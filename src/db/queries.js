import db from './index.js';

// This is the most important query. It's a transaction, so
// no two workers can grab the same job.
export const getNextPendingJob = db.transaction(() => {
  // 1. Find the next available job
  const job = db
    .prepare(
      `SELECT * FROM jobs
       WHERE state = 'pending' AND run_at <= STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .get();

  if (job) {
    // 2. Lock the job by setting its state to 'processing'
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
    db.prepare(
      `UPDATE jobs
       SET state = 'processing', updated_at = ?
       WHERE id = ?`
    ).run(now, job.id);

    // 3. Return the job
    return { ...job, state: 'processing' };
  }
  
  // No job found
  return undefined;
});

export function addJob(job) {
  try {
    db.prepare(
      `INSERT INTO jobs (id, command, max_retries)
       VALUES (@id, @command, @max_retries)`
    ).run({
      id: job.id,
      command: job.command,
      max_retries: job.max_retries || 3,
    });
    return true;
  } catch (err) {
    console.error(`Error adding job ${job.id}: ${err.message}`);
    return false;
  }
}

export function updateJobSuccess(id) {
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
  // TODO: Write the SQL query to set the job's state to 'completed'
  // and update 'updated_at'
  db.prepare(
    `UPDATE jobs SET state = 'completed', updated_at = ? WHERE id = ?`
  ).run(now, id);
}

export function updateJobFailure(id, attempts, nextRunAt, error) {
  // TODO: Write the SQL query to set the job's state back to 'pending',
  // increment 'attempts', and set the future 'run_at' time.
  db.prepare(
    `UPDATE jobs
     SET state = 'pending', attempts = ?, run_at = ?, updated_at = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
     WHERE id = ?`
  ).run(attempts, nextRunAt, id);
}

export const moveJobToDLQ = db.transaction((job, error) => {
  // 1. Insert into DLQ
  db.prepare(
    `INSERT INTO dead_letter_queue (job_id, command, attempts, last_error)
     VALUES (?, ?, ?, ?)`
  ).run(job.id, job.command, job.attempts, error.toString());
  
  // 2. Delete from main jobs table
  db.prepare(`DELETE FROM jobs WHERE id = ?`).run(job.id);
  console.log(`Moved job ${job.id} to DLQ.`);
});

export function getJobCounts() {
  // TODO: Write a query to return the count of jobs grouped by state
  // e.g., SELECT state, COUNT(*) as count FROM jobs GROUP BY state
  return db.prepare(`SELECT state, COUNT(*) as count FROM jobs GROUP BY state`).all();
}

export function listJobsByState(state) {
  // TODO: Write a query to select all jobs matching a given state
  return db.prepare(`SELECT * FROM jobs WHERE state = ?`).all(state);
}

export function listDlqJobs() {
  // TODO: Write a query to select all jobs from the dead_letter_queue
  return db.prepare(`SELECT * FROM dead_letter_queue`).all();
}

export const retryDlqJob = db.transaction((jobId) => {
  // TODO: 
  // 1. Find the job in 'dead_letter_queue'
  const job = db.prepare(`SELECT * FROM dead_letter_queue WHERE job_id = ?`).get(jobId);
  if (!job) {
    console.error(`DLQ Job ${jobId} not found.`);
    return false;
  }
  
  // 2. Insert it back into 'jobs' table (resetting state and attempts)
  db.prepare(
    `INSERT INTO jobs (id, command, max_retries, state, attempts)
     VALUES (?, ?, ?, 'pending', 0)`
  ).run(job.job_id, job.command, job.attempts);

  // 3. Delete it from 'dead_letter_queue'
  db.prepare(`DELETE FROM dead_letter_queue WHERE job_id = ?`).run(jobId);
  console.log(`Job ${jobId} moved from DLQ back to pending queue.`);
  return true;
});