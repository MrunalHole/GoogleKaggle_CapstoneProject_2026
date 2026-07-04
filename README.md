# Lucent — Parkinson's Disease Screening & Education Platform

A capstone project (Google/Kaggle) exploring what a voice-based Parkinson's
screening tool could look like: a React frontend for education and
screening, a FastAPI backend serving ML predictions and Gemini-generated
clinical explanations, and a standalone Google ADK agent.

## Structure

```
frontend/             React + TypeScript + Vite. 3D brain explorer, disease
                       stage simulator, voice screening UI, personal
                       dashboard, and an AI assistant ("Ask Lucent").
backend/               FastAPI + PostgreSQL (falls back to SQLite locally).
                       Trains SVM/Random Forest models on the UCI Parkinson's
                       dataset, extracts real acoustic biomarkers from voice
                       recordings via Praat, and proxies clinical/chat
                       explanations through Gemini.
parkinsons-detector/   A separate Google ADK ReAct agent that performs the
                       same screening as a standalone deployable agent.
```

Each subproject has its own README with setup instructions:
[frontend/README.md](frontend/README.md) · [backend/README.md](backend/README.md) · [parkinsons-detector/README.md](parkinsons-detector/README.md)

## Quick start (frontend + backend)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # add GEMINI_API_KEY if you have one
uvicorn app.main:app --host 127.0.0.1 --port 5000 --reload

# Frontend (separate terminal)
cd frontend
npm install
echo "VITE_API_BASE_URL=http://127.0.0.1:5000" > .env
npm run dev
```

Visit `http://localhost:5173`.

## Known limitations

The underlying model is trained on the UCI Parkinson's voice dataset — 195
recordings from just 32 subjects (23 with Parkinson's, 8 healthy), with
147 PD recordings vs. 48 healthy (class imbalance), and cross-validation
that isn't grouped by subject. Reported accuracy is likely optimistic, and
this is **not a diagnostic tool**. The in-app **About** page states this
directly to end users; see [frontend/src/pages/AboutPage.tsx](frontend/src/pages/AboutPage.tsx)
for the full disclosure.

Of the 22 acoustic biomarkers the model uses, `/screen/voice` extracts 16
directly from the uploaded recording via Praat (fundamental frequency,
jitter, shimmer, HNR). The remaining 6 — RPDE, DFA, D2, spread1, spread2,
and PPE — are nonlinear-dynamics measures from the original research
pipeline with no standard library implementation; they fall back to the
training dataset's baseline values rather than being computed or fabricated
per recording. `/screen/csv` is unaffected — direct feature CSV uploads
run through the real trained model end-to-end.
