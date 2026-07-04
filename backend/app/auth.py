from datetime import datetime, timedelta, timezone
from uuid import UUID
from typing import Optional

import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

pwd_context = CryptContext(schemes=["bcrypt"])

# auto_error=False so /screen/csv and /screen/voice can treat auth as optional
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def create_access_token(user_id: UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_expire_days)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.auth_secret, algorithm=JWT_ALGORITHM)


def _decode_token(token: str) -> Optional[UUID]:
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=[JWT_ALGORITHM])
        return UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


def get_current_user(
    token: Optional[str] = Depends(_oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Required auth. Raises 401 if the token is missing, invalid, or the user no longer exists."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_error
    user_id = _decode_token(token)
    if user_id is None:
        raise credentials_error
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_error
    return user


def get_current_user_optional(
    token: Optional[str] = Depends(_oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optional auth for /screen/*: attaches the user if a valid token is present,
    otherwise returns None so screening still works anonymously."""
    if not token:
        return None
    user_id = _decode_token(token)
    if user_id is None:
        return None
    return db.query(User).filter(User.id == user_id).first()
