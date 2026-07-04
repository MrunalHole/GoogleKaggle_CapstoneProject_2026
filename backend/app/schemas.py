from datetime import datetime
from uuid import UUID
from typing import List, Literal, Dict, Optional
from pydantic import BaseModel, Field

class VoiceFeatureScore(BaseModel):
    feature: str
    importance: float

class ScreeningResult(BaseModel):
    riskScore: float = Field(..., description="0-1 probability-style score, NOT a diagnosis")
    label: Literal["low-likelihood", "moderate-likelihood", "elevated-likelihood"]
    modelUsed: Literal["random_forest", "svm", "ensemble"]
    topFeatures: List[VoiceFeatureScore]
    confidence: float
    disclaimer: str

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
    features: Dict[str, float]
    clinical_explanation: str

    class Config:
        from_attributes = True
