import express from 'express'
import db from '../db.js'

const router = express.Router()

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function derivePrimary(results) {
  if (!results?.length) return { gender: null, confidence: null }
  const top = results.reduce((a, b) => (b.confidence > a.confidence ? b : a))
  return { gender: top.gender, confidence: top.confidence }
}

function averageAge(results) {
  const ages = results?.filter((r) => typeof r.age === 'number' && r.age > 0)?.map((r) => r.age) ?? []
  if (!ages.length) return null
  return ages.reduce((a, b) => a + b, 0) / ages.length
}

// The hardcoded demo presets emit labels beyond male/female, so keep an allow-list
// instead of collapsing everything unknown into 'female'.
const ALLOWED_GENDERS = new Set([
  'male',
  'female',
  'transgender',
  'gay',
  'animal',
  'matrix',
])

function cleanGender(value) {
  const g = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return ALLOWED_GENDERS.has(g) ? g : null
}

/** POST /api/sessions */
router.post('/', (req, res) => {
  try {
    const { mode, faceCount, results } = req.body ?? {}

    if (!['upload', 'camera'].includes(mode)) {
      return res.status(400).json({ error: 'mode must be upload or camera' })
    }
    const fc = Number(faceCount) ?? 0
    if (!Number.isInteger(fc) || fc < 0) {
      return res.status(400).json({ error: 'faceCount must be a non-negative integer' })
    }

    const safeResults = Array.isArray(results)
      ? results
          .slice(0, 50)
          .map((r) => ({
            gender: cleanGender(r?.gender),
            confidence: clamp(Number(r?.confidence) ?? 0, 0, 1),
            age: Number.isInteger(r?.age) ? r.age : null,
          }))
          .filter((r) => r.gender)
      : []

    const { gender: primary_gender, confidence: primary_confidence } = derivePrimary(safeResults)
    const avgAge = averageAge(safeResults)

    const stmt = db.prepare(`
      INSERT INTO sessions (mode, face_count, primary_gender, primary_confidence, average_age, results_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(mode, fc, primary_gender, primary_confidence, avgAge, JSON.stringify(safeResults))

    res.json({ id: info.lastInsertRowid, created_at: new Date().toISOString() })
  } catch (err) {
    console.error('[POST /api/sessions]', err)
    res.status(500).json({ error: 'server error' })
  }
})

/** GET /api/sessions?limit=20 */
router.get('/', (req, res) => {
  try {
    const rawLimit = req.query.limit
    const limit = Number.isInteger(Number(rawLimit)) ? Number(rawLimit) : 20
    const safeLimit = Math.min(100, Math.max(1, limit))

    const rows = db
      .prepare(
        `SELECT id, mode, face_count, primary_gender, primary_confidence, average_age, results_json, created_at
         FROM sessions ORDER BY created_at DESC LIMIT ?`
      )
      .all(safeLimit)

    const sessions = rows.map((r) => ({
      ...r,
      results: JSON.parse(r.results_json),
    }))

    const totals = db.prepare(`SELECT
      COUNT(*) as totalSessions,
      COALESCE(SUM(face_count), 0) as totalFacesDetected,
      AVG(primary_confidence) as averageConfidence
    FROM sessions`).get()

    res.json({
      sessions,
      stats: {
        totalSessions: totals.totalSessions ?? 0,
        totalFacesDetected: totals.totalFacesDetected ?? 0,
        averageConfidence: totals.averageConfidence ?? 0,
      },
    })
  } catch (err) {
    console.error('[GET /api/sessions]', err)
    res.status(500).json({ error: 'server error' })
  }
})

/** GET /api/sessions/stats — just the aggregates */
router.get('/stats', (req, res) => {
  try {
    const totals = db.prepare(`
      SELECT
        COUNT(*) as totalSessions,
        COALESCE(SUM(face_count), 0) as totalFacesDetected,
        AVG(primary_confidence) as averageConfidence
      FROM sessions
    `).get()

    const genderSplit = db.prepare(`
      SELECT
        json_extract(value, '$.gender') as gender,
        COUNT(*) as count
      FROM sessions, json_each(results_json)
      GROUP BY gender
    `).all()

    const last7 = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as sessions, COALESCE(SUM(face_count), 0) as faces
      FROM sessions
      WHERE created_at >= date('now', '-6 days')
      GROUP BY day
      ORDER BY day
    `).all()

    res.json({
      totalSessions: totals.totalSessions ?? 0,
      totalFacesDetected: totals.totalFacesDetected ?? 0,
      averageConfidence: totals.averageConfidence ?? 0,
      genderSplit,
      last7Days: last7,
    })
  } catch (err) {
    console.error('[GET /api/sessions/stats]', err)
    res.status(500).json({ error: 'server error' })
  }
})

/** DELETE /api/sessions — clear all */
router.delete('/', (req, res) => {
  try {
    db.prepare('DELETE FROM sessions').run()
    res.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/sessions]', err)
    res.status(500).json({ error: 'server error' })
  }
})

export default router