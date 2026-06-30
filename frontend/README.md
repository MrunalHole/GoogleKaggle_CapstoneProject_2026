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
  Recharts) and medication reminders, persisted in `localStorage`.
- **Treatments overview** — medication, procedures, and therapy options.
- **Ask Lucent** — a chat assistant for plain-language Q&A.
- **Accessibility menu** — high-contrast mode, large text, reduced motion,
  and experimental voice navigation ("go to dashboard", etc.) via the
  browser's SpeechRecognition API.

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit \`http://localhost:5173\`.

## Connecting the real model backend

By default, the Voice Screening page runs in **demo mode** — it returns
simulated results so the UI is fully clickable without a backend. To
connect it to the real model (e.g. the Random Forest / SVM pipeline,
served behind the \`agents-cli\`/ADK agent in this repo, or any FastAPI
wrapper around the trained model):

1. Copy \`.env.example\` to \`.env\`.
2. Set \`VITE_API_BASE_URL\` to your backend's base URL.
3. Implement these endpoints on the backend:
   - \`POST /screen/voice\` — multipart form with an \`audio\` file, returns a \`ScreeningResult\` (see \`src/lib/api.ts\`)
   - \`POST /screen/csv\` — multipart form with a \`file\` field (CSV of vocal features), same response shape
   - \`POST /attachments\` — multipart form with a \`file\` field, for supporting documents

The exact response shape expected by the frontend is documented in
\`src/lib/api.ts\` (\`ScreeningResult\` interface).

## Connecting the AI assistant

\`src/pages/AssistantPage.tsx\` currently calls the Anthropic API directly
from the browser for demo purposes. **Before shipping this**, route it
through your own backend instead so your API key isn't exposed
client-side — the agent scaffold already in this repo (\`app/agent.py\`)
is a natural place for this.

## Project structure

\`\`\`
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
\`\`\`

## Design system

Colors, spacing, and type scales are defined as CSS variables in
\`src/styles/tokens.css\`. The palette follows the project's brief exactly:

| Role | Hex |
|---|---|
| Background | \`#F6F4EF\` |
| Primary | \`#F0A2A1\` |
| Hover | \`#E88988\` |
| Dark accent | \`#343434\` |
| Heading | \`#2B2B2B\` |
| Body text | \`#565656\` |
| Border | \`#DDD7D2\` |
| Card | \`#FFFDFC\` |

Typography: **Fraunces** (display/headings) paired with **Inter**
(body/UI), loaded via Google Fonts in \`index.html\`.

## Known limitations (carried over from the ML project)

The underlying model is trained on a small (32-subject), imbalanced
research dataset, and cross-validation in the current pipeline isn't
grouped by subject — meaning reported accuracy is likely optimistic. The
**About** page in the app states this directly to end users. See the
main project README for full details.

## Accessibility notes

- All interactive elements have visible focus states and ARIA labels.
- \`prefers-reduced-motion\` is respected globally.
- High-contrast and large-text modes are togglable from the navbar and
  persist across sessions.
- Voice navigation requires a browser with Web Speech API support
  (Chrome/Edge); it no-ops gracefully elsewhere.
