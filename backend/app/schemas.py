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
    relative_name: str = Field(..., min_length=1, description="Relative's name")
    relative_relation: str = Field(..., min_length=1, description="Relation (e.g. son, daughter)")
    relative_contact: str = Field(..., min_length=1, description="Relative's contact email or phone")
    doctor_name: str = Field(..., min_length=1, description="Doctor's name")
    doctor_contact: str = Field(..., min_length=1, description="Doctor's contact email or phone")
    user_location: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    relative_name: Optional[str] = None
    relative_relation: Optional[str] = None
    relative_contact: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_contact: Optional[str] = None
    user_location: Optional[str] = None

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: UUID
    recipient_type: str
    recipient_name: str
    recipient_contact: str
    message: str
    sent_at: datetime
    status: str

    class Config:
        from_attributes = True

class ShareReportRequest(BaseModel):
    symptom_entries: List[Dict]


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
