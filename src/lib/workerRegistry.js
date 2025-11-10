import fs from 'fs';
import path from 'path';

// This file will store the PIDs of all running workers
const REGISTRY_PATH = path.join(process.cwd(), 'workers.registry.json');

// Helper to read the registry file
function readRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return []; // No file, no workers
  }
  try {
    const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading worker registry:', e.message);
    return [];
  }
}

// Helper to write to the registry file
function writeRegistry(pids) {
  try {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(pids, null, 2));
  } catch (e) {
    console.error('Error writing worker registry:', e.message);
  }
}

// Adds a worker PID to the list
export function addWorker(pid) {
  const pids = readRegistry();
  if (!pids.includes(pid)) {
    pids.push(pid);
    writeRegistry(pids);
  }
}

// Removes a worker PID from the list
export function removeWorker(pid) {
  let pids = readRegistry();
  if (pids.includes(pid)) {
    pids = pids.filter(p => p !== pid);
    writeRegistry(pids);
  }
}

// Gets all registered worker PIDs
export function getWorkers() {
  return readRegistry();
}

// Clears the registry (e.g., on a clean stop)
export function clearRegistry() {
  writeRegistry([]);
}