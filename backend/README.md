# StoryGlide — Backend

Python FastAPI backend for the StoryGlide manuscript analysis engine.

Please refer to the main [README.md](../README.md) in the root of the project for setup instructions, prerequisites, running backend/frontend servers, running tests, and API keys.

## Quick Start

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # Fill in your GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

API documentation is available locally at http://localhost:8000/docs when the server is running.

