import sys
from app.ml.model import predict_vocal_features, load_and_train_models
load_and_train_models()
clean_features = {
    'MDVP:Fo(Hz)': 200.0,
    'MDVP:Fhi(Hz)': 250.0,
    'MDVP:Flo(Hz)': 180.0,
    'MDVP:Jitter(%)': 0.001,
    'MDVP:Jitter(Abs)': 0.00001,
    'MDVP:RAP': 0.0005,
    'MDVP:PPQ': 0.0005,
    'Jitter:DDP': 0.0015,
    'MDVP:Shimmer': 0.01,
    'MDVP:Shimmer(dB)': 0.1,
    'Shimmer:APQ3': 0.005,
    'Shimmer:APQ5': 0.005,
    'MDVP:APQ': 0.01,
    'Shimmer:DDA': 0.015,
    'NHR': 0.005,
    'HNR': 28.0
}
pred = predict_vocal_features(clean_features, "random_forest")
print("Clean Prediction:", pred)
