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
    
    const job = {
      ...jobData,
      max_retries: jobData.max_retries || config.max_retries,
    };

    if (queries.addJob(job)) {
      console.log(`Job enqueued with ID: ${job.id}`);
    }

  } catch (err) {
    console.error('Error: Invalid JSON provided for job.', err.message);
  }
}