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

  return (
    <div className={`grain min-h-screen transition-colors duration-500 ${dark ? 'dark' : ''}`}>
      <header className="fixed top-6 right-6 z-50">
        <ThemeToggle dark={dark} onToggle={setDark} />
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

        {mode === 'upload' && <UploadDrop onClose={() => setMode(null)} onLogged={refreshStats} />}
        {mode === 'camera' && <CameraView onClose={() => setMode(null)} onLogged={refreshStats} />}

        <div style={{ opacity: mode ? 0.4 : 1, transition: 'opacity .5s' }}>
          <StatsStrip stats={stats} />
        </div>
      </main>

      <Footer />
    </div>
  )
}