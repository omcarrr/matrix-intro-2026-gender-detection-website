import express from 'express'
import cors from 'cors'
import sessions from './routes/sessions.js'

const app = express()
const PORT = 5174
const ORIGIN = 'http://localhost:5173'

app.use(cors({ origin: ORIGIN }))
app.use(express.json({ limit: '64kb' }))

app.use('/api/sessions', sessions)

app.use((err, _req, res, _next) => {
  console.error('[server error]', err)
  res.status(500).json({ error: 'internal server error' })
})

app.listen(PORT, () => {
  console.log(`🟢 backend listening on http://localhost:${PORT}`)
})