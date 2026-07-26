import os
import json
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

def generate_text(
    prompt: str,
    provider: str,
    max_new_tokens: int = 1024,
    temperature: float = 0.0,
    response_schema: dict | None = None,
    force_live: bool = False,
) -> str:
    """Generate text using either watsonx or gemini provider."""
    if settings.mock_ai and not force_live:
        return ""  # Handled by stubs, but fallback safely

    if provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model_id}:generateContent?key={settings.gemini_api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_new_tokens,
            }
        }
        
        # Enable JSON mode if prompt expects structured output
        if response_schema or "json" in prompt.lower() or "schema" in prompt.lower():
            payload["generationConfig"]["responseMimeType"] = "application/json"
            if response_schema:
                payload["generationConfig"]["responseSchema"] = response_schema

        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                logger.error("Gemini API error: %s - %s", resp.status_code, resp.text)
                resp.raise_for_status()
            data = resp.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text
            except (KeyError, IndexError) as e:
                logger.error("Failed to parse Gemini response: %s", data)
                raise ValueError("Invalid Gemini API response structure") from e

    else:  # watsonx
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference

        credentials = Credentials(
            url=settings.watsonx_url,
            api_key=settings.watsonx_api_key,
        )
        model = ModelInference(
            model_id=settings.watsonx_model_id or "ibm/granite-4-h-small",
            credentials=credentials,
            project_id=settings.watsonx_project_id,
            params={"max_new_tokens": max_new_tokens, "temperature": temperature},
        )
        return model.generate_text(prompt=prompt)


def generate_embedding(text: str, provider: str) -> list[float]:
    """Generate embedding using either watsonx or gemini provider."""
    if provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_embedding_model_id}:embedContent?key={settings.gemini_api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "content": {"parts": [{"text": text}]}
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                logger.error("Gemini Embedding API error: %s - %s", resp.status_code, resp.text)
                resp.raise_for_status()
            data = resp.json()
            try:
                return data["embedding"]["values"]
            except KeyError as e:
                logger.error("Failed to parse Gemini embedding: %s", data)
                raise ValueError("Invalid Gemini embedding response structure") from e
    else:  # watsonx
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference

        credentials = Credentials(
            url=settings.watsonx_url,
            api_key=settings.watsonx_api_key,
        )
        embed_model = ModelInference(
            model_id="ibm/slate-125m-english-rtrvr-v2",
            credentials=credentials,
            project_id=settings.watsonx_project_id,
        )
        raw_embed = embed_model.generate_embeddings(
            input=text,
            params={"return_tokens": False},
        )
        return raw_embed["results"][0]["embedding"]
