# Frontend Plan — Vite + React + GSAP + Tailwind

## Stack
- Vite + React 18 (JS, no TS to keep it fast)
- Tailwind CSS v3 (dark neon theme, custom palette in `tailwind.config.js`)
- GSAP 3 (core + ScrollTrigger)
- `@tensorflow/tfjs` + `@vladmandic/face-api` (BlazeFace detector + gender classifier, models from public CDN, cached in IndexedDB by face-api)
- `lucide-react` for icons

## Structure
```
src/
  main.jsx
  App.jsx
  components/
    Hero.jsx            # title, split CTA -> opens Upload or Camera modal
    ModePicker.jsx      # two animated cards: Upload / Live Camera
    UploadDrop.jsx      # drag-drop + file input, preview, "Analyze"
    CameraView.jsx      # getUserMedia, <video>, overlay <canvas> boxes
    FaceCard.jsx        # per-face: bounding box + gender % bar + confidence
    ResultSummary.jsx   # "1 person · 70% likely a woman"
    StatsStrip.jsx      # counts fed from backend
    History.jsx         # past sessions
    Footer.jsx
  lib/
    detect.js           # tfjs init, load models, analyzeImage(HTMLImageEl), analyzeVideoFrame(video)
    api.js              # POST /api/sessions, GET /api/sessions
    useCamera.js        # stream lifecycle hook
  hooks/
    useGsapReveal.js    # reusable entrance animation
  styles/index.css
```

## Core ML flow (lib/detect.js)
1. `await tf.ready()` + `faceapi.tf.setBackend('webgl')` (fallback 'cpu')
2. Load nets once, cache on a module-level promise: `SsdMobilenetv1` (detector), `faceLandmark68Net`, `ageGenderNet`
3. Upload path: draw image to offscreen canvas → `faceapi.detectAllFaces(canvas).withFaceLandmarks().withAgeAndGender()`
4. Camera path: rAF loop → every ~150ms grab frame → same detect call → store results → draw boxes
5. Result shape per face: `{ x, y, width, height, gender: 'male'|'female', confidence, age }`
6. Aggregate: if 1 face → `"70% likely a woman"`. If 0 → "No person detected". If N>1 → show each card + a summary line.
7. Run detection at most every 150ms and skip if a previous detect is still in flight (avoid stacking)

## Camera specifics
- `navigator.mediaDevices.getUserMedia({ video: { width: 1280, facingMode: 'user' } })`
- Mirror the video with `scaleX(-1)` and mirror box coordinates on the canvas so overlays line up
- Show a "no face" pulsing hint; box corners drawn in neon cyan, label chip above box
- Stop all tracks on unmount / mode switch

## GSAP animation design
- **Hero**: staggered letter reveal (`y: 40, opacity: 0, rotateX: -40`, `stagger: 0.04`, `ease: 'expo.out'`)
- **Mode cards**: entrance `scale: 0.9 → 1`, then a looping idle float (`y: ±6`, `repeat: -1, yoyo: true, duration: 2.5`)
- **Card hover**: `gsap.to(card, { scale: 1.03, duration: 0.3, ease: 'power2.out' })` + glow shadow
- **Modal open**: overlay `opacity 0→1`, panel `y: 40 → 0, scale: 0.95 → 1` with `back.out(1.4)`
- **Result bars**: gender % bar animates `width: 0 → N%` over 0.9s `ease: 'expo.out'`, number counts up with a GSAP tween on an object
- **Scanner line**: live camera only — a gradient bar looping `top: 0% → 100%` `repeat: -1`, `duration: 2, ease: 'none'`
- **ScrollTrigger**: StatsStrip numbers count up on enter; History rows stagger in
- Reduced motion: respect `prefers-reduced-motion` and set `gsap.globalTimeline.timeScale(100)`

## API calls (lib/api.js)
- `POST /api/sessions` — `{ mode: 'upload'|'camera', faceCount, results: [{gender, confidence, age}] }`
- `GET /api/sessions` — last 20 sessions for History
- Fire-and-forget the POST, never block the UI

## Build order (target ~6 min)
1. Vite scaffold + Tailwind + deps
2. `index.css` theme vars + global classes
3. `lib/detect.js` + `api.js`
4. `App.jsx` shell + Hero + ModePicker (GSAP)
5. UploadDrop → results
6. CameraView + overlay canvas
7. StatsStrip / History + final polish
