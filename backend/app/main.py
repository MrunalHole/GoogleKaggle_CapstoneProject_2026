import os
import glob
import uuid
import shutil
import pandas as pd
from typing import List, Optional
from fastapi import FastAPI, Depends, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
from app.migrations import run_migrations
from app.crud import create_session_record, get_session_records
from app.schemas import ScreeningResult, AttachmentResponse, SessionDetailResponse, AssistantChatRequest, AssistantChatResponse
from app.ml.model import load_and_train_models, predict_vocal_features, DEFAULT_VOICE_BASE
from app.ml.audio_features import extract_voice_features
from app.agent.explainer import get_clinical_explanation
from app.agent.assistant import get_assistant_reply
from app.auth import get_current_user, get_current_user_optional
from app.models import User
from app import auth_routes

# Create database tables in PostgreSQL on startup
try:
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
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

app.include_router(auth_routes.router)

# Uploads directory setup
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Matches the frontend's Dropzone `accept` list for supporting clinical
# documents (frontend/src/pages/ScreeningPage.tsx). .mp3 is allowed as
# reference material only -- unlike /screen/voice, this endpoint doesn't
# run any feature extraction on it; it's just stored as-is.
ALLOWED_ATTACHMENT_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx", ".txt", ".mp3"}
MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

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
    attachments_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Voice Screening Endpoint.

    Works with or without login. Receives raw audio, saves it, extracts real
    acoustic biomarkers from the recording via Praat, runs the deployed
    model's prediction, calls Gemini to get clinical explanation, logs the
    session to PostgreSQL (associated with the caller if authenticated,
    anonymous otherwise), and returns the ScreeningResult.
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

        # 3. Run predictions using the trained Random Forest model
        prediction_result = predict_vocal_features(features, model_type="random_forest")

        # 4. Generate clinical explanation using Gemini (or fallback template)
        explanation = get_clinical_explanation(
            features=features,
            risk_score=prediction_result["riskScore"],
            label=prediction_result["label"]
        )

        # Parse attachments
        import json
        parsed_attachments = []
        if attachments_json:
            try:
                raw_list = json.loads(attachments_json)
                for item in raw_list:
                    att_id = item.get("id")
                    filename = item.get("filename")
                    if att_id:
                        file_pattern = os.path.join(UPLOAD_DIR, f"doc_{att_id}.*")
                        matching_files = glob.glob(file_pattern)
                        if matching_files:
                            basename = os.path.basename(matching_files[0])
                            parsed_attachments.append({
                                "id": att_id,
                                "filename": filename or basename,
                                "url": f"/uploads/{basename}"
                            })
            except Exception as e:
                print(f"Error parsing attachments JSON: {e}")

        # 5. Log the screening session to PostgreSQL
        create_session_record(
            db=db,
            risk_score=prediction_result["riskScore"],
            label=prediction_result["label"],
            model_used=prediction_result["modelUsed"],
            confidence=prediction_result["confidence"],
            features=features,
            clinical_explanation=explanation,
            voice_file_path=file_path,
            csv_file_path=None,
            attachments=parsed_attachments,
            user_id=current_user.id if current_user else None
        )

        # 6. Return response matching frontend types
        intensity = "Low Risk"
        if prediction_result["label"] == "elevated-likelihood":
            intensity = "High Indicators"
        elif prediction_result["label"] == "moderate-likelihood":
            intensity = "Moderate Indicators"

        return ScreeningResult(
            likelihood_score=prediction_result["riskScore"],
            percentage_chance=f"{round(prediction_result['riskScore'] * 100, 1)}% probability of tracking Parkinson's indicators",
            intensity_level=intensity,
            model_accuracy="69.51%",
            feature_importances={f["feature"]: f["importance"] for f in prediction_result["topFeatures"]},
            clinical_disclaimer="Warning: This calculation represents an approximate screening metric. These details may be inaccurate. You must contact a professional healthcare provider for a formal diagnosis."
        )

    except Exception as e:
        print(f"Error in /screen/voice: {e}")
        raise HTTPException(status_code=500, detail=f"Voice screening failed: {str(e)}")

@app.post("/screen/csv", response_model=ScreeningResult)
def screen_csv(
    file: UploadFile = File(...),
    attachments_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """CSV Features screening endpoint.

    Works with or without login. Receives a CSV file of vocal features,
    parses column values, runs the deployed model's prediction, gets the
    explanation, logs the session (associated with the caller if
    authenticated, anonymous otherwise), and returns the ScreeningResult.
    """
    try:
        # Save CSV file locally
        file_extension = os.path.splitext(file.filename)[1] or ".csv"
        unique_filename = f"csv_{uuid.uuid4().hex}{file_extension}"
        csv_file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Read and write CSV file
        try:
            file.file.seek(0)
            with open(csv_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file.file.seek(0)  # reset pointer for pandas
            df = pd.read_csv(file.file)
        except pd.errors.EmptyDataError:
            raise HTTPException(status_code=400, detail="Uploaded CSV file is empty.")
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

        # Parse attachments
        import json
        parsed_attachments = []
        if attachments_json:
            try:
                raw_list = json.loads(attachments_json)
                for item in raw_list:
                    att_id = item.get("id")
                    filename = item.get("filename")
                    if att_id:
                        file_pattern = os.path.join(UPLOAD_DIR, f"doc_{att_id}.*")
                        matching_files = glob.glob(file_pattern)
                        if matching_files:
                            basename = os.path.basename(matching_files[0])
                            parsed_attachments.append({
                                "id": att_id,
                                "filename": filename or basename,
                                "url": f"/uploads/{basename}"
                            })
            except Exception as e:
                print(f"Error parsing attachments JSON: {e}")

        # 5. Log the screening session to PostgreSQL
        create_session_record(
            db=db,
            risk_score=prediction_result["riskScore"],
            label=prediction_result["label"],
            model_used=prediction_result["modelUsed"],
            confidence=prediction_result["confidence"],
            features=input_features,
            clinical_explanation=explanation,
            voice_file_path=None,
            csv_file_path=csv_file_path,
            attachments=parsed_attachments,
            user_id=current_user.id if current_user else None
        )

        # 6. Return response matching frontend types
        intensity = "Low Risk"
        if prediction_result["label"] == "elevated-likelihood":
            intensity = "High Indicators"
        elif prediction_result["label"] == "moderate-likelihood":
            intensity = "Moderate Indicators"

        return ScreeningResult(
            likelihood_score=prediction_result["riskScore"],
            percentage_chance=f"{round(prediction_result['riskScore'] * 100, 1)}% probability of tracking Parkinson's indicators",
            intensity_level=intensity,
            model_accuracy="69.51%",
            feature_importances={f["feature"]: f["importance"] for f in prediction_result["topFeatures"]},
            clinical_disclaimer="Warning: This calculation represents an approximate screening metric. These details may be inaccurate. You must contact a professional healthcare provider for a formal diagnosis."
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
    """Attachment Endpoint. Saves supporting clinical documents locally.

    The frontend's Dropzone `accept` attribute is cosmetic -- it only
    filters the OS file picker and does nothing for drag-and-drop, so the
    real gate has to be here, checked against the actual bytes received,
    not a trusted client-side hint.
    """
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_ATTACHMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file_extension or '(none)'}'. "
                    f"Allowed types: {', '.join(sorted(ALLOWED_ATTACHMENT_EXTENSIONS))}"
        )

    try:
        unique_id = str(uuid.uuid4())
        unique_filename = f"doc_{unique_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        total_bytes = 0
        buffer = open(file_path, "wb")
        try:
            while chunk := file.file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_ATTACHMENT_SIZE_BYTES:
                    buffer.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail=f"File exceeds the {MAX_ATTACHMENT_SIZE_BYTES // (1024 * 1024)}MB size limit."
                    )
                buffer.write(chunk)
        finally:
            if not buffer.closed:
                buffer.close()

        return AttachmentResponse(
            id=unique_id,
            filename=file.filename,
            status="received"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /attachments: {e}")
        raise HTTPException(status_code=500, detail=f"Attachment upload failed: {str(e)}")

@app.delete("/attachments/{attachment_id}")
def delete_attachment(attachment_id: str):
    """Deletes an uploaded attachment file from the filesystem."""
    import re
    if not re.match(r"^[a-zA-Z0-9\-]+$", attachment_id):
        raise HTTPException(status_code=400, detail="Invalid attachment ID.")
    
    file_pattern = os.path.join(UPLOAD_DIR, f"doc_{attachment_id}.*")
    matching_files = glob.glob(file_pattern)
    if not matching_files:
        raise HTTPException(status_code=404, detail="Attachment not found.")
    
    for f in matching_files:
        try:
            os.remove(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")
    return {"status": "deleted", "attachment_id": attachment_id}

@app.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a screening session record.
    Requires login and verifying ownership. Cascades deletion of all associated files."""
    try:
        from uuid import UUID
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session ID format.")

    from app.crud import get_session_record
    record = get_session_record(db, session_uuid)
    if not record:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    # Verify ownership
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session.")

    # Delete corresponding voice file if it exists
    if record.voice_file_path and os.path.exists(record.voice_file_path):
        try:
            os.remove(record.voice_file_path)
        except Exception as file_err:
            print(f"[WARNING] Could not delete voice file {record.voice_file_path}: {file_err}")

    # Delete corresponding CSV file if it exists
    if record.csv_file_path and os.path.exists(record.csv_file_path):
        try:
            os.remove(record.csv_file_path)
        except Exception as file_err:
            print(f"[WARNING] Could not delete CSV file {record.csv_file_path}: {file_err}")

    # Delete corresponding attachments if they exist
    if record.attachments:
        for att in record.attachments:
            att_id = att.get("id")
            if att_id:
                file_pattern = os.path.join(UPLOAD_DIR, f"doc_{att_id}.*")
                matching_files = glob.glob(file_pattern)
                for f in matching_files:
                    try:
                        os.remove(f)
                    except Exception as file_err:
                        print(f"[WARNING] Could not delete attachment file {f}: {file_err}")

    # Delete database record
    db.delete(record)
    db.commit()

    return {"status": "deleted", "session_id": session_id}

@app.get("/sessions", response_model=List[SessionDetailResponse])
def get_sessions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves the authenticated caller's own screening session history.
    Requires login -- this endpoint used to return everyone's sessions."""
    records = get_session_records(db, user_id=current_user.id, skip=skip, limit=limit)
    return [
        SessionDetailResponse(
            session_id=r.session_id,
            date=r.date,
            risk_score=r.risk_score,
            label=r.label,
            model_used=r.model_used,
            confidence=r.confidence,
            voice_file_path=r.voice_file_path,
            voice_url=f"/uploads/{os.path.basename(r.voice_file_path)}" if r.voice_file_path else None,
            csv_file_path=r.csv_file_path,
            csv_url=f"/uploads/{os.path.basename(r.csv_file_path)}" if r.csv_file_path else None,
            attachments=r.attachments,
            features={k: float(v) for k, v in r.features.items()},
            clinical_explanation=r.clinical_explanation
        ) for r in records
    ]

if __name__ == "__main__":
    import uvicorn
    # Allow running backend server directly via python app/main.py
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
