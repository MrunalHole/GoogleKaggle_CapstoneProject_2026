from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session
from app.models import SessionRecord, User

def create_session_record(db: Session, risk_score: float, label: str, model_used: str, confidence: float, features: dict, clinical_explanation: str, voice_file_path: str = None, user_id: Optional[UUID] = None) -> SessionRecord:
    """Inserts a new clinical screening session log into PostgreSQL."""
    db_record = SessionRecord(
        user_id=user_id,
        risk_score=risk_score,
        label=label,
        model_used=model_used,
        confidence=confidence,
        features=features,
        clinical_explanation=clinical_explanation,
        voice_file_path=voice_file_path
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

def get_session_record(db: Session, session_id: UUID) -> SessionRecord:
    """Fetches a specific screening session record by ID."""
    return db.query(SessionRecord).filter(SessionRecord.session_id == session_id).first()

def get_session_records(db: Session, user_id: UUID, skip: int = 0, limit: int = 100):
    """Retrieves the given user's own screening sessions (paginated)."""
    return (
        db.query(SessionRecord)
        .filter(SessionRecord.user_id == user_id)
        .order_by(SessionRecord.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_user(db: Session, email: str, hashed_password: str) -> User:
    db_user = User(email=email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()
