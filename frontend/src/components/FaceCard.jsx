import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const TONE = {
  female: { fill: '#c2410c', text: 'text-clay' },
  male: { fill: '#4d7c5a', text: 'text-moss' },
}

export default function FaceCard({ face, index }) {
  const root = useRef(null)
  const bar = useRef(null)
  const num = useRef(null)
  const pct = Math.round(face.confidence * 100)
  const tone = TONE[face.gender]

  useEffect(() => {
    const ctx = gsap.context(() => {
      const state = { v: 0 }
      gsap.from(root.current, {
        opacity: 0,
        y: 18,
        duration: 0.7,
        delay: index * 0.07,
        ease: 'expo.out',
      })
      gsap.fromTo(
        bar.current,
        { scaleX: 0 },
        { scaleX: pct / 100, duration: 1, delay: 0.12 + index * 0.07, ease: 'expo.out' },
      )
      gsap.to(state, {
        v: pct,
        duration: 1,
        delay: 0.12 + index * 0.07,
        ease: 'expo.out',
        onUpdate: () => (num.current.textContent = `${Math.round(state.v)}%`),
      })
    }, root)
    return () => ctx.revert()
  }, [pct, index])

  return (
    <div ref={root} className="card card-lift p-6">
      <div className="flex items-baseline justify-between">
        <span className="mono-label text-ink/30">face {String(index + 1).padStart(2, '0')}</span>
        <span className="mono-label text-ink/30">~{face.age} yrs</span>
      </div>

      <p className="serif mt-5 text-2xl tracking-tight">
        <span className={tone.text}>{pct}%</span>{' '}
        <span className="text-ink/50">likely a {face.gender}</span>
      </p>

      <div className="bar-track mt-6">
        <div
          ref={bar}
          className="h-full w-full origin-left rounded-full"
          style={{ background: tone.fill }}
        />
      </div>

      <p ref={num} className="mono-label mt-4 text-ink/25">
        0%
      </p>
    </div>
  )
}
