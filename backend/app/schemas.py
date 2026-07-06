from datetime import datetime
from uuid import UUID
from typing import List, Literal, Dict, Optional
from pydantic import BaseModel, Field, EmailStr

class VoiceFeatureScore(BaseModel):
    feature: str
    importance: float

class ScreeningResult(BaseModel):
    likelihood_score: float
    percentage_chance: str
    intensity_level: str
    model_accuracy: str
    feature_importances: Dict[str, float]
    clinical_disclaimer: str

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class AssistantChatRequest(BaseModel):
    messages: List[ChatMessage]

class AssistantChatResponse(BaseModel):
    reply: str

class AttachmentResponse(BaseModel):
    id: str
    filename: str
    status: Literal["received"]

class SessionDetailResponse(BaseModel):
    session_id: UUID
    date: datetime
    risk_score: float
    label: str
    model_used: str
    confidence: float
    voice_file_path: Optional[str]
    voice_url: Optional[str] = None
    csv_file_path: Optional[str] = None
    csv_url: Optional[str] = None
    attachments: Optional[List[Dict[str, str]]] = None
    features: Dict[str, float]
    clinical_explanation: str

    class Config:
        from_attributes = True

class UserSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
