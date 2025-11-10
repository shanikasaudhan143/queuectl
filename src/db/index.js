import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
const dbPath = path.join(process.cwd(), 'queue.db');
 
const db = new Database(dbPath);

try {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
} catch (err) {
  console.error('Error initializing database schema:', err.message);
  process.exit(1);
}
 
db.pragma('journal_mode = WAL');

export default db;