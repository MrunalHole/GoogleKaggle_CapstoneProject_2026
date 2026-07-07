from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

import os

# Create SQLAlchemy database engine
# We attempt to connect to PostgreSQL first. If it is offline, we fall back to SQLite automatically.
try:
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,  # Detect and recover from stale connections automatically
        connect_args={"connect_timeout": 2}  # Keep timeout short to fail fast on startup
    )
    # Test connection
    with engine.connect() as conn:
        pass
    print("[OK] Connected to PostgreSQL database successfully.")
except Exception as e:
    # Use /tmp/parkinsons.db on serverless deployment environments like Vercel, but local file on developer machines.
    sqlite_db_path = "/tmp/parkinsons.db" if os.environ.get("VERCEL") else "parkinsons.db"
    print(f"[WARNING] PostgreSQL connection failed ({e}). Falling back to local SQLite database at: {sqlite_db_path}")
    
    engine = create_engine(
        f"sqlite:///{sqlite_db_path}",
        connect_args={"check_same_thread": False}
    )

# Create a sessionmaker for database operations
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for models
Base = declarative_base()

def get_db():
    """Database session dependency generator for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
