def test_signup_creates_user_and_returns_token(client):
    res = client.post("/auth/signup", json={"email": "new@example.com", "password": "password123"})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


def test_signup_duplicate_email_rejected(client):
    client.post("/auth/signup", json={"email": "dup@example.com", "password": "password123"})
    res = client.post("/auth/signup", json={"email": "dup@example.com", "password": "differentpass"})
    assert res.status_code == 409


def test_signup_password_too_short_rejected(client):
    res = client.post("/auth/signup", json={"email": "short@example.com", "password": "abc123"})
    assert res.status_code == 422


def test_login_correct_password(client):
    client.post("/auth/signup", json={"email": "login@example.com", "password": "correctpass123"})
    res = client.post("/auth/login", json={"email": "login@example.com", "password": "correctpass123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_incorrect_password_rejected(client):
    client.post("/auth/signup", json={"email": "login2@example.com", "password": "correctpass123"})
    res = client.post("/auth/login", json={"email": "login2@example.com", "password": "wrongpassword"})
    assert res.status_code == 401


def test_login_unknown_email_rejected(client):
    res = client.post("/auth/login", json={"email": "nobody@example.com", "password": "whatever123"})
    assert res.status_code == 401


def test_me_with_valid_token(client):
    signup = client.post("/auth/signup", json={"email": "me@example.com", "password": "password123"})
    token = signup.json()["access_token"]
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


def test_me_without_token_rejected(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_with_garbage_token_rejected(client):
    res = client.get("/auth/me", headers={"Authorization": "Bearer not.a.real.token"})
    assert res.status_code == 401


def test_sessions_requires_auth(client):
    res = client.get("/sessions")
    assert res.status_code == 401


def test_sessions_scoped_to_own_user_only(client):
    csv_content = "MDVP:Fo(Hz),MDVP:Fhi(Hz),MDVP:Flo(Hz),PPE\n154.22,197.10,116.32,0.21\n"

    signup_a = client.post("/auth/signup", json={"email": "usera@example.com", "password": "password123"})
    token_a = signup_a.json()["access_token"]
    signup_b = client.post("/auth/signup", json={"email": "userb@example.com", "password": "password123"})
    token_b = signup_b.json()["access_token"]

    client.post("/screen/csv", files={"file": ("f.csv", csv_content, "text/csv")}, headers={"Authorization": f"Bearer {token_a}"})
    client.post("/screen/csv", files={"file": ("f.csv", csv_content, "text/csv")}, headers={"Authorization": f"Bearer {token_b}"})

    sessions_a = client.get("/sessions", headers={"Authorization": f"Bearer {token_a}"}).json()
    sessions_b = client.get("/sessions", headers={"Authorization": f"Bearer {token_b}"}).json()

    assert len(sessions_a) == 1
    assert len(sessions_b) == 1
    assert sessions_a[0]["session_id"] != sessions_b[0]["session_id"]


def test_anonymous_screening_still_works_without_token(client):
    csv_content = "MDVP:Fo(Hz),MDVP:Fhi(Hz),MDVP:Flo(Hz),PPE\n154.22,197.10,116.32,0.21\n"
    res = client.post("/screen/csv", files={"file": ("f.csv", csv_content, "text/csv")})
    assert res.status_code == 200
