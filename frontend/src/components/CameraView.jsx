import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ArrowLeft, Loader2, Square } from 'lucide-react'
import { useCamera } from '../hooks/useCamera'
import { analyzeVideoFrame, describe, getStatus, initModels } from '../lib/detect'
import { logSession } from '../lib/api'
import ResultSummary from './ResultSummary'

const INTERVAL_MS = 150

export default function CameraView({ onClose }) {
  const { videoRef, start, stop, error, ready } = useCamera()
  const canvasRef = useRef(null)
  const timerRef = useRef(0)
  const busyRef = useRef(false)
  const [faces, setFaces] = useState([])
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    initModels().catch(() => {})
    start().finally(() => setStarting(false))
    return () => {
      clearTimeout(timerRef.current)
      stop()
    }
  }, [start, stop])

  const loop = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.videoWidth && !busyRef.current) {
      busyRef.current = true
      try {
        const result = await analyzeVideoFrame(video)
        setFaces(result)

        const w = video.videoWidth
        const h = video.videoHeight
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, w, h)
        ctx.lineWidth = Math.max(1.5, w / 420)
        ctx.font = `500 ${Math.max(12, w / 68)}px "JetBrains Mono", monospace`

        result.forEach((f) => {
          const { x, y, width, height } = f.box
          const color = f.gender === 'male' ? '#4d7c5a' : '#c2410c'

          // The video is mirrored with CSS (-scale-x-100) and canvas is also mirrored.
          // Detection runs on raw frames (non-mirrored), so we must flip X for drawing.
          const mx = w - x - width

          ctx.strokeStyle = color
          ctx.strokeRect(mx, y, width, height)

          // corner ticks for a precise, instrument-like read (also mirrored)
          const t = Math.min(width, height) * 0.22
          ctx.lineWidth = Math.max(3, w / 260)
          ;[
            [mx, y, t, 0, 0, t],
            [mx, y, 0, t, t, 0],
            [mx + width, y, -t, 0, 0, t],
            [mx + width, y, 0, t, -t, 0],
            [mx, y + height, t, 0, 0, -t],
            [mx, y + height, 0, -t, t, 0],
            [mx + width, y + height, -t, 0, 0, -t],
            [mx + width, y + height, 0, -t, -t, 0],
          ].forEach(([px, py, dx, dy, dx2, dy2]) => {
            ctx.beginPath()
            ctx.moveTo(px + dx, py + dy)
            ctx.lineTo(px + dx2, py + dy2)
            ctx.stroke()
          })

          const label = `${Math.round(f.confidence * 100)}% ${f.gender}`
          const tw = ctx.measureText(label).width + 20
          ctx.lineWidth = 1
          ctx.fillStyle = '#17161a'
          ctx.fillRect(mx, Math.max(0, y - 26), tw, 22)
          ctx.fillStyle = '#faf8f5'
          ctx.fillText(label, mx + 10, Math.max(15, y - 10))
        })
      } catch {
        /* keep looping */
      } finally {
        busyRef.current = false
      }
    }
    timerRef.current = setTimeout(loop, INTERVAL_MS)
  }, [videoRef])

  useEffect(() => {
    if (ready) loop()
    return () => clearTimeout(timerRef.current)
  }, [ready, loop])

  const tickRef = useRef(0)
  useEffect(() => {
    if (!faces.length) return
    tickRef.current += 1
    if (tickRef.current % 60 === 1) {
      logSession({ mode: 'camera', faceCount: faces.length, results: faces })
    }
  }, [faces])

  useEffect(() => {
    if (!ready) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-scanner]',
        { top: '-12%' },
        { top: '100%', duration: 2.6, repeat: -1, ease: 'none' },
      )
    })
    return () => ctx.revert()
  }, [ready])

  const loading = starting || getStatus() === 'loading'

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="card card-lift bg-white p-3">
        <div className="relative overflow-hidden rounded-xl bg-ink">
          <video ref={videoRef} playsInline muted className="block w-full -scale-x-100" />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
          />
          <div
            data-scanner
            className="pointer-events-none absolute inset-x-0 h-28 bg-gradient-to-b from-transparent via-clay/10 to-transparent"
          />

          {(loading || (error && !ready)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/80 text-center">
              {loading && !error ? (
                <>
                  <Loader2 size={24} className="animate-spin text-bone" />
                  <p className="mono-label text-bone/50">warming the model</p>
                </>
              ) : (
                <p className="max-w-xs px-6 text-sm text-bone/70">{error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-3">
          <span className="mono-label text-ink/40">
            {faces.length} face{faces.length === 1 ? '' : 's'} tracked
          </span>
          <button onClick={onClose} className="btn-line">
            <Square size={11} /> Stop
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <ResultSummary faces={faces} sentence={describe(faces)} />
        <div className="card p-6 text-sm leading-relaxed text-ink/50">
          The read refreshes roughly every <span className="text-ink">150&nbsp;ms</span> and
          runs entirely on your device. Nothing is recorded or sent.
        </div>
        <button onClick={onClose} className="btn-line w-full justify-center">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    </div>
  )
}