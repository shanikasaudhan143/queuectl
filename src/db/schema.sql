-- All the new columns for bonus features are added
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  
  -- Bonus: Priority
  priority INTEGER NOT NULL DEFAULT 0,

  -- Bonus: Timeout
  timeout_seconds INTEGER NOT NULL DEFAULT 300, -- 5-minute default timeout

  -- Bonus: Scheduled Jobs
  run_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
  
  -- Bonus: Metrics
  started_at TEXT,
  completed_at TEXT,
  duration_seconds REAL,

  created_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
  updated_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))
);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  job_id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  failed_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
  last_error TEXT,
  -- Also add priority to DLQ for context
  priority INTEGER
);

-- Index for priority, state, and run_at for the worker
CREATE INDEX IF NOT EXISTS idx_jobs_priority_pending ON jobs (priority, state, run_at);