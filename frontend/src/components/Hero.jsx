import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const LINE_1 = ['Mir', 'ror']
const LINE_2 = ['re', 'ads', 'faces']

export default function Hero() {
  const root = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })

      tl.from('[data-kicker]', { opacity: 0, y: -12, duration: 0.6 })
        .from(
          '[data-word]',
          {
            opacity: 0,
            yPercent: 110,
            rotate: 2,
            duration: 1.1,
            stagger: 0.09,
          },
          '-=0.35',
        )
        .from('[data-rule]', { scaleX: 0, duration: 1, transformOrigin: '0 50%' }, '-=0.7')
        .from('[data-sub]', { opacity: 0, y: 20, duration: 0.9 }, '-=0.6')
        .from('[data-scroll]', { opacity: 0, y: 10, duration: 0.6 }, '-=0.4')

      gsap.to('[data-wash-a]', {
        x: 70,
        y: -50,
        duration: 14,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
      gsap.to('[data-wash-b]', {
        x: -60,
        y: 40,
        duration: 17,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })

      gsap.to('[data-mark]', {
        xPercent: 8,
        duration: 3.4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <header ref={root} className="relative overflow-hidden">
      <div
        data-wash-a
        className="pointer-events-none absolute -left-40 -top-32 h-[30rem] w-[30rem] rounded-full bg-[var(--accent-warm)]/10 blur-[110px]"
      />
      <div
        data-wash-b
        className="pointer-events-none absolute -right-32 top-24 h-[26rem] w-[26rem] rounded-full bg-[var(--accent-cool)]/10 blur-[110px]"
      />

      <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-20 sm:pt-36">
        <p data-kicker className="mono-label text-subtle">
          on-device vision · nothing uploaded
        </p>

        <h1 className="mt-10 serif text-[clamp(3.5rem,13vw,9rem)] leading-[0.88] tracking-[-0.03em] text-primary">
          {[LINE_1, LINE_2].map((words, li) => (
            <span key={li} className="block overflow-hidden pb-[0.06em]">
              {words.map((w, wi) => (
                <span
                  key={wi}
                  data-word
                  className={`inline-block ${li === 1 ? 'italic text-secondary' : ''}`}
                >
                  {w}
                  {wi < words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </span>
          ))}
        </h1>

        <div className="mt-12 flex items-center gap-4">
          <span data-rule className="h-px flex-1 border-default" />
          <span data-mark className="h-1.5 w-1.5 rounded-full bg-[var(--accent-warm)]" />
          <span data-rule className="h-px flex-1 border-default" />
        </div>

        <p
          data-sub
          className="mt-10 max-w-xl text-lg leading-relaxed text-muted"
        >
          Upload a photograph or open your camera. Every face is detected and scored
          in real time — inside your own browser, frame by frame.
        </p>

        <p data-scroll className="mono-label mt-16 text-subtle">
          select a mode
        </p>
      </div>
    </header>
  )
}