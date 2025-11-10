import * as queries from '../db/queries.js';
import * as configManager from '../lib/configManager.js';

export function handler(argv) {
  try {
    const jobData = JSON.parse(argv.job);
    
    if (!jobData.id || !jobData.command) {
      console.error('Error: Job JSON must include "id" and "command".');
      return;
    }

    const config = configManager.getConfig();
     
    let run_at_timestamp;
    if (jobData.run_at) {
      run_at_timestamp = new Date(jobData.run_at).toISOString().slice(0, 19).replace('T', ' ');
    }
    
    const job = {
      ...jobData,
      max_retries: jobData.max_retries || config.max_retries,
      run_at: run_at_timestamp,  
      priority: jobData.priority || 0,
      timeout_seconds: jobData.timeout_seconds,
    };

    if (queries.addJob(job)) {
      console.log(`Job enqueued with ID: ${job.id}`);
    }

  } catch (err) {
    console.error('Error: Invalid JSON provided for job.', err.message);
  }
}