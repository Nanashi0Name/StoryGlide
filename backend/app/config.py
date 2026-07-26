import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = os.path.join(Path(__file__).resolve().parent.parent, ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # watsonx.ai
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    watsonx_model_id: str = "ibm/granite-4-h-small"

    # Watson NLU
    watson_nlu_api_key: str = ""
    watson_nlu_url: str = "https://api.us-south.natural-language-understanding.watson.cloud.ibm.com"

    # Gemini
    gemini_api_key: str = ""
    gemini_model_id: str = "gemini-3.5-flash"
    gemini_embedding_model_id: str = "text-embedding-004"

    # App
    database_url: str = "sqlite+aiosqlite:///./storyglide.db"
    mock_ai: bool = False
    skip_nlu: bool = False


settings = Settings()
