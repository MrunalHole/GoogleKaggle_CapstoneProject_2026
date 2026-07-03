# Parkinson's Detection FastAPI Backend

This is a standalone FastAPI + PostgreSQL backend for the Parkinson's Disease Screening and Education Platform.

It is designed to run in isolation and exposes endpoints fully aligned with the frontend's API interface and the `parkinsons-detector` machine learning model.

## Features

1. **Database Persistence**: Screening sessions (vocal biomarkers, classification scores, models used, and clinical explanations) are persisted directly into PostgreSQL.
2. **Machine Learning Inference**: Trains SVM and Random Forest classifiers on the Parkinson's research dataset on startup, running real inference on inputs.
3. **Clinical Explanation**: Calls Google Gemini AI model (`gemini-2.5-flash`) to generate structured plain-English clinical explanations of patient voice indicators.
4. **Physiological Safeguards**: Verifies feature ranges and logs compliance details.

---

## Getting Started

### 1. Database Setup (Docker)

To spin up a local PostgreSQL container in the background, run:

```bash
docker compose up -d
```

This starts a PostgreSQL instance on port `5432` with username `postgres`, password `password`, and database `parkinsons`.

### 2. Install Dependencies

Ensure you have [uv](https://docs.astral.sh/uv/) installed (or use standard `pip` if you prefer).

To create a virtual environment and install dependencies:

```bash
uv venv
.venv\Scripts\activate
uv pip install -e .
```

Alternatively, with standard `pip`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r pyproject.toml
```

### 3. Set Up Environment Variables

Configure settings in `.env` (a local `.env` has been initialized for you). If you have a Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Backend Server

Start the uvicorn server:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 5000 --reload
```

---

## Testing & Verification

Once the backend is running, visit **`http://127.0.0.1:5000/docs`** in your browser to open the interactive **Swagger UI** page.

From here, you can:
*   Test `/screen/csv` by uploading a sample CSV file containing vocal biomarkers.
*   Test `/screen/voice` by recording/uploading a voice file.
*   Test `/attachments` by uploading PDF/docx documents.
*   Fetch `/sessions` to check if database entries are being correctly logged into PostgreSQL.
