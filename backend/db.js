import Database from 'better-sqlite3'
import { resolve } from 'path'

const dbPath = resolve(process.cwd(), 'data.db')
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