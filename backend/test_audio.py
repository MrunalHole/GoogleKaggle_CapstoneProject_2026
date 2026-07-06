import sys
from app.ml.audio_features import extract_voice_features
from app.ml.model import DEFAULT_VOICE_BASE, predict_vocal_features, load_and_train_models
load_and_train_models()
features = extract_voice_features("uploads/voice_6faaf8a3fabb410f9864fe960002b96f.webm", DEFAULT_VOICE_BASE)
print("Extracted Features:", features)
pred = predict_vocal_features(features, "random_forest")
print("Prediction:", pred)
