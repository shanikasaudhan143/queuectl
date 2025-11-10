# queuectl 🚀

A minimal, production-grade, CLI-based background job queue system built with Node.js and SQLite. This project was built for the Backend Developer Internship Assignment.

This system manages background jobs with multiple worker processes, handles retries with exponential backoff, and maintains a Dead Letter Queue (DLQ) for failed jobs. It also includes a full suite of bonus features, including job priorities, timeouts, scheduled jobs, and a live web dashboard.

---

## 🌟 Features

| Feature | Status | Description |
| :--- | :---: | :--- |
| **Enqueue Jobs** | ✅ | Add new jobs to the queue via a JSON-based CLI. |
| **Multiple Workers** | ✅ | Process jobs in parallel with multiple `fork`-ed processes. |
| **Persistence** | ✅ | Job state is persisted in an **SQLite** database, surviving restarts. |
| **Concurrency Safe** | ✅ | Uses database-level transactions to prevent job-locking race conditions. |
| **Retry & Backoff** | ✅ | Failed jobs automatically retry with `base ^ attempts` exponential backoff. |
| **Dead Letter Queue** | ✅ | Jobs that exhaust their retries are moved to a DLQ for inspection. |
| **Graceful Shutdown** | ✅ | `worker stop` command sends a `SIGTERM` signal, allowing workers to finish their current job before exiting. |
| **Job Timeouts** | ✅ | (Bonus) Jobs can be given a `timeout_seconds` property to kill long-running processes. |
| **Job Priority** | ✅ | (Bonus) Jobs with a higher `priority` number are processed first. |
| **Scheduled Jobs** | ✅ | (Bonus) Jobs can be scheduled to run in the future using the `run_at` property. |
| **Output Logging** | ✅ | (Bonus) Worker logs `STDOUT` and `STDERR` from jobs. |
| **Metrics & Stats** | ✅ | (Bonus) `queuectl stats` command shows execution metrics (avg, min, max). |
| **Web Dashboard** | ✅ | (Bonus) `queuectl dashboard` launches a live-monitoring dashboard at `http://localhost:3000`. |

---

## ⚙️ Tech Stack

* **Runtime:** Node.js (v18+)
* **Database:** SQLite (using `better-sqlite3` for fast, synchronous access and transactions)
* **CLI:** `yargs`
* **Web Dashboard:** `express` and `ejs`

---

## Setup Instructions

To run the project locally, you will need [Node.js](https://nodejs.org/) (v18 or higher) and `npm`.

**1. Clone the Repository**
```bash
git clone [https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git](https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git)
cd queuectl
```
**2. Install Dependencies This installs yargs, better-sqlite3, express, and ejs.**

```bash
npm install
```
**3. Link the CLI This is the most important step. It makes the queuectl command available globally on your system.**

```bash

npm link
```
**4. Verify Installation You should now see the help menu.**

```bash

queuectl --help
```

## 📖 Usage Examples
1. Enqueueing Jobs
Jobs are enqueued as a JSON string. The only required fields are id and command.

Simple Job (Success)

```bash

# Note: 'echo' works on both Windows and Linux
queuectl enqueue '{"id":"job-1","command":"echo Hello World"}'
```
Long-Running Job (Success)

```bash

# Linux/macOS
queuectl enqueue '{"id":"job-2","command":"sleep 3"}'

# Windows
queuectl enqueue '{"id":"job-2","command":"ping -n 4 127.0.0.1 > nul"}'
```
Failing Job (for DLQ Test)

```bash

queuectl enqueue '{"id":"job-3","command":"exit 1"}'
```
Full-Featured Job (with Bonus Features) This job is high priority, runs after 10 seconds, and will time out if it takes longer than 2 seconds.

```bash

queuectl enqueue '{"id":"job-4", "command":"sleep 5", "priority": 10, "timeout_seconds": 2, "run_at": "2025-11-10T18:30:00"}'
```
2. Managing Workers
You need at least two terminals.

Terminal 2: Start Workers Start 2 workers in parallel. This process will stay running.

```bash

queuectl worker start --count 2
```
Output:

Starting 2 worker(s)...
Started worker with PID: 1234
Started worker with PID: 5678
Worker 1234 started.
Worker 5678 started.
Terminal 1: Stop Workers This sends a graceful shutdown signal. Workers will finish their current job before exiting.

```bash

queuectl worker stop
```
Output:

Sending graceful stop signal to all workers...
Sent stop signal to worker 1234
Sent stop signal to worker 5678
3. Monitoring and Stats
Check High-Level Status

```bash

queuectl status
```
Output:

```bash
--- Job Status ---
┌─────────┬─────────────┬───────┐
│ (index) │ state       │ count │
├─────────┼─────────────┼───────┤
│ 0       │ 'completed' │ 1     │
│ 1       │ 'pending'   │ 2     │
└─────────┴─────────────┴───────┘
```
Dead Letter Queue (DLQ): 0 job(s)
Check Execution Metrics

```bash

queuectl stats

```
Output:

```bash
--- Job Execution Stats ---
┌──────────────────────┬─────────┐
│ (index)              │ Values  │
├──────────────────────┼─────────┤
│ 'Total Completed Jobs' │ 1       │
│ 'Average Duration'   │ '0.048s' │
│ 'Min Duration'       │ '0.048s' │
│ 'Max Duration'       │ '0.048s' │
└──────────────────────┴─────────┘
```
List Specific Jobs

```bash

queuectl list --state pending
```
4. Dead Letter Queue (DLQ)
List Failed Jobs

```bash
queuectl dlq list
```
Retry a Failed Job This moves the job from the DLQ back to the pending queue.

```bash
queuectl dlq retry "job-3"
```
5. Web Dashboard
Start the Dashboard

```bash
queuectl dashboard
```

Output:

🚀 Queuectl Dashboard running at http://localhost:3000
Now open http://localhost:3000 in your browser to see a live-refreshing view of the queue.

## 🏗️ Architecture Overview
- The system is a modular CLI application with a clear separation of concerns.

- cli.js: The main entry point. Uses yargs to parse commands.

- src/commands/: Contains the logic for each CLI command (e.g., enqueue.js, worker.js).

- src/lib/: Contains the core business logic.

- workerProcess.js: The "brain" of the worker. This code is run in a separate process. It contains the main loop that fetches, executes, and handles jobs.

- workerRegistry.js: Manages a workers.registry.json file to track the PIDs of running workers for the worker stop command.

- src/db/: The persistence layer.

- index.js: Exports the shared better-sqlite3 database connection.

- schema.sql: Defines the jobs and dead_letter_queue tables.

- queries.js: Contains all SQL logic, exported as simple functions.

- src/dashboard.js: A simple express server that serves the src/views/dashboard.ejs template.

- Job Lifecycle pending → processing → completed pending → processing → failed → (retry) → pending → ... → dead

 ## Data Persistence & Concurrency
The system uses SQLite for persistence. This choice was made over a simple JSON file to solve the concurrency and race condition problem.

- When multiple workers try to get a job at the same time, we must prevent them from grabbing the same job. This is solved in src/db/queries.js:

- The getNextPendingJob function is a database transaction.

- It finds the next available job.

- It immediately updates that job's state to processing.

- It commits the transaction and returns the job.

- Because this is an atomic transaction, only one worker can ever "win" and get the job, making the system safe for parallel processing.

[Link to CLI Demo Video]  

 

Open http://localhost:3000 in a browser.

While the dashboard is open, enqueue and process jobs. Watch the dashboard update live.
