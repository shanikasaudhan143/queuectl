import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as queries from './db/queries.js'; // Import all your queries

// ES6 replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

// Configure EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Simple auto-refresh header
app.use((req, res, next) => {
  res.setHeader('Refresh', '5'); // Refresh every 5 seconds
  next();
});

// Main dashboard route
app.get('/', (req, res) => {
  try {
    // Fetch all data from your DB in one go
    const statusCounts = queries.getJobCounts();
    const pendingJobs = queries.listJobsByState('pending');
    const completedJobs = queries.listJobsByState('completed');
    const dlqJobs = queries.listDlqJobs();
    const stats = queries.getJobStats();
    
    // Format status counts into an easy-to-use object
    const status = { pending: 0, completed: 0, processing: 0, failed: 0 };
    statusCounts.forEach(s => { status[s.state] = s.count });

    res.render('dashboard', {
      status,
      stats: {
        ...stats,
        avg_duration_sec: stats.avg_duration_sec ? stats.avg_duration_sec.toFixed(3) : 0,
        min_duration_sec: stats.min_duration_sec ? stats.min_duration_sec.toFixed(3) : 0,
        max_duration_sec: stats.max_duration_sec ? stats.max_duration_sec.toFixed(3) : 0,
      },
      pendingJobs,
      completedJobs,
      dlqJobs
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

export function startDashboard() {
  app.listen(PORT, () => {
    console.log(`🚀 Queuectl Dashboard running at http://localhost:${PORT}`);
    console.log('(Press Ctrl+C to stop)');
  });
}