import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function ResultSummary({ faces, sentence }) {
  const ref = useRef(null)
  const isPreset = faces?.some((f) => f.preset)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' },
      )
      gsap.fromTo(
        '[data-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 1, ease: 'expo.out', delay: 0.1 },
      )
    }, ref)
    return () => ctx.revert()
  }, [sentence])

  return (
    <div ref={ref} className="card card-lift overflow-hidden bg-surface px-8 py-7">
      <span className="mono-label text-subtle">reading</span>
      <p className="serif mt-4 text-3xl leading-tight tracking-tight text-primary sm:text-4xl">
        {sentence}
      </p>
      <div className="hairline mt-6" data-rule />
      <p className="mt-4 text-xs text-muted">
        {isPreset
          ? 'Fixed demo value for a known photo. Not a model estimate — do not read it as one.'
          : faces.length
            ? 'Estimated locally in your browser. Treat it as an approximation, never a fact.'
            : 'Point the camera at a face, or upload an image to begin.'}
      </p>
    </div>
  )
}