from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # watsonx.ai
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"

    # Watson NLU
    watson_nlu_api_key: str = ""
    watson_nlu_url: str = "https://api.us-south.natural-language-understanding.watson.cloud.ibm.com"

    # App
    database_url: str = "sqlite+aiosqlite:///./storyglide.db"
    mock_ai: bool = False


settings = Settings()
