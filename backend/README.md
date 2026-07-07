# StoryGlide — Backend

Python FastAPI backend for the StoryGlide manuscript analysis engine.

## Quick start

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # fill in your IBM credentials
uvicorn app.main:app --reload
```

API docs available at http://localhost:8000/docs

## Environment variables

| Variable | Description |
|---|---|
| `WATSONX_API_KEY` | IBM watsonx.ai API key |
| `WATSONX_PROJECT_ID` | watsonx.ai project ID |
| `WATSONX_URL` | watsonx.ai endpoint (default: us-south) |
| `WATSON_NLU_API_KEY` | Watson NLU API key |
| `WATSON_NLU_URL` | Watson NLU endpoint |
| `DATABASE_URL` | SQLAlchemy async DB URL (default: SQLite) |
| `MOCK_AI` | Set `true` to use stubs instead of live IBM APIs |

## Running tests

```bash
MOCK_AI=true pytest
```
