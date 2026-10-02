import Database from 'better-sqlite3'
import { resolve } from 'path'

// DATA_DIR lets a host point the SQLite file at a mounted volume. Without it the
// file lands in the process working directory, which on most PaaS filesystems is
// ephemeral and gets wiped on every redeploy.
const dataDir = process.env.DATA_DIR ?? process.cwd()
const dbPath = resolve(dataDir, 'data.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    mode           TEXT NOT NULL,               -- 'upload' | 'camera'
    face_count     INTEGER NOT NULL DEFAULT 0,
    primary_gender TEXT,                        -- dominant gender of the session
    primary_confidence REAL,                   -- 0..1
    average_age    REAL,
    results_json   TEXT NOT NULL,               -- [{gender, confidence, age}]
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
`)

export default db