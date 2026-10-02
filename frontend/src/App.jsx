import { useEffect, useState, useCallback } from 'react'
import Hero from './components/Hero'
import ModePicker from './components/ModePicker'
import UploadDrop from './components/UploadDrop'
import CameraView from './components/CameraView'
import StatsStrip from './components/StatsStrip'
import Footer from './components/Footer'
import ThemeToggle from './components/ThemeToggle'
import { fetchStats } from './lib/api'
import { initModels, getStatus, onStatusChange } from './lib/detect'
import { useDarkMode } from './hooks/useDarkMode'
import clubLogo from './assets/matrix-logo.png'

export default function App() {
  const [mode, setMode] = useState(null)
  const [stats, setStats] = useState(null)
  const [modelStatus, setModelStatus] = useState(getStatus())
  const [dark, setDark] = useDarkMode()

  const refreshStats = useCallback(() => {
    fetchStats().then(setStats)
  }, [])

  useEffect(() => onStatusChange(setModelStatus), [])
  useEffect(() => {
    fetchStats().then(setStats)
  }, [mode])

  const open = (m) => {
    setMode(m)
    requestAnimationFrame(() => window.scrollTo({ top: 240, behavior: 'smooth' }))
  }

  // Leaving a mode must land the user back on the landing content. Without this the
  // scroll position from `open` sticks around and the mode picker can sit off-screen,
  // which reads as a broken page.
  const close = () => {
    setMode(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`grain min-h-screen transition-colors duration-500 ${dark ? 'dark' : ''}`}>
      {/* Spans the full width now, so it must not swallow clicks meant for the
          hero underneath — only the logo block and the toggle take pointer events. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between gap-4 px-6 pt-6 sm:px-10">
        <div className="pointer-events-auto flex items-center gap-3">
          <img
            src={clubLogo}
            alt="MATRIX club"
            width={547}
            height={320}
            className="club-logo h-9 w-auto shrink-0 select-none sm:h-10"
          />
          <span className="mono-label leading-[1.6] text-subtle">
            represented by
            <span className="block text-primary">matrix club</span>
          </span>
        </div>
        <div className="pointer-events-auto">
          <ThemeToggle dark={dark} onToggle={setDark} />
        </div>
      </header>

      <Hero />

      <main className="mx-auto max-w-6xl px-6 pb-8 pt-16">
        {mode === null && (
          <>
            {modelStatus === 'idle' && (
              <div className="mx-auto mb-12 max-w-xl">
                <button
                  onClick={() => initModels().catch(() => {})}
                  className="card flex w-full items-center justify-center gap-3 px-6 py-5 text-sm text-ink/60 transition-colors hover:bg-white hover:text-ink dark:hover:bg-ink/50"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-clay" />
                  Warm up the detection model · ~6&nbsp;MB, cached after the first run
                </button>
              </div>
            )}
            {modelStatus === 'loading' && (
              <p className="mono-label mb-12 text-center text-ink/40 dark:text-bone/40">loading model</p>
            )}
            {modelStatus === 'error' && (
              <p className="mx-auto mb-12 max-w-md text-center text-sm text-clay dark:text-clay">
                The model could not load. Check your connection and reload the page.
              </p>
            )}
            <ModePicker onSelect={open} />
          </>
        )}

        {mode === 'upload' && <UploadDrop onClose={close} onLogged={refreshStats} />}
        {mode === 'camera' && <CameraView onClose={close} onLogged={refreshStats} />}

        <div style={{ opacity: mode ? 0.4 : 1, transition: 'opacity .5s' }}>
          <StatsStrip stats={stats} />
        </div>
      </main>

      <Footer />
    </div>
  )
}