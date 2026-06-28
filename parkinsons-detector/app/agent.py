# ruff: noqa
# Copyright 2026 Google LLC

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

# Machine Learning imports for Clinical Explainer
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.inspection import permutation_importance
from sklearn.metrics import classification_report, accuracy_score, recall_score
try:
    from xgboost import XGBClassifier
except ImportError:
    XGBClassifier = None

# Use the API key from environment variables
api_key = os.environ.get("GEMINI_API_KEY")
base_data_path = "./data"

# Global Variables for pre-trained model and scaler
_GLOBAL_MODEL = None
_GLOBAL_SCALER = None
_GLOBAL_FEATURES = None

def _initialize_clinical_model():
    """Trains the SVM dynamically on initialization to provide real decision distances."""
    global _GLOBAL_MODEL, _GLOBAL_SCALER, _GLOBAL_FEATURES
    
    if _GLOBAL_MODEL is not None:
        return
        
    full_path = os.path.join(base_data_path, "parkinsons.data")
    if not os.path.exists(full_path):
        print("Warning: parkinsons.data not found. Clinical model will not be initialized.")
        return
        
    try:
        df = pd.read_csv(full_path, engine='python')
        if 'name' in df.columns:
            df = df.drop(columns=['name'])
        
        X = df.drop(columns=['status'])
        y = df['status']
        _GLOBAL_FEATURES = list(X.columns)
        
        _GLOBAL_SCALER = StandardScaler()
        X_scaled = _GLOBAL_SCALER.fit_transform(X)
        
        # Train SVM with probability support
        _GLOBAL_MODEL = SVC(kernel='rbf', probability=True, random_state=42)
        _GLOBAL_MODEL.fit(X_scaled, y)
    except Exception as e:
        print(f"Error initializing clinical model: {e}")

# Initialize model at module load
_initialize_clinical_model()


def validate_vocal_features(features: dict) -> str:
    """Validates raw vocal feature arrays to prevent model crashes and flag anomalies.
    
    Args:
        features: A dictionary containing vocal metric names as keys and their numeric values.
    """
    if not isinstance(features, dict):
        return "Error: Features must be provided as a dictionary."
        
    warnings = []
    
    if 'MDVP:Fo(Hz)' in features:
        fo = features['MDVP:Fo(Hz)']
        if not (50.0 <= fo <= 400.0):
            warnings.append(f"CRITICAL ANOMALY: MDVP:Fo(Hz) value ({fo}) falls outside the physically possible human vocal boundary (50Hz - 400Hz).")
            
    for key, val in features.items():
        if ('Jitter' in key or 'Shimmer' in key or key == 'PPE') and val < 0:
             warnings.append(f"DATA ERROR: {key} must be a positive value, got {val}.")
             
    if warnings:
        return "Feature Validation Failed:\n" + "\n".join(warnings)
    
    return "Feature Validation Passed: All parameters fall within acceptable physiological bounds."


def clinical_prediction_and_explanation(features: dict) -> str:
    """Calculates probability score for Parkinson's using SVM and translates metrics to clinical explanations.
    
    Args:
        features: A dictionary containing the patient's current vocal metrics.
    """
    global _GLOBAL_MODEL, _GLOBAL_SCALER, _GLOBAL_FEATURES
    
    if _GLOBAL_MODEL is None or _GLOBAL_SCALER is None:
        return "Error: Clinical model was not initialized successfully."
        
    missing = [f for f in _GLOBAL_FEATURES if f not in features]
    if missing:
        return f"Error: Missing required features for prediction: {missing}"
        
    try:
        input_array = np.array([[features[col] for col in _GLOBAL_FEATURES]])
        input_scaled = _GLOBAL_SCALER.transform(input_array)
        
        probability = _GLOBAL_MODEL.predict_proba(input_scaled)[0][1] * 100 
        distance = _GLOBAL_MODEL.decision_function(input_scaled)[0]
        prediction = int(_GLOBAL_MODEL.predict(input_scaled)[0])
        
        diagnosis = "Positive for Parkinson's Disease indicators" if prediction == 1 else "Negative for Parkinson's Disease indicators"
        
        explanation = []
        explanation.append(f"### Diagnostic Result: {diagnosis}")
        explanation.append(f"**Affection Probability Score:** {probability:.2f}%")
        explanation.append(f"**SVM Decision Boundary Distance:** {distance:.4f} (Positive means affected, Negative means healthy)")
        
        explanation.append("\n### Clinical Drivers Translation:")
        
        if 'PPE' in features:
            val = features['PPE']
            explanation.append(f"- **Pitch Period Entropy (PPE)**: The patient's PPE is {val:.4f}. PPE measures the inability to maintain steady phonation. A higher value indicates greater instability and non-linear vocal fold vibrations, which is a classic clinical indicator of Parkinsonian dysphonia.")
            
        if 'MDVP:Jitter(%)' in features:
            val = features['MDVP:Jitter(%)']
            explanation.append(f"- **Jitter**: The patient's Jitter is {val:.4f}%. Jitter measures cycle-to-cycle variations in fundamental frequency. Elevated jitter reflects the lack of neuromuscular control over vocal cord tension, leading to hoarseness or breathiness.")
            
        if 'MDVP:Shimmer' in features:
            val = features['MDVP:Shimmer']
            explanation.append(f"- **Shimmer**: The patient's Shimmer is {val:.4f}. Shimmer measures the cycle-to-cycle variation in vocal amplitude. High shimmer correlates with acoustic breathiness and indicates incomplete vocal fold adduction.")
            
        return "\n".join(explanation)
        
    except Exception as e:
        return f"Error computing clinical prediction: {str(e)}"


def retrieve_patient_history(patient_id: str) -> str:
    """Fetches a patient's historical test sessions from a local JSON database.
    
    Args:
        patient_id: The unique identifier for the patient.
    """
    import os
    import json
    
    db_path = os.path.join("./data", "patient_sessions.json")
    
    if not os.path.exists(db_path):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        mock_data = {
            "PT-10042": {
                "name": "Jane Doe",
                "sessions": [
                    {"date": "2025-11-12", "result": "Negative", "probability": 23.4},
                    {"date": "2026-03-05", "result": "Positive", "probability": 78.1}
                ]
            }
        }
        with open(db_path, "w") as f:
            json.dump(mock_data, f, indent=4)
            
    try:
        with open(db_path, "r") as f:
            data = json.load(f)
            
        if patient_id in data:
            history = data[patient_id]
            report = f"Patient Record Found for ID: {patient_id}\nName: {history.get('name', 'Unknown')}\n\nPast Sessions:\n"
            for session in history.get('sessions', []):
                report += f"- Date: {session.get('date')}, Diagnosis: {session.get('result')}, Probability: {session.get('probability')}%\n"
            return report
        else:
            return f"No historical records found for Patient ID: {patient_id}."
            
    except Exception as e:
        return f"Error retrieving patient history: {str(e)}"


def train_and_evaluate_model(filename: str, model_type: str = "random_forest") -> str:
    """Trains a machine learning model on the chosen Parkinson's dataset and returns performance metrics.

    Args:
        filename: The name of the file to train on ('Parkinsson disease.csv' or 'parkinsons.data').
        model_type: The type of model to train ('random_forest', 'svm', or 'xgboost').
    """
    base_path = "./data"
    full_path = os.path.join(base_path, filename)
    
    if not os.path.exists(full_path):
        return f"Error: File {filename} not found."
        
    try:
        sep = ',' if filename.endswith('.csv') else None
        df = pd.read_csv(full_path, sep=sep, engine='python')
        
        # Clean data: drop identifier string column 'name' if present
        if 'name' in df.columns:
            df = df.drop(columns=['name'])
            
        if 'status' not in df.columns:
            return "Error: 'status' target column not found in dataset."
            
        # Split features and target
        X = df.drop(columns=['status'])
        y = df['status']
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
        
        # Scale features due to varying ranges of vocal frequencies
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Select Classifier
        if model_type == "random_forest":
            model = RandomForestClassifier(random_state=42)
        elif model_type == "svm":
            model = SVC(kernel='rbf', random_state=42)
        elif model_type == "xgboost":
            if XGBClassifier is None:
                return "Error: xgboost package is not installed in the environment."
            model = XGBClassifier(random_state=42, eval_metric='logloss')
        else:
            return f"Error: Model type '{model_type}' not supported."
            
        model.fit(X_train_scaled, y_train)
        preds = model.predict(X_test_scaled)
        
        # Evaluate
        accuracy = accuracy_score(y_test, preds)
        recall = recall_score(y_test, preds) # High sensitivity is our priority constraint
        report = classification_report(y_test, preds)
        
        return (
            f"--- {model_type.upper()} Model Performance Summary ---\n"
            f"Overall Accuracy: {accuracy:.4f}\n"
            f"Recall / Sensitivity (Target=1): {recall:.4f}\n\n"
            f"Full Classification Report:\n{report}"
        )
    except Exception as e:
        return f"Error training model: {str(e)}"
        

def inspect_dataset_schema(filename: str) -> str:
    """Reads a dataset from the local ./data directory and returns its rows, columns, and a sneak peek.

    Args:
        filename: The exact name of the file to inspect (e.g., 'Parkinsson disease.csv' or 'parkinsons.data').
    """
    base_path = "./data"
    full_path = os.path.join(base_path, filename)
    
    if not os.path.exists(full_path):
        return f"Error: File {filename} not found in {base_path}."
    
    try:
        sep = ',' if filename.endswith('.csv') else None
        df = pd.read_csv(full_path, sep=sep, engine='python')
        
        summary = [
            f"\n--- Dataset Summary for {filename} ---",
            f"Shape: {df.shape[0]} rows, {df.shape[1]} columns",
            "\nColumns and Data Types:",
            str(df.dtypes),
            "\nFirst 2 Rows Preview:",
            str(df.head(2))
        ]
        return "\n".join(summary)
    except Exception as e:
        return f"Error reading file {filename}: {str(e)}"


def cross_validate_and_feature_importance(filename: str, model_type: str = "random_forest") -> str:
    """Performs Stratified 5-Fold Cross-Validation on a model and returns metrics and top 5 features.

    Args:
        filename: The name of the file to train on ('Parkinsson disease.csv' or 'parkinsons.data').
        model_type: The type of model to train ('random_forest', 'svm', or 'xgboost').
    """
    base_path = "./data"
    full_path = os.path.join(base_path, filename)
    
    if not os.path.exists(full_path):
        return f"Error: File {filename} not found."
        
    try:
        sep = ',' if filename.endswith('.csv') else None
        df = pd.read_csv(full_path, sep=sep, engine='python')
        
        # Clean data: drop identifier string column 'name' if present
        if 'name' in df.columns:
            df = df.drop(columns=['name'])
            
        if 'status' not in df.columns:
            return "Error: 'status' target column not found in dataset."
            
        # Split features and target
        X = df.drop(columns=['status'])
        y = df['status']
        
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        
        accuracies = []
        recalls = []
        feature_importances_sum = np.zeros(X.shape[1])
        
        for train_index, test_index in skf.split(X, y):
            X_train, X_test = X.iloc[train_index], X.iloc[test_index]
            y_train, y_test = y.iloc[train_index], y.iloc[test_index]
            
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            if model_type == "random_forest":
                model = RandomForestClassifier(random_state=42)
            elif model_type == "svm":
                model = SVC(kernel='rbf', random_state=42)
            elif model_type == "xgboost":
                if XGBClassifier is None:
                    return "Error: xgboost package is not installed in the environment."
                model = XGBClassifier(random_state=42, eval_metric='logloss')
            else:
                return f"Error: Model type '{model_type}' not supported."
                
            model.fit(X_train_scaled, y_train)
            preds = model.predict(X_test_scaled)
            
            accuracies.append(accuracy_score(y_test, preds))
            recalls.append(recall_score(y_test, preds))
            
            if model_type in ["random_forest", "xgboost"]:
                feature_importances_sum += model.feature_importances_
            elif model_type == "svm":
                result = permutation_importance(model, X_test_scaled, y_test, n_repeats=5, random_state=42, n_jobs=-1)
                feature_importances_sum += result.importances_mean
                
        mean_accuracy = np.mean(accuracies)
        mean_recall = np.mean(recalls)
        avg_importances = feature_importances_sum / 5.0
        
        # Get top 5 features
        feat_imp_df = pd.DataFrame({'Feature': X.columns, 'Importance': avg_importances})
        feat_imp_df = feat_imp_df.sort_values(by='Importance', ascending=False).head(5)
        
        top_features_str = "\n".join([f"  {row['Feature']}: {row['Importance']:.4f}" for _, row in feat_imp_df.iterrows()])
        
        return (
            f"--- {model_type.upper()} Stratified 5-Fold CV Summary ---\n"
            f"Mean Accuracy: {mean_accuracy:.4f}\n"
            f"Mean Recall / Sensitivity (Target=1): {mean_recall:.4f}\n\n"
            f"Top 5 Features:\n{top_features_str}"
        )
    except Exception as e:
        return f"Error running cross-validation: {str(e)}"


def generate_diagnostic_report(report_content: str) -> str:
    """Saves a Markdown diagnostic report containing model metrics and top features to the project root.

    Args:
        report_content: The formatted Markdown content comparing the models and their top features.
    """
    file_path = "diagnostic_report.md"
    try:
        with open(file_path, "w") as f:
            f.write("# Parkinson's Disease Diagnostic Report\n\n")
            f.write(report_content)
        return f"Successfully generated diagnostic report at {os.path.abspath(file_path)}"
    except Exception as e:
        return f"Error generating diagnostic report: {str(e)}"


def generate_clinical_report(filename: str = "parkinsons.data") -> str:
    """Executes cross-validation on both models, compiles metrics, and saves a clinical-grade markdown report.
    
    Args:
        filename: The dataset file to use.
    """
    rf_results = cross_validate_and_feature_importance(filename, "random_forest")
    svm_results = cross_validate_and_feature_importance(filename, "svm")
    
    report = f"""# Clinical Diagnostic Model Evaluation Report
**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Dataset:** {filename}

## Executive Summary
This report evaluates two machine learning models (Random Forest and Support Vector Machine) for the detection of Parkinson's Disease based on vocal acoustic biomarkers. 

## Model 1: Random Forest
{rf_results}

## Model 2: Support Vector Machine (RBF Kernel)
{svm_results}

## Conclusion
The results above highlight the models' capabilities in sensitivity/recall, which is critical for clinical screening to minimize false negatives. The top features indicate the most significant vocal biomarkers contributing to the diagnosis.
"""
    
    file_path = "diagnostic_report.md"
    try:
        with open(file_path, "w") as f:
            f.write(report)
        return f"Successfully generated clinical diagnostic report at {os.path.abspath(file_path)}"
    except Exception as e:
        return f"Error generating clinical report: {str(e)}"


# Define the local-first data science agent
root_agent = Agent(
    name="parkinsons_analytics_agent",
    model=Gemini(
        model="gemini-flash-latest",
        api_key=api_key,
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=(
        "You are a specialized biomedical data scientist agent. Your objective is to assist in analyzing "
        "the local vocal/clinical datasets located in './data/' to isolate parameters for detecting Parkinson's Disease.\n"
        "1. Always invoke the inspect_dataset_schema tool to review structural schemas when asked to summarize datasets.\n"
        "2. When assessing a patient session, FIRST use retrieve_patient_history to check for past records.\n"
        "3. Use validate_vocal_features to ensure the incoming vocal metrics are physically possible.\n"
        "4. Finally, use clinical_prediction_and_explanation to generate a probability of affection and translate the vocal metrics (like PPE, Jitter, Shimmer) into a plain English clinical reasoning."
    ),
    tools=[
        inspect_dataset_schema, 
        train_and_evaluate_model, 
        cross_validate_and_feature_importance, 
        generate_diagnostic_report, 
        generate_clinical_report,
        retrieve_patient_history,
        validate_vocal_features,
        clinical_prediction_and_explanation
    ],
)

app = App(
    root_agent=root_agent,
    name="app",
)

# A clean, local terminal interface using the direct Google GenAI SDK
if __name__ == "__main__":
    from google import genai
    
    print("\n🚀 Parkinson's Agent Terminal Local Runtime Initialized.")
    print("Connecting directly to Gemini via AI Studio Key...")
    print("-" * 50)
    
    # Create a simulated vocal vector dict that fits the schema of parkinsons.data
    # This represents real raw acoustic features gathered from a patient app
    simulated_features = {
        'MDVP:Fo(Hz)': 119.992,
        'MDVP:Fhi(Hz)': 157.302,
        'MDVP:Flo(Hz)': 74.997,
        'MDVP:Jitter(%)': 0.00784,
        'MDVP:Jitter(Abs)': 0.00007,
        'MDVP:RAP': 0.0037,
        'MDVP:PPQ': 0.00554,
        'Jitter:DDP': 0.01109,
        'MDVP:Shimmer': 0.04374,
        'MDVP:Shimmer(dB)': 0.426,
        'Shimmer:APQ3': 0.02182,
        'Shimmer:APQ5': 0.0313,
        'MDVP:APQ': 0.02971,
        'Shimmer:DDA': 0.06545,
        'NHR': 0.02211,
        'HNR': 21.033,
        'RPDE': 0.414783,
        'DFA': 0.815285,
        'spread1': -4.813031,
        'spread2': 0.266482,
        'D2': 2.301442,
        'PPE': 0.284654
    }
    
    initial_prompt = (
        f"Hi Agent, I have a patient here with ID 'PT-10042'. Please check their history first. "
        f"Then, run a safety validation on these raw vocal features: {json.dumps(simulated_features)}. "
        f"If they pass validation, please run the clinical prediction to give me their affection probability score "
        f"and explain what their PPE and Jitter values imply clinically."
    )
    
    print(f"\nUser: {initial_prompt}\n")
    
    try:
        # Initialize a direct standard client using your environment variable key
        client = genai.Client(api_key=api_key)
        
        # Standard SDK generation with tool calling enabled natively
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=initial_prompt,
            config=types.GenerateContentConfig(
                system_instruction=root_agent.instruction,
                tools=root_agent.tools,
                temperature=0.2,
            )
        )
        print(f"Agent:\n{response.text}")
    except Exception as e:
        print(f"Execution Error: {str(e)}")