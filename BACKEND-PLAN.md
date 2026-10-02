# Backend Plan — Node + Express + SQLite (stats only)

## Purpose
The ML runs in the browser (TF.js). The backend is deliberately tiny: it stores **detection summaries only — never images, never video frames, never face crops.**

## Stack
- Node 18+, Express 4
- `better-sqlite3` (sync, zero-config, file-based)
- `cors`
- ESM (`"type": "module"`)
- No ORM, no Docker

## Structure
```
server/
  index.js        # app bootstrap, port 5174
  db.js           # better-sqlite3 connection + schema init
  routes/sessions.js
```

## Schema (db.js)
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  mode        TEXT NOT NULL,              -- 'upload' | 'camera'
  face_count  INTEGER NOT NULL DEFAULT 0,
  primary_gender TEXT,                   -- dominant gender of the session
  primary_confidence REAL,               -- 0..1
  average_age  REAL,
  results_json TEXT NOT NULL,            -- [{gender, confidence, age}]
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
```

## Endpoints (routes/sessions.js)

### `POST /api/sessions`
Body:
```json
{ "mode": "camera", "faceCount": 1,
  "results": [{ "gender": "female", "confidence": 0.7, "age": 24 }] }
```
Logic:
- Validate `mode` ∈ {upload, camera}, `faceCount` is an int ≥ 0, `results` is an array (cap at 50 entries)
- Derive `primary_gender` / `primary_confidence` = highest-confidence face; `average_age` = mean of ages when present
- Strip any unexpected keys, JSON-stringify `results`
- Insert, return `{ id, created_at }`

### `GET /api/sessions?limit=20`
Return rows newest-first, parsed `results_json`, joined with:
```json
{ "totalSessions": n, "totalFacesDetected": n, "averageConfidence": 0.0-1.0 }
```
as a `stats` object for the StatsStrip.

### `GET /api/stats`
Aggregate only — total sessions, total faces, average confidence, gender split %, last 7 daily counts.

### `DELETE /api/sessions`
Wipes the table (a "clear history" button). Guarded behind the same CORS origin, no auth (local tool).

## Middleware & safety
- `cors()` limited to `http://localhost:5173`
- `express.json({ limit: '64kb' })` — rejects oversized bodies
- Global error handler returning `{ error: string }`, never a stack trace
- Basic per-field type coercion/trimming; clamp `confidence` to 0..1
- Add `express-rate-limit` only if exposed beyond localhost

## Out of scope (deliberately)
- No image upload endpoint (the browser never sends pixels)
- No auth, no accounts, no cloud storage
- No Python/torch service

## Run order (target ~3 min)
1. `mkdir server && npm init -y`, install `express cors better-sqlite3`
2. `db.js` schema
3. `routes/sessions.js` (POST, GET, stats, DELETE)
4. `index.js` with CORS + error handler
5. Curl smoke test: `curl -X POST localhost:5174/api/sessions -d '{...}'`
