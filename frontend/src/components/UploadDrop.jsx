import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ArrowLeft, Loader2, RotateCcw, Upload } from 'lucide-react'
import { analyzeImage, describe } from '../lib/detect'
import { logSession } from '../lib/api'
import FaceCard from './FaceCard'
import ResultSummary from './ResultSummary'

export default function UploadDrop({ onClose, onLogged }) {
  const [url, setUrl] = useState(null)
  const [img, setImg] = useState(null)
  const [faces, setFaces] = useState(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState(null)
  const frameRef = useRef(null)
  const boxLayerRef = useRef(null)

  const reset = () => {
    setFaces(null)
    setError(null)
    if (url) URL.revokeObjectURL(url)
    setUrl(null)
    setImg(null)
  }

  const load = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('That file is not an image. Try a jpg, png or webp.')
      return
    }
    reset()
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    const image = new Image()
    image.onload = () => setImg(image)
    image.src = objectUrl
  }

  const analyze = async () => {
    if (!img) return
    setBusy(true)
    try {
      const result = await analyzeImage(img)
      setFaces(result)
      await logSession({ mode: 'upload', faceCount: result.length, results: result })
      onLogged?.()
    } catch {
      setError('Detection failed. The model loads from a CDN on first run — check your connection.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const el = frameRef.current
    if (!el || !img) return
    const ctx = gsap.context(() => {
      gsap.from(el, { opacity: 0, y: 18, scale: 0.98, duration: 0.8, ease: 'expo.out' })
    }, el)
    return () => ctx.revert()
  }, [img])

  useEffect(() => {
    const layer = boxLayerRef.current
    if (!layer || !faces || !img) return
    layer.innerHTML = ''
    const { naturalWidth: W, naturalHeight: H } = img
    faces.forEach((f) => {
      const el = document.createElement('div')
      el.style.cssText = `position:absolute;left:${(f.box.x / W) * 100}%;top:${(
        f.box.y / H
      ) * 100}%;width:${(f.box.width / W) * 100}%;height:${(f.box.height / H) * 100}%;border:1.5px solid ${
        f.gender === 'male' ? 'var(--accent-cool)' : 'var(--accent-warm)'
      };border-radius:10px;box-shadow:0 0 0 4px color-mix(in srgb, var(--fg) 15%, transparent);`
      const chip = document.createElement('span')
      chip.textContent = `${Math.round(f.confidence * 100)}% ${f.gender}`
      chip.style.cssText = `position:absolute;top:-24px;left:-1px;background:var(--fg);color:var(--bg);font:500 10px 'JetBrains Mono',monospace;letter-spacing:.08em;text-transform:uppercase;padding:3px 8px;border-radius:999px;white-space:nowrap;`
      el.appendChild(chip)
      layer.appendChild(el)
    })
  }, [faces, img])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          load(e.dataTransfer.files?.[0])
        }}
        className={`card card-lift flex min-h-[24rem] flex-col items-center justify-center gap-5 p-10 text-center transition-colors duration-300 ${
          drag ? 'bg-surface ring-1 border-strong' : 'bg-surface/70'
        }`}
      >
        {!url ? (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]">
              <Upload size={20} strokeWidth={1.5} />
            </span>
            <p className="serif text-3xl tracking-tight text-primary">Drop an image here</p>
            <p className="max-w-sm text-sm leading-relaxed text-secondary">
              It never leaves your browser — the file is read locally and only a small
              summary is sent to the backend.
            </p>
            <label className="btn-solid mt-1 cursor-pointer">
              Choose a file
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => load(e.target.files?.[0])}
              />
            </label>
          </>
        ) : (
          <div ref={frameRef} className="relative w-full">
            <img src={url} alt="uploaded" className="mx-auto max-h-[26rem] rounded-xl" />
            <div ref={boxLayerRef} className="pointer-events-none absolute inset-0" />
          </div>
        )}

        {error && <p className="text-sm text-[var(--accent-warm)]">{error}</p>}

        {url && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={analyze} disabled={!img || busy} className="btn-solid">
              {busy && <Loader2 size={15} className="animate-spin" />}
              {busy ? 'Reading…' : 'Read this photo'}
            </button>
            <button onClick={reset} className="btn-line">
              <RotateCcw size={14} /> Clear
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {faces && <ResultSummary faces={faces} sentence={describe(faces)} />}
        {faces?.map((f, i) => (
          <FaceCard key={i} face={f} index={i} />
        ))}
        {!faces && (
          <div className="card p-6 text-sm leading-relaxed text-secondary">
            Once a photo is read, each detected face appears here with a confidence
            bar and its estimate.
          </div>
        )}
        <button onClick={onClose} className="btn-line w-full justify-center">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    </div>
  )
}