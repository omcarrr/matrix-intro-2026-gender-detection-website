import express from 'express'
import cors from 'cors'
import sessions from './routes/sessions.js'

const app = express()

// Hosts assign the port via PORT, so the dev default can only be a fallback.
// `app.listen(<number>)` binds every interface, which is what containers need.
const PORT = Number(process.env.PORT) || 5174

// Accept a comma separated allow-list so a deployed frontend origin can be added
// without code changes. '*' disables the check entirely.
const ORIGINS = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(cors({ origin: ORIGINS.includes('*') ? true : ORIGINS }))
app.use(express.json({ limit: '64kb' }))

app.use('/api/sessions', sessions)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use((err, _req, res, _next) => {
  console.error('[server error]', err)
  res.status(500).json({ error: 'internal server error' })
})

app.listen(PORT, () => {
  console.log(`🟢 backend listening on port ${PORT} (cors: ${ORIGINS.join(', ')})`)
})