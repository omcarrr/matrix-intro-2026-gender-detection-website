import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Fade/slide a container's direct children in on mount. */
export function useReveal(deps = []) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced()) {
      gsap.set(el.children, { opacity: 1, y: 0, x: 0 })
      return
    }
    const ctx = gsap.context(() => {
      gsap.from(el.children, {
        opacity: 0,
        y: 28,
        duration: 0.8,
        stagger: 0.08,
        ease: 'expo.out',
      })
    }, el)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/** Count a number up when it scrolls into view. */
export function useCountUp(value, { decimals = 0 } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const state = { v: 0 }
    const write = () => (el.textContent = state.v.toFixed(decimals))
    if (reduced()) {
      state.v = value
      write()
      return
    }
    const tw = gsap.to(state, {
      v: value,
      duration: 1.2,
      ease: 'expo.out',
      onUpdate: write,
      scrollTrigger: { trigger: el, start: 'top 90%' },
    })
    return () => {
      tw.scrollTrigger?.kill()
      tw.kill()
    }
  }, [value, decimals])
  return ref
}
