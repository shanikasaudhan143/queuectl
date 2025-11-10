import fs from 'fs';
import path from 'path';
 
const REGISTRY_PATH = path.join(process.cwd(), 'workers.registry.json');
 
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
 
function writeRegistry(pids) {
  try {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(pids, null, 2));
  } catch (e) {
    console.error('Error writing worker registry:', e.message);
  }
}
 
export function addWorker(pid) {
  const pids = readRegistry();
  if (!pids.includes(pid)) {
    pids.push(pid);
    writeRegistry(pids);
  }
}
 
export function removeWorker(pid) {
  let pids = readRegistry();
  if (pids.includes(pid)) {
    pids = pids.filter(p => p !== pid);
    writeRegistry(pids);
  }
}
 
export function getWorkers() {
  return readRegistry();
}
 
export function clearRegistry() {
  writeRegistry([]);
}