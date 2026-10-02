import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ dark, onToggle }) {
  const btnRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(btnRef.current, {
        rotate: dark ? 180 : 0,
        duration: 0.5,
        ease: 'power3.out',
      })
    }, btnRef)
    return () => ctx.revert()
  }, [dark])

  return (
    <button
      ref={btnRef}
      onClick={() => onToggle(!dark)}
      className="card p-2 flex items-center justify-center gap-2 rounded-full border border-ink/10 dark:border-bone/10 bg-white/80 dark:bg-ink/80 backdrop-blur-sm hover:bg-white dark:hover:bg-ink transition-colors"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun size={16} className="text-clay" />
      <Moon size={16} className="text-moss" />
    </button>
  )
}