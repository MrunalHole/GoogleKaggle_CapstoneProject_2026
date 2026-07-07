from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session
from app.models import SessionRecord, User

def create_session_record(db: Session, risk_score: float, label: str, model_used: str, confidence: float, features: dict, clinical_explanation: str, voice_file_path: str = None, csv_file_path: str = None, attachments: list = None, user_id: Optional[UUID] = None) -> SessionRecord:
    """Inserts a new clinical screening session log into PostgreSQL."""
    db_record = SessionRecord(
        user_id=user_id,
        risk_score=risk_score,
        label=label,
        model_used=model_used,
        confidence=confidence,
        features=features,
        clinical_explanation=clinical_explanation,
        voice_file_path=voice_file_path,
        csv_file_path=csv_file_path,
        attachments=attachments
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

from app.models import SessionRecord, User, Notification

def create_user(db: Session, email: str, hashed_password: str, relative_name: str, relative_relation: str, relative_contact: str, doctor_name: str, doctor_contact: str, user_location: str = None) -> User:
    db_user = User(
        email=email,
        hashed_password=hashed_password,
        relative_name=relative_name,
        relative_relation=relative_relation,
        relative_contact=relative_contact,
        doctor_name=doctor_name,
        doctor_contact=doctor_contact,
        user_location=user_location
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def create_notification(db: Session, user_id: UUID, session_id: Optional[UUID], recipient_type: str, recipient_name: str, recipient_contact: str, message: str, status: str = "sent") -> Notification:
    db_notification = Notification(
        user_id=user_id,
        session_id=session_id,
        recipient_type=recipient_type,
        recipient_name=recipient_name,
        recipient_contact=recipient_contact,
        message=message,
        status=status
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return db_notification

def get_notifications_by_user(db: Session, user_id: UUID, limit: int = 50):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.sent_at.desc())
        .limit(limit)
        .all()
    )

