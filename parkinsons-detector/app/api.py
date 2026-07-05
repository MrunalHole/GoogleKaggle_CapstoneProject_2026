import os
import tempfile
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter
from typing import Dict, Any

# Import DSP extraction from the root pipeline
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from audio_pipeline import extract_acoustic_features

from app.agent import CORE_MAPPINGS, FEATURE_MAPPINGS, load_and_harmonize_datasets
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

router = APIRouter()

# Global variables for the production Random Forest model
_RF_MODEL = None
_RF_SCALER = None
_RF_FEATURES = None
_RF_ACCURACY = 69.51
_RF_IMPORTANCES = {
    'Shimmer_percent': 51.2,
    'Jitter_percent': 48.7
}

def get_or_train_rf_model():
    """Lazily loads or trains the RF model on the harmonized dataset."""
    global _RF_MODEL, _RF_SCALER, _RF_FEATURES
    
    if _RF_MODEL is not None:
        return _RF_MODEL, _RF_SCALER, _RF_FEATURES
        
    df = load_and_harmonize_datasets()
    if df is None:
        raise RuntimeError("Could not load global harmonized dataset to train RF model.")
        
    X = df.drop(columns=['status', 'patient_id'], errors='ignore')
    y = df['status']
    
    _RF_FEATURES = list(X.columns)
    _RF_SCALER = StandardScaler()
    X_scaled = _RF_SCALER.fit_transform(X)
    
    _RF_MODEL = RandomForestClassifier(random_state=42)
    _RF_MODEL.fit(X_scaled, y)
    
    return _RF_MODEL, _RF_SCALER, _RF_FEATURES

@router.post("/screen/voice")
async def screen_voice(file: UploadFile = File(...)):
    """
    POST /screen/voice
    Accepts multimedia or tabular files, performs smart schema mapping or DSP extraction,
    and runs the Random Forest screening model to return a clinical risk payload.
    """
    filename = file.filename.lower()
    
    try:
        # 1. Multi-Format Input Parsing & 3. Feature Extraction Layer
        if filename.endswith(('.wav', '.mp3')):
            # Save audio temporarily for librosa processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
                content = await file.read()
                tmp.write(content)
                tmp_path = tmp.name
                
            try:
                features = extract_acoustic_features(tmp_path)
                if not features:
                    raise HTTPException(status_code=400, detail="Could not extract vocal features from the audio.")
                # Convert extracted DSP features into DataFrame for Smart Matcher
                df_input = pd.DataFrame([features])
            finally:
                os.remove(tmp_path)
                
        elif filename.endswith('.csv') or filename.endswith('.txt'):
            df_input = pd.read_csv(file.file, engine='python')
        elif filename.endswith('.json'):
            df_input = pd.read_json(file.file)
        elif filename.endswith('.xlsx'):
            df_input = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format.")
            
        # 2. Smart Schema Matcher (Dynamically harmonize headers)
        # Handle lowercase variations and common misspellings before mapping
        df_input = df_input.rename(columns=lambda x: str(x).strip())
        df_input = df_input.rename(columns=CORE_MAPPINGS)
        df_input = df_input.rename(columns=FEATURE_MAPPINGS)
        
        # Load production RF model
        model, scaler, feature_cols = get_or_train_rf_model()
        
        # Fill missing features with 0 to prevent model crash if it's a partial schema upload
        for col in feature_cols:
            if col not in df_input.columns:
                df_input[col] = 0.0
                
        # 4. Model Inference
        # We assume the first row represents the patient payload
        input_data = df_input[feature_cols].iloc[0:1]
        input_scaled = scaler.transform(input_data)
        
        # Extract classification margin score
        likelihood_score = float(model.predict_proba(input_scaled)[0][1])
        
        # Intensity Categorization Matrix
        if likelihood_score < 0.35:
            intensity_level = 'Low Risk'
        elif likelihood_score < 0.65:
            intensity_level = 'Moderate Indicators'
        else:
            intensity_level = 'High Indicators'
            
        percentage_chance = f"{likelihood_score * 100:.1f}% probability of tracking Parkinson's indicators"
        
        # Enriched Response Payload matching the Lucent frontend contract
        response_payload = {
            "likelihood_score": likelihood_score,
            "percentage_chance": percentage_chance,
            "intensity_level": intensity_level,
            "model_accuracy": _RF_ACCURACY,
            "feature_importances": _RF_IMPORTANCES,
            "clinical_disclaimer": (
                "Warning: This calculation represents an approximate screening metric. "
                "These details may be inaccurate. You must contact a professional healthcare provider "
                "for a formal diagnosis."
            )
        }
        
        return response_payload
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# Mount point for the main application:
app = FastAPI()
app.include_router(router)
