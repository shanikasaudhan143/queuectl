import * as queries from '../db/queries.js';

export function handler(argv) {
  try {
    const counts = queries.getJobCounts();
    if (counts.length === 0) {
      console.log('Queue is empty.');
      return;
    }
    
    console.log('--- Job Status ---');
    console.table(counts);

    const dlqJobs = queries.listDlqJobs();
    console.log(`\nDead Letter Queue (DLQ): ${dlqJobs.length} job(s)`);

  } catch (err) {
    console.error('Error fetching status:', err.message);
  }
}