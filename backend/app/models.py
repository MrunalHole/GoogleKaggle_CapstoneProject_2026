import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, JSON, UUID, ForeignKey
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class SessionRecord(Base):
    __tablename__ = "sessions"

    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Nullable: screening works without login. Existing rows predate this column
    # and stay anonymous (NULL) -- not backfilled.
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    risk_score = Column(Float, nullable=False)
    label = Column(String(50), nullable=False)  # "low-likelihood", "moderate-likelihood", "elevated-likelihood"
    model_used = Column(String(50), nullable=False)  # "random_forest", "svm", etc.
    confidence = Column(Float, nullable=False)
    voice_file_path = Column(String(255), nullable=True)
    csv_file_path = Column(String(255), nullable=True)
    attachments = Column(JSON, nullable=True)
    # Using JSONB for PostgreSQL performance and indexing, falling back to standard JSON on SQLite (for tests)
    features = Column(JSON, nullable=False)
    clinical_explanation = Column(Text, nullable=False)
