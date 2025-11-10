 
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',  
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
   
  priority INTEGER NOT NULL DEFAULT 0,
 
  timeout_seconds INTEGER NOT NULL DEFAULT 300,  

  run_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')),
   

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
  priority INTEGER
);
 
CREATE INDEX IF NOT EXISTS idx_jobs_priority_pending ON jobs (priority, state, run_at);