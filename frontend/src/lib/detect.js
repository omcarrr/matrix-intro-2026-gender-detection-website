import * as tf from '@tensorflow/tfjs'
import * as faceapi from '@vladmandic/face-api'

const MODEL_URL =
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model'

let loadPromise = null
let status = 'idle' // idle | loading | ready | error

export const getStatus = () => status
export const onStatusChange = (fn) => {
  const id = setInterval(() => fn(status), 200)
  return () => clearInterval(id)
}

export async function initModels() {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    status = 'loading'
    try {
      await tf.ready()
      try {
        await tf.setBackend('webgl')
      } catch {
        await tf.setBackend('cpu')
      }
      // faceLandmark68Net is deliberately not loaded. Nothing downstream reads
      // landmark positions, and pulling it in costs an extra ~350 KB download plus a
      // full forward pass for every face in every frame.
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      ])
      status = 'ready'
    } catch (err) {
      console.error('[detect] model load failed', err)
      status = 'error'
      loadPromise = null
      throw err
    }
  })()

  return loadPromise
}

/** Map face-api results into a small, serialisable shape.
 *  `scale` is the factor the frame was shrunk by before detection, so boxes can be
 *  mapped back into the original image/video pixel space the overlay draws in. */
function normalise(results, scale = 1) {
  return results.slice(0, 50).map((r) => ({
    gender: r.gender === 'male' ? 'male' : 'female',
    confidence: Math.max(0, Math.min(1, r.genderProbability ?? 0)),
    age: Math.round(r.age ?? 0),
    box: {
      x: r.detection.box.x / scale,
      y: r.detection.box.y / scale,
      width: r.detection.box.width / scale,
      height: r.detection.box.height / scale,
    },
  }))
}

/** Human sentence for the summary bar. */
export function describe(faces) {
  if (!faces.length) return 'No person detected'
  const alts = (f) =>
    f.alternates?.length
      ? ` (${f.alternates.map((a) => `${Math.round(a.confidence * 100)}% ${a.gender}`).join(', ')})`
      : ''
  if (faces.length === 1) {
    const f = faces[0]
    return `1 person · ${Math.round(f.confidence * 100)}% likely a ${f.gender}${alts(f)}`
  }
  const top = [...faces].sort((a, b) => b.confidence - a.confidence)[0]
  return `${faces.length} people detected · strongest read ${Math.round(
    top.confidence * 100,
  )}% likely a ${top.gender}${alts(top)}`
}

async function detectCanvas(canvas, scale = 1) {
  await initModels()
  const opts = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
    maxResults: 20,
  })
  // No .withFaceLandmarks() here: age/gender runs off the detection box directly,
  // so asking for landmarks would only add work we throw away.
  const results = await faceapi
    .detectAllFaces(canvas, opts)
    .withAgeAndGender()
  return normalise(results, scale)
}

const MAX_EDGE = 640

function toCanvas(source, w, h) {
  if (!w || !h) return null
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return { canvas, scale }
}

/** Analyse an <img> / File / blob URL. Boxes come back in natural image pixels. */
export async function analyzeImage(img) {
  const made = toCanvas(img, img.naturalWidth, img.naturalHeight)
  if (!made) throw new Error('image has no pixels')
  return detectCanvas(made.canvas, made.scale)
}

/** Analyse a single frame from a <video>. Throttled by the caller.
 *  Boxes come back in `videoWidth`/`videoHeight` pixels. */
export async function analyzeVideoFrame(video) {
  if (!video.videoWidth || !video.videoHeight) return []
  const made = toCanvas(video, video.videoWidth, video.videoHeight)
  if (!made) return []
  return detectCanvas(made.canvas, made.scale)
}
