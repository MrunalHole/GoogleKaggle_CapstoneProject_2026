# Lucent — Parkinson's Detector Frontend

An interactive education and screening frontend for the Parkinson's
detection project. Built with React, TypeScript, Three.js (via React
Three Fiber), and Vite.

## Features

- **3D brain explorer** — a procedurally generated, clickable brain model
  highlighting the regions Parkinson's affects (substantia nigra, basal
  ganglia, motor cortex, cerebellum, limbic system).
- **Disease stage simulator** — slider-driven walkthrough of the five
  Hoehn & Yahr stages, with an animated dopamine-level visualization.
- **Voice screening tool** — record a voice clip in-browser, or upload an
  audio file or a CSV of vocal biomarkers, and get a model-driven
  likelihood score with feature importances.
- **Personal dashboard** — symptom check-ins charted over time (via
  Recharts), medication reminders, and past screening session history,
  persisted in `localStorage` (check-ins/medications) or fetched from the
  backend (session history).
- **Treatments overview** — medication, procedures, and therapy options.
- **Ask Lucent** — a chat assistant for plain-language Q&A.
- **Accessibility menu** — high-contrast mode, large text, reduced motion,
  and experimental voice navigation ("go to dashboard", etc.) via the
  browser's SpeechRecognition API.

## Getting started

**`VITE_API_BASE_URL` is required — there is no demo/mock mode.** Every API
call in `src/lib/api.ts` goes to `${VITE_API_BASE_URL}/...`; if it's unset,
that becomes a relative path, which silently targets Vite's own dev server
instead of the backend. This fails, but not obviously:
- `POST` calls (voice recording, CSV upload, attachments) come back as a
  plain, empty-body **404** with no `content-type` — Vite's dev server, not
  the backend, since nothing is mounted at that path for non-GET requests.
- `GET` calls (e.g. dashboard session history) come back as a **200** with
  Vite's `index.html`, then fail client-side trying to parse it as JSON
  (`Unexpected token '<'... is not valid JSON` in the console) — no 404 at
  all for this case, since Vite's SPA fallback intercepts GET requests.

```bash
npm install
cp .env.example .env
# edit .env: VITE_API_BASE_URL=http://127.0.0.1:5000 (or wherever your backend runs)
npm run dev
```

Visit `http://localhost:5173`.

## Connecting the real model backend

The FastAPI backend lives in `../backend` and trains the Random Forest / SVM
pipeline, extracting real acoustic biomarkers via Praat. Run it — see
`../backend/README.md` — then point `VITE_API_BASE_URL` (set above) at it.
It implements:
- `POST /screen/voice` — multipart form with an `audio` file, returns a `ScreeningResult` (see `src/lib/api.ts`)
- `POST /screen/csv` — multipart form with a `file` field (CSV of vocal features), same response shape
- `POST /attachments` — multipart form with a `file` field, for supporting documents
- `GET /sessions` — past screening sessions, shown on the Dashboard page

The exact response shape expected by the frontend is documented in
`src/lib/api.ts` (`ScreeningResult` interface).

## Connecting the AI assistant

`src/pages/AssistantPage.tsx` sends chat history to `POST /assistant/chat`
on the backend (see `../backend/app/agent/assistant.py`), which proxies to
Gemini server-side so the API key never reaches the browser. Set
`GEMINI_API_KEY` on the backend to enable it; without a key, the endpoint
returns a clearly-labeled fallback message instead of failing silently.

## Project structure

```
src/
  components/
    layout/      Navbar, Footer, page Layout wrapper
    three/       3D brain scene (React Three Fiber)
    ui/          Button, AccessibilityMenu, SynapseDivider, shared primitives
    upload/      AudioRecorder, Dropzone
  data/          Static content: brain regions, disease stages, treatments
  lib/           API client, voice navigation hook
  pages/         One file + co-located CSS per route
  store/         Zustand stores (accessibility settings, dashboard data)
  styles/        Design tokens (tokens.css), global resets, shared component CSS
```

## Design system

Colors, spacing, and type scales are defined as CSS variables in
`src/styles/tokens.css`. The palette follows the project's brief exactly:

| Role | Hex |
|---|---|
| Background | `#F6F4EF` |
| Primary | `#F0A2A1` |
| Hover | `#E88988` |
| Dark accent | `#343434` |
| Heading | `#2B2B2B` |
| Body text | `#565656` |
| Border | `#DDD7D2` |
| Card | `#FFFDFC` |

Typography: **Fraunces** (display/headings) paired with **Inter**
(body/UI), loaded via Google Fonts in `index.html`.

## Known limitations (carried over from the ML project)

The underlying model is trained on a small (32-subject), imbalanced
research dataset, and cross-validation in the current pipeline isn't
grouped by subject — meaning reported accuracy is likely optimistic. The
**About** page in the app states this directly to end users. See the
[main project README](../README.md) for full details.

## Accessibility notes

- All interactive elements have visible focus states and ARIA labels.
- `prefers-reduced-motion` is respected globally.
- High-contrast and large-text modes are togglable from the navbar and
  persist across sessions.
- Voice navigation requires a browser with Web Speech API support
  (Chrome/Edge); it no-ops gracefully elsewhere.
