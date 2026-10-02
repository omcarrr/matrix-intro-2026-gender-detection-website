import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Camera, Upload } from 'lucide-react'

const MODES = [
  {
    id: 'upload',
    icon: Upload,
    index: '01',
    title: 'Upload a photograph',
    copy: 'Drop in any image. Each face is boxed, scored, and summarised.',
    accent: 'warm',
  },
  {
    id: 'camera',
    icon: Camera,
    index: '02',
    title: 'Open the live camera',
    copy: 'A continuous read that refreshes roughly six times a second.',
    accent: 'cool',
  },
]

export default function ModePicker({ onSelect }) {
  const root = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-card]', {
        opacity: 0,
        y: 44,
        duration: 0.9,
        stagger: 0.12,
        ease: 'expo.out',
      })
    }, root)
    return () => ctx.revert()
  }, [])

  const enter = (e) =>
    gsap.to(e.currentTarget, { y: -6, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
  const leave = (e) =>
    gsap.to(e.currentTarget, { y: 0, duration: 0.6, ease: 'power3.out', overwrite: 'auto' })

  const accentVar = (a) => (a === 'warm' ? 'var(--accent-warm)' : 'var(--accent-cool)')
  const accentBg = (a) => (a === 'warm' ? 'bg-[var(--accent-warm)]/10' : 'bg-[var(--accent-cool)]/10')
  const accentText = (a) => (a === 'warm' ? 'text-[var(--accent-warm)]' : 'text-[var(--accent-cool)]')

  return (
    <section ref={root} className="mx-auto max-w-5xl px-6 pb-24">
      <div className="grid gap-px overflow-hidden rounded-2xl border-default bg-[color-mix(in_srgb,_var(--border)_10%,_transparent)] sm:grid-cols-2">
        {MODES.map(({ id, icon: Icon, index, title, copy, accent }) => (
          <button
            key={id}
            data-card
            onMouseEnter={enter}
            onMouseLeave={leave}
            onClick={() => onSelect(id)}
            className="group card-lift relative bg-base p-10 text-left transition-colors duration-500 hover:bg-surface"
          >
            <div className="flex items-start justify-between">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-full ${accentBg(
                  accent,
                )} ${accentText(accent)} transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-105`}
              >
                <Icon size={20} strokeWidth={1.5} />
              </span>
              <span className="mono-label text-subtle">{index}</span>
            </div>

            <h2 className="serif mt-10 text-3xl tracking-tight text-primary">{title}</h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-secondary">{copy}</p>

            <span
              className={`mono-label mt-10 inline-flex items-center gap-2 ${accentText(accent)}`}
            >
              begin
              <span className="inline-block transition-transform duration-500 group-hover:translate-x-1.5">
                →
              </span>
            </span>

            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 border-default transition-transform duration-700 group-hover:scale-x-100" />
          </button>
        ))}
      </div>
    </section>
  )
}