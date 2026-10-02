const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5174'

/** Fire-and-forget: never block the UI on stats logging. */
export async function logSession({ mode, faceCount, results }) {
  try {
    await fetch(`${BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        faceCount,
        results: results.map(({ gender, confidence, age }) => ({
          gender,
          confidence,
          age,
        })),
      }),
    })
  } catch {
    /* backend may be offline — ignore */
  }
}

export async function fetchStats() {
  try {
    const res = await fetch(`${BASE}/api/stats`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
