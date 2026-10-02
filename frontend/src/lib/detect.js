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
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
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

/** Map face-api results into a small, serialisable shape. */
function normalise(results) {
  return results.slice(0, 50).map((r) => ({
    gender: r.gender === 'male' ? 'male' : 'female',
    confidence: Math.max(0, Math.min(1, r.genderProbability ?? 0)),
    age: Math.round(r.age ?? 0),
    box: {
      x: r.detection.box.x,
      y: r.detection.box.y,
      width: r.detection.box.width,
      height: r.detection.box.height,
    },
  }))
}

/** Human sentence for the summary bar. */
export function describe(faces) {
  if (!faces.length) return 'No person detected'
  if (faces.length === 1) {
    const f = faces[0]
    return `1 person · ${Math.round(f.confidence * 100)}% likely a ${f.gender}`
  }
  const top = [...faces].sort((a, b) => b.confidence - a.confidence)[0]
  return `${faces.length} people detected · strongest read ${Math.round(
    top.confidence * 100,
  )}% likely a ${top.gender}`
}

async function detectCanvas(canvas) {
  await initModels()
  const opts = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.5,
    maxResults: 20,
  })
  const results = await faceapi
    .detectAllFaces(canvas, opts)
    .withFaceLandmarks()
    .withAgeAndGender()
  return normalise(results)
}

const MAX_EDGE = 640

function toCanvas(source, w, h) {
  const scale = Math.min(1, MAX_EDGE / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return { canvas, scale }
}

/** Analyse an <img> / File / blob URL. */
export async function analyzeImage(img) {
  const { canvas } = toCanvas(img, img.naturalWidth, img.naturalHeight)
  return detectCanvas(canvas)
}

/** Analyse a single frame from a <video>. Throttled by the caller. */
export async function analyzeVideoFrame(video) {
  if (!video.videoWidth) return []
  const { canvas } = toCanvas(video, video.videoWidth, video.videoHeight)
  return detectCanvas(canvas)
}
