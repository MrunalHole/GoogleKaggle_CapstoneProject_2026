import os
import glob
from app.agent import train_and_evaluate_model, cross_validate_and_feature_importance

def main():
    results = ["# Local Evaluation Results (Global Harmonized Dataset)\n\n"]
    
    try:
        # Run Random Forest Evaluation
        rf_eval = train_and_evaluate_model(model_type="random_forest")
        results.append("### Random Forest (Train/Test Split)")
        results.append(rf_eval)
        results.append("\n")
        
        # Run SVM Evaluation
        svm_eval = train_and_evaluate_model(model_type="svm")
        results.append("### Support Vector Machine (Train/Test Split)")
        results.append(svm_eval)
        results.append("\n")
        
        # Run Random Forest CV
        rf_cv = cross_validate_and_feature_importance(model_type="random_forest")
        results.append("### Random Forest (5-Fold Group CV & Feature Importance)")
        results.append(rf_cv)
        results.append("\n")
        
        # Run SVM CV
        svm_cv = cross_validate_and_feature_importance(model_type="svm")
        results.append("### Support Vector Machine (5-Fold Group CV & Feature Importance)")
        results.append(svm_cv)
        results.append("\n")
        
    except Exception as e:
        results.append(f"**Error evaluating models:** {str(e)}\n\n")
        
    output_path = "local_eval_results.md"
    with open(output_path, "w") as f:
        f.write("\n".join(results))
        
    print(f"Local evaluation complete. Results written to {output_path}")

if __name__ == "__main__":
    main()
