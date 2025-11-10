import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as registry from '../lib/workerRegistry.js';
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startHandler(argv) {
  console.log(`Starting ${argv.count} worker(s)...`);
  
  const workerScriptPath = path.join(__dirname, '..', 'lib', 'workerProcess.js');

  for (let i = 0; i < argv.count; i++) {
    const worker = fork(workerScriptPath);
    console.log(`Started worker with PID: ${worker.pid}`);
    
    registry.addWorker(worker.pid);
    worker.on('exit', (code) => {
      console.log(`Worker ${worker.pid} exited with code ${code}`);
      registry.removeWorker(worker.pid);
    });
  }
}

export function stopHandler(argv) {
  console.log('Sending graceful stop signal to all workers...');
  const pids = registry.getWorkers();

  if (pids.length === 0) {
    console.log('No workers found running.');
    return;
  }

  pids.forEach(pid => {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Sent stop signal to worker ${pid}`);
    } catch (e) {
      if (e.code === 'ESRCH') {
        console.log(`Worker ${pid} not found (stale registry). Removing.`);
        registry.removeWorker(pid);
      } else {
        console.error(`Error stopping worker ${pid}:`, e.message);
      }
    }
  });
}