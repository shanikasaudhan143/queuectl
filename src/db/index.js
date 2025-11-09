import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES6 replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the database file
const dbPath = path.join(process.cwd(), 'queue.db');

// Create or open the database
const db = new Database(dbPath);

// Read and execute the schema file to ensure tables exist
try {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
} catch (err) {
  console.error('Error initializing database schema:', err.message);
  process.exit(1);
}

// Enable WAL mode for better concurrency (multiple readers/writers)
db.pragma('journal_mode = WAL');

console.log('Database initialized and connected.');

export default db;