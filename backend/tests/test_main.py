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
    assert 0.0 <= body["likelihood_score"] <= 1.0
    assert "probability" in body["percentage_chance"]


def test_screen_csv_empty_rejected(client):
    files = {"file": ("empty.csv", "", "text/csv")}
    res = client.post("/screen/csv", files=files)
    assert res.status_code == 400


def test_screen_voice_extracts_real_features(client):
    try:
        signup = client.post("/auth/signup", json={
            "email": "voicetest@example.com",
            "password": "testpass123",
            "relative_name": "John Doe",
            "relative_relation": "Son",
            "relative_contact": "relative@example.com",
            "doctor_name": "Dr. Jenkins",
            "doctor_contact": "jenkins@example.com"
        })
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

        wav_bytes = _sine_wav_bytes()
        files = {"audio": ("clip.wav", wav_bytes, "audio/wav")}
        res = client.post("/screen/voice", files=files, headers=headers)
        assert res.status_code == 200
        body = res.json()
        assert 0.0 <= body["likelihood_score"] <= 1.0

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


def test_attachments_rejects_unsupported_extension(client):
    try:
        files = {"file": ("clip.mov", b"fake video bytes", "video/quicktime")}
        res = client.post("/attachments", files=files)
        assert res.status_code == 400
        assert ".mov" in res.json()["detail"]
    finally:
        _cleanup_uploads()


def test_attachments_accepts_mp3_as_reference_material(client):
    try:
        files = {"file": ("voice_note.mp3", b"fake mp3 bytes", "audio/mpeg")}
        res = client.post("/attachments", files=files)
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "received"
        assert body["filename"] == "voice_note.mp3"
    finally:
        _cleanup_uploads()


def test_attachments_rejects_oversized_file(client):
    try:
        from app.main import MAX_ATTACHMENT_SIZE_BYTES
        oversized = b"0" * (MAX_ATTACHMENT_SIZE_BYTES + 1)
        files = {"file": ("scan.pdf", oversized, "application/pdf")}
        res = client.post("/attachments", files=files)
        assert res.status_code == 400
        assert "size limit" in res.json()["detail"]
        # confirm no partial file was left on disk
        assert glob.glob(os.path.join(UPLOAD_DIR, "*.pdf")) == []
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


def test_delete_attachment(client):
    try:
        # Upload attachment first
        files = {"file": ("test_delete.txt", b"to be deleted", "text/plain")}
        res = client.post("/attachments", files=files)
        assert res.status_code == 200
        att_id = res.json()["id"]

        # Confirm file exists on disk
        import glob
        pattern = os.path.join(UPLOAD_DIR, f"doc_{att_id}.*")
        assert len(glob.glob(pattern)) == 1

        # Delete it
        del_res = client.delete(f"/attachments/{att_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # Confirm file is gone from disk
        assert len(glob.glob(pattern)) == 0
    finally:
        _cleanup_uploads()


def test_delete_session(client):
    try:
        # Create user
        email = "deletetest@example.com"
        signup = client.post("/auth/signup", json={
            "email": email,
            "password": "testpass123",
            "relative_name": "John Doe",
            "relative_relation": "Son",
            "relative_contact": "relative@example.com",
            "doctor_name": "Dr. Jenkins",
            "doctor_contact": "jenkins@example.com"
        })
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

        # Upload a voice clip
        wav_bytes = _sine_wav_bytes()
        files = {"audio": ("clip.wav", wav_bytes, "audio/wav")}
        res = client.post("/screen/voice", files=files, headers=headers)
        assert res.status_code == 200

        # Retrieve session
        sessions = client.get("/sessions?limit=1", headers=headers).json()
        assert len(sessions) == 1
        session_id = sessions[0]["session_id"]
        voice_file_path = sessions[0]["voice_file_path"]

        # Verify voice file exists
        assert os.path.exists(voice_file_path)

        # Delete session
        del_res = client.delete(f"/sessions/{session_id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # Verify voice file is deleted from disk
        assert not os.path.exists(voice_file_path)

        # Verify session is gone from database
        sessions_after = client.get("/sessions", headers=headers).json()
        assert len(sessions_after) == 0
    finally:
        _cleanup_uploads()


def test_notifications_and_sharing(client):
    try:
        # 1. Signup user with relative & doctor details
        signup_payload = {
            "email": "notif_test@example.com",
            "password": "testpass123",
            "relative_name": "Jane Relative",
            "relative_relation": "Daughter",
            "relative_contact": "jane.relative@example.com",
            "doctor_name": "Dr. Sarah Jenkins",
            "doctor_contact": "sarah.jenkins@nyclinic.com",
            "user_location": "New York"
        }
        signup = client.post("/auth/signup", json=signup_payload)
        assert signup.status_code == 200
        headers = {"Authorization": f"Bearer {signup.json()['access_token']}"}

        # 2. Run a voice screening
        wav_bytes = _sine_wav_bytes()
        files = {"audio": ("clip.wav", wav_bytes, "audio/wav")}
        res = client.post("/screen/voice", files=files, headers=headers)
        assert res.status_code == 200
        
        # 3. Retrieve notifications list
        notifs_res = client.get("/notifications", headers=headers)
        assert notifs_res.status_code == 200
        
        # 4. Manually share report with doctor
        sessions = client.get("/sessions", headers=headers).json()
        assert len(sessions) > 0
        session_id = sessions[0]["session_id"]
        
        share_payload = {
            "symptom_entries": [
                {"date": "2026-07-06", "tremor": 3, "stiffness": 4, "balance": 2, "mood": 5, "sleepQuality": 6, "notes": "Felt ok"}
            ]
        }
        share_res = client.post(f"/sessions/{session_id}/share", json=share_payload, headers=headers)
        assert share_res.status_code == 200
        assert "shared with Dr. Sarah Jenkins" in share_res.json()["message"]

        # 5. Fetch notifications again and confirm it has a doctor share log
        notifs_after_res = client.get("/notifications", headers=headers)
        assert notifs_after_res.status_code == 200
        notifs_after = notifs_after_res.json()
        assert len(notifs_after) > 0
        
        doctor_notifs = [n for n in notifs_after if n["recipient_type"] == "doctor"]
        assert len(doctor_notifs) > 0
        assert doctor_notifs[0]["recipient_name"] == "Dr. Sarah Jenkins"
        assert "Patient shared report" in doctor_notifs[0]["message"]
        
        # 6. Retrieve single session by id
        single_sess_res = client.get(f"/sessions/{session_id}", headers=headers)
        assert single_sess_res.status_code == 200
        assert single_sess_res.json()["session_id"] == session_id

    finally:
        _cleanup_uploads()

