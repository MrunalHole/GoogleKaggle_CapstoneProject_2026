import os
import random
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier

# Global variables for models and scalers
SVM_MODEL = None
RF_MODEL = None
SCALER = None
FEATURE_NAMES = None

# Default features dictionary to fallback on or use as baseline for voice simulation
DEFAULT_VOICE_BASE = {
    'MDVP:Fo(Hz)': 154.22,
    'MDVP:Fhi(Hz)': 197.10,
    'MDVP:Flo(Hz)': 116.32,
    'MDVP:Jitter(%)': 0.0062,
    'MDVP:Jitter(Abs)': 0.00004,
    'MDVP:RAP': 0.0033,
    'MDVP:PPQ': 0.0034,
    'Jitter:DDP': 0.0099,
    'MDVP:Shimmer': 0.0297,
    'MDVP:Shimmer(dB)': 0.28,
    'Shimmer:APQ3': 0.0156,
    'Shimmer:APQ5': 0.0179,
    'MDVP:APQ': 0.0241,
    'Shimmer:DDA': 0.0469,
    'NHR': 0.0248,
    'HNR': 21.88,
    'RPDE': 0.49,
    'DFA': 0.72,
    'spread1': -5.68,
    'spread2': 0.23,
    'D2': 2.38,
    'PPE': 0.21
}

def load_and_train_models():
    """Locates the Parkinson's dataset and trains both SVM and RF models on startup."""
    global SVM_MODEL, RF_MODEL, SCALER, FEATURE_NAMES

    # Search paths for parkinsons.data
    paths_to_try = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "parkinsons-detector", "data", "parkinsons.data"),
        os.path.join(os.path.dirname(__file__), "data", "parkinsons.data"),
        "./data/parkinsons.data"
    ]

    data_path = None
    for p in paths_to_try:
        if os.path.exists(p):
            data_path = p
            break

    if not data_path:
        print("[WARNING] parkinsons.data not found in search paths. Using mock ML predictions.")
        return False

    try:
        # Load and clean dataset
        df = pd.read_csv(data_path, engine='python')
        if 'name' in df.columns:
            df = df.drop(columns=['name'])
        
        X = df.drop(columns=['status'])
        y = df['status']
        FEATURE_NAMES = list(X.columns)

        # Scale features
        SCALER = StandardScaler()
        X_scaled = SCALER.fit_transform(X)

        # Train models
        SVM_MODEL = SVC(kernel='rbf', probability=True, random_state=42)
        SVM_MODEL.fit(X_scaled, y)

        RF_MODEL = RandomForestClassifier(random_state=42)
        RF_MODEL.fit(X, y) # RF fitted on unscaled data is standard

        print(f"[OK] Models trained successfully on: {data_path}")
        return True
    except Exception as e:
        print(f"[ERROR] Error training models: {e}")
        return False

# Attempt model training on import
load_and_train_models()

def simulate_voice_features(file_size: int) -> dict:
    """Simulates realistic acoustic features based on a file size, adding
    deterministic variation so that different recordings generate distinct results.
    """
    rng = random.Random(file_size)
    simulated = {}
    for key, base_val in DEFAULT_VOICE_BASE.items():
        # Add a +/- 10% random variation to the base value
        variation = rng.uniform(-0.1, 0.1)
        simulated[key] = base_val * (1.0 + variation)
    
    # Ensure realistic limits for fundamental frequencies
    simulated['MDVP:Fo(Hz)'] = max(50.0, min(400.0, simulated['MDVP:Fo(Hz)']))
    simulated['MDVP:Fhi(Hz)'] = max(simulated['MDVP:Fo(Hz)'], simulated['MDVP:Fhi(Hz)'])
    simulated['MDVP:Flo(Hz)'] = min(simulated['MDVP:Fo(Hz)'], simulated['MDVP:Flo(Hz)'])
    
    return simulated

def predict_vocal_features(features_dict: dict, model_type: str = "svm") -> dict:
    """Takes a dictionary of features, runs prediction, and returns a dictionary of results."""
    global SVM_MODEL, RF_MODEL, SCALER, FEATURE_NAMES

    # Fallback to demo mode if models are not trained
    if SVM_MODEL is None or SCALER is None:
        risk_score = random.uniform(0.1, 0.9)
        label = "low-likelihood" if risk_score < 0.4 else "moderate-likelihood" if risk_score < 0.7 else "elevated-likelihood"
        return {
            "riskScore": risk_score,
            "label": label,
            "modelUsed": model_type,
            "confidence": 0.75 + risk_score * 0.1,
            "features_used": features_dict,
            "topFeatures": [
                {"feature": "PPE (pitch period entropy)", "importance": 0.15},
                {"feature": "spread1", "importance": 0.11},
                {"feature": "MDVP:Fo(Hz)", "importance": 0.08},
                {"feature": "MDVP:Flo(Hz)", "importance": 0.06},
                {"feature": "MDVP:Fhi(Hz)", "importance": 0.06}
            ]
        }

    try:
        # Align inputs with expected training features order and wrap in DataFrame to preserve feature names
        input_data = {}
        for col in FEATURE_NAMES:
            if col in features_dict:
                input_data[col] = float(features_dict[col])
            else:
                input_data[col] = float(DEFAULT_VOICE_BASE.get(col, 0.0))

        input_df = pd.DataFrame([input_data])

        # Get probabilities and prediction
        if model_type == "svm":
            input_scaled = SCALER.transform(input_df)
            input_scaled_df = pd.DataFrame(input_scaled, columns=FEATURE_NAMES)
            risk_score = float(SVM_MODEL.predict_proba(input_scaled_df)[0][1])
            confidence = 0.7 + (abs(risk_score - 0.5) * 0.4)  # higher confidence further from boundary
        else:
            risk_score = float(RF_MODEL.predict_proba(input_df)[0][1])
            confidence = 0.75 + (abs(risk_score - 0.5) * 0.3)

        label = "low-likelihood" if risk_score < 0.4 else "moderate-likelihood" if risk_score < 0.7 else "elevated-likelihood"

        # Calculate feature importances
        # We can extract the RF feature importances for displaying in the frontend
        rf_importances = RF_MODEL.feature_importances_
        feature_imp_list = []
        for name, imp in zip(FEATURE_NAMES, rf_importances):
            # Map column names to descriptive names
            desc = name
            if name == 'PPE':
                desc = "PPE (pitch period entropy)"
            elif name == 'MDVP:Fo(Hz)':
                desc = "MDVP:Fo (fundamental vocal frequency)"
            
            feature_imp_list.append({
                "feature": desc,
                "importance": float(imp)
            })

        # Sort and take top 5
        feature_imp_list.sort(key=lambda x: x["importance"], reverse=True)
        top_5_features = feature_imp_list[:5]

        return {
            "riskScore": risk_score,
            "label": label,
            "modelUsed": model_type,
            "confidence": confidence,
            "features_used": input_data,
            "topFeatures": top_5_features
        }
    except Exception as e:
        print(f"Error during ML prediction: {e}")
        raise e
