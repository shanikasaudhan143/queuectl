import * as queries from '../db/queries.js';

export function handler(argv) {
  const { action, jobId } = argv;

  try {
    if (action === 'list') {
      const jobs = queries.listDlqJobs();
      if (jobs.length === 0) {
        console.log('Dead Letter Queue is empty.');
      } else {
        console.log('--- Dead Letter Queue Jobs ---');
        console.table(jobs);
      }
    } 
    else if (action === 'retry') {
      if (!jobId) {
        console.error('Error: You must provide a "jobId" to retry.');
        return;
      }
      if(queries.retryDlqJob(jobId)) {
        console.log(`Job ${jobId} has been successfully moved to the pending queue.`);
      } else {
        console.error(`Failed to retry job ${jobId}. Does it exist in the DLQ?`);
      }
    }
  } catch (err) {
    console.error(`Error managing DLQ:`, err.message);
  }
}