import os
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Load settings from .env file or system environment variables
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    port: int = 5000
    host: str = "127.0.0.1"
    cors_origins: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    database_url: str = "postgresql://postgres:password@localhost:5432/parkinsons"
    gemini_api_key: str = Field(default="", validation_alias="gemini_api_key")

    @property
    def api_key(self) -> str:
        # Fallback to system environment if not defined in .env
        return self.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")

settings = Settings()
