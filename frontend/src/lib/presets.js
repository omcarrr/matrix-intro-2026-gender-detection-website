/**
 * Hardcoded demo readings for five specific photos.
 *
 * When one of these images is uploaded we recognise it with a perceptual hash
 * (dHash), so a re-saved, re-compressed, cropped-by-accident or resized copy of the
 * same photo still matches, and return the fixed reading below instead of running
 * the model. Anything that does not match falls through to normal detection.
 *
 * These are canned joke values for a stage demo. They are NOT model output, which is
 * why every preset result is tagged `preset: true` and clearly labelled as such in
 * the UI — never present a preset as a real reading.
 */

/**
 * Max Hamming distance (out of 64 bits) still treated as "the same photo".
 * The closest pair among these five reference photos differs by 23 bits, so 14 keeps
 * a comfortable margin on both sides: an identical copy scores 0, a re-encoded or
 * browser-rescaled copy stays low, and two genuinely different photos stay above.
 */
export const PRESET_TOLERANCE = 14

/** 64-bit dHash per photo, computed from a 9x8 greyscale reduction of the file. */
export const PRESETS = [
  {
    id: 'mota-motherboard',
    label: 'mota motherboard',
    hash: '0111001101100011111000011001110011011001110000011100100111011001',
    readings: [
      { gender: 'gay', confidence: 0.98, alternates: [{ gender: 'animal', confidence: 0.02 }] },
    ],
  },
  {
    id: 'farhan',
    label: 'farhan',
    hash: '1011010010100110111101101101111110011110101110001110100010100100',
    readings: [
      {
        gender: 'transgender',
        confidence: 0.8,
        alternates: [{ gender: 'female', confidence: 0.2 }],
      },
    ],
  },
  {
    id: 'farhan-100-trans',
    label: 'farhan 100 trans',
    hash: '1011000010101001100010001001000001001100110011101000111010110110',
    readings: [{ gender: 'transgender', confidence: 1, alternates: [] }],
  },
  {
    id: 'matrix-1',
    label: 'MATRIX Club Orientation',
    hash: '0011001001111010001100100011001000100111001001010100010100001110',
    readings: [{ gender: 'matrix', confidence: 1, alternates: [] }],
  },
  {
    id: 'matrix-2',
    label: 'MATRIX Club Orientation (1)',
    hash: '0100011101011101010110010011100000110100111100001111011010111000',
    readings: [{ gender: 'matrix', confidence: 1, alternates: [] }],
  },
  {
    id: 'matrix-3',
    label: 'MATRIX Club Orientation (2)',
    hash: '0011001101110011011100011110000111100001111000010111001101000011',
    readings: [{ gender: 'matrix', confidence: 1, alternates: [] }],
  },
]

/**
 * Second chance if the perceptual hash is inconclusive (odd crops, heavy
 * recompression): fall back to keywords in the file name. All three MATRIX
 * photos share one reading, so any of them is an equally valid match.
 *
 * Order matters — `find` returns the first hit, so the specific "farhan 100
 * trans" pattern must stay ahead of the generic "farhan" one.
 */
const NAME_HINTS = [
  { id: 'farhan-100-trans', test: /farhan\s*100\s*trans/i },
  { id: 'mota-motherboard', test: /mota|motherboard/i },
  { id: 'farhan', test: /farhan/i },
  { id: 'matrix-1', test: /matrix/i },
]

const GRID = 8 // 9x8 grid -> 64 bits

/** 64-bit difference hash of a loaded <img>, as a binary string. */
export function dHash(img) {
  const canvas = document.createElement('canvas')
  canvas.width = GRID + 1
  canvas.height = GRID
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, GRID + 1, GRID)

  const { data } = ctx.getImageData(0, 0, GRID + 1, GRID)
  const gray = new Float64Array((GRID + 1) * GRID)
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4
    gray[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]
  }

  let bits = ''
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const i = y * (GRID + 1) + x
      bits += gray[i] > gray[i + 1] ? '1' : '0'
    }
  }
  return bits
}

export function hamming(a, b) {
  let d = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++
  return d + Math.abs(a.length - b.length)
}

/** @returns the matching preset, or null when this upload is a normal photo. */
export function matchPreset(img, fileName = '') {
  if (!img?.naturalWidth) return null

  try {
    const hash = dHash(img)
    let best = null
    let bestDistance = Infinity
    for (const preset of PRESETS) {
      const distance = hamming(hash, preset.hash)
      if (distance < bestDistance) {
        bestDistance = distance
        best = preset
      }
    }
    if (best && bestDistance <= PRESET_TOLERANCE) {
      return { ...best, distance: bestDistance, matchedBy: 'hash' }
    }
  } catch {
    /* tainted canvas or no 2d context — fall through to the name check */
  }

  const hinted = NAME_HINTS.find((h) => h.test.test(fileName))
  if (hinted) {
    return { ...PRESETS.find((p) => p.id === hinted.id), matchedBy: 'filename' }
  }

  return null
}

/**
 * Turn a matched preset into the same shape `analyzeImage` returns, reusing a real
 * detected face box when the model found one so the overlay still lands on a face.
 */
export function presetFaces(preset, img, detected = []) {
  const W = img.naturalWidth
  const H = img.naturalHeight
  const first = detected[0]
  const box = first?.box ?? { x: W * 0.25, y: H * 0.15, width: W * 0.5, height: H * 0.5 }

  return preset.readings.map((r) => ({
    gender: r.gender,
    confidence: r.confidence,
    alternates: r.alternates ?? [],
    age: first?.age ?? 0,
    box,
    preset: true,
    presetLabel: preset.label,
  }))
}