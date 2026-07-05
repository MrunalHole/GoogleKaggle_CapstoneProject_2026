# Local Evaluation Results (Global Harmonized Dataset)


### Random Forest (Train/Test Split)
--- RANDOM_FOREST Model Performance Summary ---
Overall Accuracy: 0.6951
Recall / Sensitivity (Target=1): 0.8292

Full Classification Report:
              precision    recall  f1-score   support

           0       0.40      0.32      0.35       129
           1       0.77      0.83      0.80       363

    accuracy                           0.70       492
   macro avg       0.59      0.57      0.58       492
weighted avg       0.68      0.70      0.68       492



### Support Vector Machine (Train/Test Split)
--- SVM Model Performance Summary ---
Overall Accuracy: 0.7337
Recall / Sensitivity (Target=1): 0.9890

Full Classification Report:
              precision    recall  f1-score   support

           0       0.33      0.02      0.03       129
           1       0.74      0.99      0.85       363

    accuracy                           0.73       492
   macro avg       0.54      0.50      0.44       492
weighted avg       0.63      0.73      0.63       492



### Random Forest (5-Fold Group CV & Feature Importance)
--- RANDOM_FOREST Stratified 5-Fold CV Summary ---
Mean Accuracy: 0.6882
Mean Recall / Sensitivity (Target=1): 0.8147

Top 5 Features:
  Shimmer_percent: 0.5127
  Jitter_percent: 0.4873


### Support Vector Machine (5-Fold Group CV & Feature Importance)
--- SVM Stratified 5-Fold CV Summary ---
Mean Accuracy: 0.7112
Mean Recall / Sensitivity (Target=1): 0.9880

Top 5 Features:
  Shimmer_percent: 0.0098
  Jitter_percent: -0.0040

