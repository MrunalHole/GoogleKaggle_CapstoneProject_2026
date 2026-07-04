import glob
import io
import math
import os
import struct
import wave

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


def _sine_wav_bytes(duration_s=1.0, freq=150.0, sample_rate=44100) -> bytes:
    """Builds a minimal mono 16-bit WAV containing a pure tone, so
    /screen/voice has real periodic audio to extract pitch/jitter/shimmer from."""
    n_samples = int(duration_s * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        frames = b"".join(
            struct.pack("<h", int(16000 * math.sin(2 * math.pi * freq * i / sample_rate)))
            for i in range(n_samples)
        )
        wav_file.writeframes(frames)
    return buf.getvalue()


def _cleanup_uploads():
    for f in glob.glob(os.path.join(UPLOAD_DIR, "*")):
        if os.path.basename(f) != ".gitkeep":
            os.remove(f)


def test_read_root(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "online"


def test_screen_csv_valid(client):
    csv_content = (
        "MDVP:Fo(Hz),MDVP:Fhi(Hz),MDVP:Flo(Hz),MDVP:Jitter(%),PPE\n"
        "154.22,197.10,116.32,0.0062,0.21\n"
    )
    files = {"file": ("features.csv", csv_content, "text/csv")}
    res = client.post("/screen/csv", files=files)
    assert res.status_code == 200
    body = res.json()
    assert 0.0 <= body["riskScore"] <= 1.0
    assert body["label"] in {"low-likelihood", "moderate-likelihood", "elevated-likelihood"}
    assert body["modelUsed"] == "random_forest"


def test_screen_csv_empty_rejected(client):
    files = {"file": ("empty.csv", "", "text/csv")}
    res = client.post("/screen/csv", files=files)
    assert res.status_code == 400


def test_screen_voice_extracts_real_features(client):
    try:
        signup = client.post("/auth/signup", json={"email": "voicetest@example.com", "password": "testpass123"})
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

        wav_bytes = _sine_wav_bytes()
        files = {"audio": ("clip.wav", wav_bytes, "audio/wav")}
        res = client.post("/screen/voice", files=files, headers=headers)
        assert res.status_code == 200
        body = res.json()
        assert 0.0 <= body["riskScore"] <= 1.0
        assert body["modelUsed"] == "svm"

        sessions = client.get("/sessions?limit=1", headers=headers).json()
        features = sessions[0]["features"]
        # A pure ~150Hz tone should be picked up close to its true frequency,
        # proving this came from real analysis, not a byte-size-derived fake.
        assert 130 <= features["MDVP:Fo(Hz)"] <= 170
    finally:
        _cleanup_uploads()


def test_screen_voice_rejects_undecodable_audio(client):
    try:
        files = {"audio": ("clip.webm", b"not a real audio file", "audio/webm")}
        res = client.post("/screen/voice", files=files)
        assert res.status_code == 500
    finally:
        _cleanup_uploads()


def test_attachments_upload(client):
    try:
        files = {"file": ("notes.txt", b"clinical notes", "text/plain")}
        res = client.post("/attachments", files=files)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "received"
        assert body["filename"] == "notes.txt"
    finally:
        _cleanup_uploads()


def test_assistant_chat_without_api_key_falls_back(client, monkeypatch):
    # Force the no-key path regardless of the developer's local .env, so this
    # test stays deterministic and never makes a real Gemini API call.
    from app.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", "")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    res = client.post(
        "/assistant/chat",
        json={"messages": [{"role": "user", "content": "What is Parkinson's?"}]},
    )
    assert res.status_code == 200
    assert "GEMINI_API_KEY" in res.json()["reply"]
