/**
 * Colour tones per reading label. The preset demo introduces labels beyond
 * male/female, so every consumer must go through `toneFor` and never index the map
 * directly.
 */

const TONES = {
  male: { fill: 'var(--accent-cool)', text: 'text-[var(--accent-cool)]' },
  female: { fill: 'var(--accent-warm)', text: 'text-[var(--accent-warm)]' },
  transgender: { fill: 'var(--accent-cool)', text: 'text-[var(--accent-cool)]' },
  gay: { fill: 'var(--accent-warm)', text: 'text-[var(--accent-warm)]' },
  animal: { fill: 'var(--accent-cool)', text: 'text-[var(--accent-cool)]' },
  matrix: { fill: 'var(--accent-cool)', text: 'text-[var(--accent-cool)]' },
}

const FALLBACK = { fill: 'var(--accent-warm)', text: 'text-[var(--accent-warm)]' }

export const toneFor = (label) => TONES[label] ?? FALLBACK