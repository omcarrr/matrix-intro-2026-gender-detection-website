/** Backend base URL, or null when none is configured.
 *  Set VITE_API_URL for a deployed build. Left unset in production the frontend
 *  runs entirely on its own — detection is client side — so we skip the calls
 *  instead of firing requests that can only fail. */
const BASE = import.meta.env.VITE_API_URL?.trim() || null

/** Fire-and-forget: never block the UI on stats logging. */
export async function logSession({ mode, faceCount, results }) {
  if (!BASE) return
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
  if (!BASE) return null
  try {
    const res = await fetch(`${BASE}/api/stats`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
