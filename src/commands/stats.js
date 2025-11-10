import * as queries from '../db/queries.js';

export function handler(argv) {
  try {
    const stats = queries.getJobStats();
    
    if (!stats || stats.total_completed === 0) {
      console.log('No completed job statistics to display.');
      return;
    }
    
    // Format the stats for better display
    const formattedStats = {
      'Total Completed Jobs': stats.total_completed,
      'Average Duration': `${stats.avg_duration_sec.toFixed(3)}s`,
      'Min Duration': `${stats.min_duration_sec.toFixed(3)}s`,
      'Max Duration': `${stats.max_duration_sec.toFixed(3)}s`,
    };

    console.log('--- Job Execution Stats ---');
    console.table(formattedStats);

  } catch (err) {
    console.error('Error fetching statistics:', err.message);
  }
}