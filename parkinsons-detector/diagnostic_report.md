# Clinical Diagnostic Model Evaluation Report
**Date:** 2026-06-28 11:55:26
**Dataset:** parkinsons.data

## Executive Summary
This report evaluates two machine learning models (Random Forest and Support Vector Machine) for the detection of Parkinson's Disease based on vocal acoustic biomarkers. 

## Model 1: Random Forest
--- RANDOM_FOREST Stratified 5-Fold CV Summary ---
Mean Accuracy: 0.8872
Mean Recall / Sensitivity (Target=1): 0.9522

Top 5 Features:
  PPE: 0.1496
  spread1: 0.1135
  MDVP:Fo(Hz): 0.0819
  MDVP:Flo(Hz): 0.0616
  MDVP:Fhi(Hz): 0.0553

## Model 2: Support Vector Machine (RBF Kernel)
--- SVM Stratified 5-Fold CV Summary ---
Mean Accuracy: 0.8718
Mean Recall / Sensitivity (Target=1): 0.9931

Top 5 Features:
  MDVP:Fo(Hz): 0.0400
  spread1: 0.0185
  spread2: 0.0164
  RPDE: 0.0113
  PPE: 0.0092

## Conclusion
The results above highlight the models' capabilities in sensitivity/recall, which is critical for clinical screening to minimize false negatives. The top features indicate the most significant vocal biomarkers contributing to the diagnosis.
