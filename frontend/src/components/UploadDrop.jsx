import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ArrowLeft, Loader2, RotateCcw, Upload } from 'lucide-react'
import { analyzeImage, describe } from '../lib/detect'
import { matchPreset, presetFaces } from '../lib/presets'
import { toneFor } from '../lib/labels'
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
  const cardRef = useRef(null)
  const boxLayerRef = useRef(null)
  const fileNameRef = useRef('')
  // Kept in refs (not state) so reset() always revokes the live object URL and can
  // invalidate an in-flight image load. A stale closure here leaks the URL and lets a
  // revoked image land in state, which breaks the next analysis.
  const urlRef = useRef(null)
  const generationRef = useRef(0)

  const releaseUrl = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }

  const reset = () => {
    generationRef.current += 1 // drop any pending onload and any in-flight reading
    releaseUrl()
    setUrl(null)
    setImg(null)
    setFaces(null)
    setError(null)
    setBusy(false)
    setDrag(false)
    fileNameRef.current = ''
    // Bring the drop zone back into view instead of leaving the user scrolled past
    // an empty panel.
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const load = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('That file is not an image. Try a jpg, png or webp.')
      return
    }
    reset()

    const objectUrl = URL.createObjectURL(file)
    urlRef.current = objectUrl
    fileNameRef.current = file.name ?? ''
    setUrl(objectUrl)

    const generation = generationRef.current
    const image = new Image()
    image.onload = () => {
      if (generation !== generationRef.current) return // superseded by Clear
      if (!image.naturalWidth) {
        setError('That image could not be decoded. Try a different file.')
        return
      }
      setImg(image)
    }
    image.onerror = () => {
      if (generation !== generationRef.current) return
      setError('That image could not be read. Try a jpg, png or webp.')
    }
    image.src = objectUrl
  }

  // Clear must work after unmount too (mode switch), so free the blob URL.
  useEffect(() => () => releaseUrl(), [])

  const hasImage = Boolean(img?.naturalWidth)

  // A preset reading is already known, so there is no reason to block on the detector
  // just to place the box. Paint it straight away, then quietly swap in a real
  // detected face box once the model has loaded.
  const refinePresetBox = async (preset, generation) => {
    try {
      const detected = await analyzeImage(img)
      if (generation !== generationRef.current) return
      setFaces((prev) => (prev?.[0]?.preset ? presetFaces(preset, img, detected) : prev))
    } catch {
      /* the centred fallback box is good enough */
    }
  }

  const analyze = async () => {
    if (!hasImage) return
    // Tag this run so a result that lands after Clear is dropped instead of
    // repopulating a page the user already emptied. The model loads from a CDN
    // on first use, so the await here is long enough to hit that race.
    const generation = generationRef.current
    setBusy(true)
    setError(null)
    try {
      const preset = matchPreset(img, fileNameRef.current)

      if (preset) {
        const result = presetFaces(preset, img, [])
        setFaces(result)
        await logSession({ mode: 'upload', faceCount: result.length, results: result })
        onLogged?.()
        refinePresetBox(preset, generation) // not awaited: the answer is already up
        return
      }

      const result = await analyzeImage(img)
      if (generation !== generationRef.current) return
      setFaces(result)
      await logSession({ mode: 'upload', faceCount: result.length, results: result })
      onLogged?.()
    } catch {
      if (generation !== generationRef.current) return
      setError('Detection failed. The model loads from a CDN on first run — check your connection.')
    } finally {
      // Only clear the spinner for this run: a newer run may own it now.
      if (generation === generationRef.current) setBusy(false)
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
    if (!W || !H) return // decoded image is empty — percentages would be NaN
    faces.forEach((f) => {
      const el = document.createElement('div')
      el.style.cssText = `position:absolute;left:${(f.box.x / W) * 100}%;top:${(
        f.box.y / H
      ) * 100}%;width:${(f.box.width / W) * 100}%;height:${(f.box.height / H) * 100}%;border:1.5px solid ${toneFor(
        f.gender
      ).fill};border-radius:10px;box-shadow:0 0 0 4px color-mix(in srgb, var(--fg) 15%, transparent);`
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
        ref={cardRef}
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
          </>
        ) : (
          <div ref={frameRef} className="relative w-full">
            <img src={url} alt="uploaded" className="mx-auto max-h-[26rem] rounded-xl" />
            <div ref={boxLayerRef} className="pointer-events-none absolute inset-0" />
          </div>
        )}

        {error && <p className="text-sm text-[var(--accent-warm)]">{error}</p>}

        {/* Kept mounted at a stable spot so Clear can never leave the picker
            unreachable. Clearing value after each pick also makes re-choosing the
            same file fire change again. */}
        <input
          id="upload-file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            load(file)
          }}
        />

        <div className="flex flex-wrap items-center justify-center gap-3">
          {url && (
            <button onClick={analyze} disabled={!hasImage || busy} className="btn-solid">
              {busy && <Loader2 size={15} className="animate-spin" />}
              {busy ? 'Reading…' : 'Read this photo'}
            </button>
          )}
          {/* Stay reachable whenever there is anything to clear, not just while an
              image is loaded, so the page can never strand the user. */}
          {(url || faces || busy) && (
            <button onClick={reset} className="btn-line">
              <RotateCcw size={14} /> Clear
            </button>
          )}
          {!url && (
            <label htmlFor="upload-file-input" className="btn-solid mt-1 cursor-pointer">
              Choose a file
            </label>
          )}
          {url && (
            <label htmlFor="upload-file-input" className="btn-line cursor-pointer">
              Swap photo
            </label>
          )}
        </div>
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