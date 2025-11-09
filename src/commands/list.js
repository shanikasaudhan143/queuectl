import * as queries from '../db/queries.js';

export function handler(argv) {
  const { state } = argv;
  let jobs;

  try {
    if (state.toLowerCase() === 'dlq' || state.toLowerCase() === 'dead') {
      console.log('--- Listing Dead Letter Queue (DLQ) Jobs ---');
      jobs = queries.listDlqJobs();
    } else {
      console.log(`--- Listing '${state}' Jobs ---`);
      jobs = queries.listJobsByState(state);
    }
    
    if (jobs.length === 0) {
      console.log(`No jobs found with state: ${state}`);
    } else {
      console.table(jobs);
    }
  } catch (err) {
    console.error(`Error listing jobs:`, err.message);
  }
}