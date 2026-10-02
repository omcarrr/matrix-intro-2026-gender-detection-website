# Mirror AI

Live gender-estimation web app. Detection runs entirely in the browser with
`@vladmandic/face-api` (BlazeFace detector + `ageGenderNet`) on TensorFlow.js.
No image or video frame is ever uploaded — the backend only stores summary stats.

```
frontend/   Vite + React + Tailwind + GSAP
backend/    Node + Express + SQLite  (planned, see BACKEND-PLAN.md)
```

## Run the frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Models (~6 MB) load from a CDN on first use and are cached by the browser. Click
**Preload detection models** on the home screen to warm the cache.

## Build order / architecture notes

See `FRONTEND-PLAN.md` and `BACKEND-PLAN.md`.

## Disclaimer

The output is an approximate model estimate, not a verified fact. Do not use it
to make decisions about people.
# matrix-intro-2026-gender-detection-website
