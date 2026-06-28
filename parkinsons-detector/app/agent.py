# ruff: noqa
# Copyright 2026 Google LLC

import os
import pandas as pd
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

# Use the API key from environment variables
api_key = os.environ.get("GEMINI_API_KEY")

def train_and_evaluate_model(filename: str, model_type: str = "random_forest") -> str:
    """Trains a machine learning model on the chosen Parkinson's dataset and returns performance metrics.

    Args:
        filename: The name of the file to train on ('Parkinsson disease.csv' or 'parkinsons.data').
        model_type: The type of model to train ('random_forest', 'svm', or 'xgboost').
    """
    import os
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.svm import SVC
    from sklearn.metrics import classification_report, accuracy_score, recall_score
    try:
        from xgboost import XGBClassifier
    except ImportError:
        XGBClassifier = None

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
    import os
    import numpy as np
    import pandas as pd
    from sklearn.model_selection import StratifiedKFold
    from sklearn.preprocessing import StandardScaler
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.svm import SVC
    from sklearn.inspection import permutation_importance
    from sklearn.metrics import accuracy_score, recall_score
    try:
        from xgboost import XGBClassifier
    except ImportError:
        XGBClassifier = None

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
    import os
    
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
    import os
    from datetime import datetime
    
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
        "the local vocal/clinical datasets located in './data/' to isolate parameters for detecting Parkinson's Disease. "
        "Always invoke the inspect_dataset_schema tool to review the structural schemas of both 'Parkinsson disease.csv' "
        "and 'parkinsons.data' when asked to summarize the datasets."
    ),
    tools=[inspect_dataset_schema, train_and_evaluate_model, cross_validate_and_feature_importance, generate_diagnostic_report, generate_clinical_report],
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
    
    initial_prompt = "Execute the generate_clinical_report tool using 'parkinsons.data' to generate the final diagnostic report."
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
                tools=[inspect_dataset_schema, train_and_evaluate_model, cross_validate_and_feature_importance, generate_diagnostic_report, generate_clinical_report],
                temperature=0.2,
            )
        )
        print(f"Agent:\n{response.text}")
    except Exception as e:
        print(f"Execution Error: {str(e)}")