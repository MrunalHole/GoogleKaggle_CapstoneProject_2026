import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, JSON, UUID
from app.database import Base

class SessionRecord(Base):
    __tablename__ = "sessions"

    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(DateTime, default=datetime.utcnow, nullable=False)
    risk_score = Column(Float, nullable=False)
    label = Column(String(50), nullable=False)  # "low-likelihood", "moderate-likelihood", "elevated-likelihood"
    model_used = Column(String(50), nullable=False)  # "random_forest", "svm", etc.
    confidence = Column(Float, nullable=False)
    voice_file_path = Column(String(255), nullable=True)
    # Using JSONB for PostgreSQL performance and indexing, falling back to standard JSON on SQLite (for tests)
    features = Column(JSON, nullable=False)
    clinical_explanation = Column(Text, nullable=False)
