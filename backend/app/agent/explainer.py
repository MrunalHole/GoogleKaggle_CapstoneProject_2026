import os
from google import genai
from google.genai import types
from app.config import settings

def get_clinical_explanation(features: dict, risk_score: float, label: str) -> str:
    """Uses Google's Gemini models to translate vocal acoustic metrics into plain English clinical explanations.
    
    If no API key is provided, falls back to a rule-based generator to keep the system fully functional.
    """
    api_key = settings.api_key

    # Check for Gemini API key
    if not api_key:
        print("[WARNING] GEMINI_API_KEY is not configured. Falling back to rule-based explanation.")
        return generate_fallback_explanation(features, risk_score, label)

    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        Provide a clinical explanation for a Parkinson's Disease voice screening run.
        
        Screening Result details:
        - ML Risk Score: {risk_score * 100:.1f}%
        - Classification Label: {label.replace('-', ' ').upper()}
        
        Raw Vocal Acoustic Features:
        - Pitch Period Entropy (PPE): {features.get('PPE', 0.0):.4f} (instability of vocal fold vibration)
        - Jitter (%): {features.get('MDVP:Jitter(%)', 0.0):.4f}% (cycle-to-cycle frequency variation)
        - Shimmer (local): {features.get('MDVP:Shimmer', 0.0):.4f} (cycle-to-cycle amplitude variation)
        - HNR (Harmonics-to-Noise Ratio): {features.get('HNR', 0.0):.1f} dB (ratio of harmonic sound to noise)
        - Fundamental Frequency (Fo): {features.get('MDVP:Fo(Hz)', 0.0):.1f} Hz (mean fundamental vocal frequency)
        - Spread1 (fundamental frequency variation): {features.get('spread1', 0.0):.2f}
        
        Please generate:
        1. An executive clinical summary explaining what the risk score implies.
        2. A breakdown of the primary drivers (especially PPE, Jitter, and Shimmer). Explain what they measure in the human voice and how they relate to motor controls affected by Parkinson's (e.g. vocal fold tension, hoarseness, neuromuscular tremors).
        3. A disclaimer that this screening does not constitute a formal diagnosis and suggests next steps (e.g. consulting a primary care provider or neurologist).
        
        Keep the tone highly professional, compassionate, and clear for a patient or clinician. Use clean markdown formatting.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are a specialized clinical speech-language pathologist and neurologist. "
                    "You translate complex voice acoustics into clear, professional clinical explanations. "
                    "Do not make definitive diagnoses. Always frame results as statistical likelihoods."
                ),
                temperature=0.2,
            )
        )
        return response.text
    except Exception as e:
        print(f"[ERROR] Error invoking Gemini: {e}. Falling back to rule-based explanation.")
        return generate_fallback_explanation(features, risk_score, label)

def generate_fallback_explanation(features: dict, risk_score: float, label: str) -> str:
    """Standard rule-based clinical explanation when Gemini API is unavailable."""
    ppe = features.get('PPE', 0.2)
    jitter = features.get('MDVP:Jitter(%)', 0.005)
    shimmer = features.get('MDVP:Shimmer', 0.03)
    hnr = features.get('HNR', 20.0)

    diagnosis = "elevated indicators" if risk_score >= 0.7 else "moderate indicators" if risk_score >= 0.4 else "low/healthy indicators"

    summary = f"""### Diagnostic Result Summary
The screening model indicates a **{label.replace('-', ' ').title()}** ({risk_score * 100:.1f}% risk score) of Parkinson's Disease vocal indicators. 

### Clinical Metrics Translation:
*   **Pitch Period Entropy (PPE)**: The patient's PPE is **{ppe:.4f}**. PPE measures the voice's instability and inability to maintain a steady pitch. Elevated PPE indicates non-linear, irregular vibrations of the vocal cords, which is a key symptom of Parkinsonian speech changes (dysphonia).
*   **Jitter (Frequency Variation)**: The Jitter value is **{jitter:.4f}%**. Jitter measures the cycle-to-cycle variation in voice pitch. Higher jitter values suggest reduced neuromuscular control over the vocal folds, leading to breathiness or hoarseness.
*   **Shimmer (Amplitude Variation)**: The Shimmer value is **{shimmer:.4f}**. Shimmer measures the cycle-to-cycle variation in vocal loudness. Elevated shimmer indicates incomplete adduction (closing) of the vocal cords, causing an airy, whispered quality.
*   **Harmonics-to-Noise Ratio (HNR)**: The HNR is **{hnr:.1f} dB**. HNR measures the purity of the vocal signal. Lower HNR scores indicate noise (turbulent airflow) replacing clean harmonics, indicating hoarseness.

---
> [!NOTE]
> **Clinical Disclaimer**: This screening is an educational tool based on acoustic research datasets. It is **not a medical diagnosis**. Voice patterns can fluctuate due to common colds, stress, fatigue, or other factors. Please discuss these screening results with a primary care physician or a licensed neurologist.
"""
    return summary
