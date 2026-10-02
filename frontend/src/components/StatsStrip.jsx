import { useCountUp } from '../hooks/useGsapReveal'

const ITEMS = [
  { key: 'totalSessions', label: 'readings', decimals: 0, suffix: '' },
  { key: 'totalFacesDetected', label: 'faces found', decimals: 0, suffix: '' },
  { key: 'averageConfidence', label: 'mean confidence', decimals: 0, suffix: '%', scale: 100 },
]

function Stat({ label, value, decimals, suffix }) {
  const ref = useCountUp(value ?? 0, { decimals })
  return (
    <div className="px-6 py-8 text-center">
      <p className="serif text-4xl tracking-tight text-ink sm:text-5xl">
        <span ref={ref}>0</span>
        {suffix}
      </p>
      <p className="mono-label mt-3 text-ink/30">{label}</p>
    </div>
  )
}

export default function StatsStrip({ stats }) {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24">
      <div className="hairline pt-2">
        <div className="grid gap-px bg-ink/10 sm:grid-cols-3">
          {ITEMS.map((item) => (
            <div key={item.key} className="bg-bone">
              <Stat
                label={item.label}
                decimals={item.decimals}
                suffix={item.suffix}
                value={(stats?.[item.key] ?? 0) * (item.scale ?? 1)}
              />
            </div>
          ))}
        </div>
      </div>
      <p className="mono-label mt-8 text-center text-ink/25">
        counters sync with the backend · imagery is never stored
      </p>
    </section>
  )
}
