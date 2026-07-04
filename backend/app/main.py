import os
import uuid
import shutil
import pandas as pd
from typing import List
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
from app.crud import create_session_record, get_session_records
from app.schemas import ScreeningResult, AttachmentResponse, SessionDetailResponse, AssistantChatRequest, AssistantChatResponse
from app.ml.model import load_and_train_models, predict_vocal_features, DEFAULT_VOICE_BASE
from app.ml.audio_features import extract_voice_features
from app.agent.explainer import get_clinical_explanation
from app.agent.assistant import get_assistant_reply

# Create database tables in PostgreSQL on startup
try:
    Base.metadata.create_all(bind=engine)
    print("[OK] Database tables verified/created successfully.")
except Exception as db_err:
    print(f"[WARNING] Could not connect to PostgreSQL database: {db_err}")
    print("Please ensure PostgreSQL is running at the DATABASE_URL configured in your .env file.")
    print("Database logging endpoints will fail, but the API server will run.")

# Initialize FastAPI App
app = FastAPI(
    title="Parkinson's Disease Detection API",
    description="Python FastAPI backend serving machine learning predictions and Gemini clinical explanations.",
    version="1.0.0"
)

# Set up CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads directory setup
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.on_event("startup")
def startup_event():
    """Event handler run when FastAPI starts. Trains/loads SVM & RF models."""
    print("[START] Training Parkinson's ML models...")
    success = load_and_train_models()
    if success:
        print("[OK] Models loaded and ready.")
    else:
        print("[WARNING] Failed to load models. Running in mock fallback mode.")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "Parkinson's Disease Detection API",
        "version": "1.0.0"
    }

@app.post("/screen/voice", response_model=ScreeningResult)
def screen_voice(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Voice Screening Endpoint.

    Receives raw audio, saves it, extracts real acoustic biomarkers from the
    recording via Praat, runs the SVM model prediction, calls Gemini to get
    clinical explanation, logs the session to PostgreSQL, and returns the
    ScreeningResult.
    """
    try:
        # 1. Save uploaded audio file locally
        file_extension = os.path.splitext(audio.filename)[1] or ".webm"
        unique_filename = f"voice_{uuid.uuid4().hex}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Write file content
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
            
        # 2. Extract real acoustic biomarkers from the recording via Praat
        features = extract_voice_features(file_path, DEFAULT_VOICE_BASE)

        # 3. Run predictions using the trained SVM model
        prediction_result = predict_vocal_features(features, model_type="svm")

        # 4. Generate clinical explanation using Gemini (or fallback template)
        explanation = get_clinical_explanation(
            features=features,
            risk_score=prediction_result["riskScore"],
            label=prediction_result["label"]
        )

        # 5. Log the screening session to PostgreSQL
        create_session_record(
            db=db,
            risk_score=prediction_result["riskScore"],
            label=prediction_result["label"],
            model_used=prediction_result["modelUsed"],
            confidence=prediction_result["confidence"],
            features=features,
            clinical_explanation=explanation,
            voice_file_path=file_path
        )

        # 6. Return response matching frontend types
        return ScreeningResult(
            riskScore=prediction_result["riskScore"],
            label=prediction_result["label"],
            modelUsed=prediction_result["modelUsed"],
            topFeatures=prediction_result["topFeatures"],
            confidence=prediction_result["confidence"],
            disclaimer="This is a screening aid built on a research dataset. It is not a medical diagnosis. Please discuss any results with a neurologist."
        )

    except Exception as e:
        print(f"Error in /screen/voice: {e}")
        raise HTTPException(status_code=500, detail=f"Voice screening failed: {str(e)}")

@app.post("/screen/csv", response_model=ScreeningResult)
def screen_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """CSV Features screening endpoint.
    
    Receives a CSV file of vocal features, parses column values, runs the RF model,
    gets the explanation, logs the session, and returns the ScreeningResult.
    """
    try:
        # 1. Read CSV file
        df = pd.read_csv(file.file)
        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")

        # Take the first row of data
        first_row = df.iloc[0]
        
        # 2. Map columns from CSV or fall back to default values
        input_features = {}
        for col in DEFAULT_VOICE_BASE.keys():
            if col in first_row:
                input_features[col] = float(first_row[col])
            else:
                input_features[col] = DEFAULT_VOICE_BASE[col]

        # 3. Predict using the trained Random Forest model
        prediction_result = predict_vocal_features(input_features, model_type="random_forest")

        # 4. Generate clinical explanation using Gemini (or fallback template)
        explanation = get_clinical_explanation(
            features=input_features,
            risk_score=prediction_result["riskScore"],
            label=prediction_result["label"]
        )

        # 5. Log the screening session to PostgreSQL
        create_session_record(
            db=db,
            risk_score=prediction_result["riskScore"],
            label=prediction_result["label"],
            model_used=prediction_result["modelUsed"],
            confidence=prediction_result["confidence"],
            features=input_features,
            clinical_explanation=explanation,
            voice_file_path=None
        )

        # 6. Return response matching frontend types
        return ScreeningResult(
            riskScore=prediction_result["riskScore"],
            label=prediction_result["label"],
            modelUsed=prediction_result["modelUsed"],
            topFeatures=prediction_result["topFeatures"],
            confidence=prediction_result["confidence"],
            disclaimer="This is a screening aid built on a research dataset. It is not a medical diagnosis. Please discuss any results with a neurologist."
        )

    except Exception as e:
        print(f"Error in /screen/csv: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"CSV screening failed: {str(e)}")

@app.post("/assistant/chat", response_model=AssistantChatResponse)
def assistant_chat(request: AssistantChatRequest):
    """Ask Lucent chat endpoint. Proxies the conversation to Gemini server-side
    so the API key never reaches the browser."""
    try:
        reply = get_assistant_reply([m.model_dump() for m in request.messages])
        return AssistantChatResponse(reply=reply)
    except Exception as e:
        print(f"Error in /assistant/chat: {e}")
        raise HTTPException(status_code=500, detail=f"Assistant chat failed: {str(e)}")

@app.post("/attachments", response_model=AttachmentResponse)
def upload_attachment(
    file: UploadFile = File(...)
):
    """Attachment Endpoint. Saves supporting clinical documents locally."""
    try:
        # Save file locally
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"doc_{unique_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return AttachmentResponse(
            id=unique_id,
            filename=file.filename,
            status="received"
        )
    except Exception as e:
        print(f"Error in /attachments: {e}")
        raise HTTPException(status_code=500, detail=f"Attachment upload failed: {str(e)}")

@app.get("/sessions", response_model=List[SessionDetailResponse])
def get_sessions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Retrieves all logged session histories from PostgreSQL (for verification)."""
    records = get_session_records(db, skip=skip, limit=limit)
    return [
        SessionDetailResponse(
            session_id=r.session_id,
            date=r.date,
            risk_score=r.risk_score,
            label=r.label,
            model_used=r.model_used,
            confidence=r.confidence,
            voice_file_path=r.voice_file_path,
            features={k: float(v) for k, v in r.features.items()},
            clinical_explanation=r.clinical_explanation
        ) for r in records
    ]

if __name__ == "__main__":
    import uvicorn
    # Allow running backend server directly via python app/main.py
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
