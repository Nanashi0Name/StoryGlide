# StoryGlide
*A flight recorder and flight simulator for your manuscript.*

StoryGlide ingests a full novel and builds a structured, chapter-by-chapter model of the story world. On top of that model it runs a contradiction diff engine, an unresolved-thread tracker, an emotional arc scorer, and a what-if exploration generator — giving authors the structural feedback that currently requires a professional editor.

---

## Problem Statement

Writers — especially novelists working alone — have no fast way to check whether their story is internally consistent, well-paced, and emotionally coherent across tens of thousands of words. Manual continuity tracking (character status, world state, unresolved plot threads) is tedious and error-prone even for professional editors. Existing AI writing tools either generate prose for the author (raising authenticity concerns) or offer shallow grammar/style checking that misses structural and logical issues spanning many chapters.

---

## Solution Description

StoryGlide does not write prose. It diagnoses structural issues and lets the author safely explore alternatives — an analysis and exploration tool, not a ghostwriter.

| Feature | What it does |
|---|---|
| **Manuscript upload & chunking** | Accepts `.txt` and `.docx`. Splits into chapters by heading detection (regex on "Chapter N"), with a 1500-word fallback for un-headed scenes. |
| **Extraction & Analysis** | Google Gemini extracts characters, relationships, sentiment, world-state facts, and plot threads per chapter in a single pass. |
| **World-state tracker** | One record per chapter capturing the story world at that point: character statuses, locations, faction control, objects, and events. |
| **Contradiction diff engine** | Walks the ordered world-state records and flags logical conflicts (e.g. a character who died in chapter 4 appearing alive in chapter 15). Uses structured state diffs — not raw LLM comparison — to catch long-range inconsistencies. |
| **Unresolved thread tracker** | Identifies "planted" narrative elements (Chekhov's guns, promises, foreshadowing, unanswered questions) and flags any that are unresolved by the final chapter. |
| **Emotional arc scorer** | Scores each chapter 0–1 for tension and tags a dominant emotion. Plotted as an arc chart with a reference curve overlay. |
| **What-if exploration generator** | Author selects a scope (character death, relationship change, event removal) and a target chapter. Gemini generates a short alternate-path sketch and a list of downstream chapters that would need rewriting. |
| **Creator dashboard** | Single-page view with 5 tabs: Overview (relationship graph, stat cards), Emotional Arc (line chart + pacing heatmap), Contradictions, Threads, What-If panel. |

---

## AI Approach & Architecture

### Pipeline (5 stages)

```
Manuscript upload (.txt / .docx)
        │
        ▼
  Chapter chunking  ──── regex heading detection, 1500-word fallback
        │
        ▼
  Extraction & formatting
        └─ Google Gemini ──── single-pass JSON extraction (characters, contradictions, threads, world states)
        │
        ▼
  World-state tracker  ──── per-chapter JSON records in SQLite
        │
        ▼
  Analysis engine
        ├─ Contradiction diff  ──── state-diff logic (structured, not LLM)
        ├─ Thread tracker      ──── cross-reference planted vs resolved elements
        ├─ Arc scorer          ──── tension score + dominant emotion per chapter
        └─ What-if generator   ──── full context / RAG query → Gemini generation
        │
        ▼
  Creator dashboard  ──── Next.js 14, Cytoscape.js, Visx
```

### AI Models Used

| Service / Provider | Model / API | Where in code |
|---|---|---|
| **Google Gemini (Default)** | `gemini-3.5-flash` | `extraction_pipeline.py`, `whatif_generator.py` |
| **Google Gemini Embeddings** | `text-embedding-004` | `whatif_generator.py` (Chroma querying) |
| **watsonx.ai (Optional)** | `ibm/granite-4-h-small` | `llm_client.py` (fallback text generation) |
| **watsonx.ai Embeddings (Optional)** | `ibm/slate-125m-english-rtrvr-v2` | `llm_client.py` (fallback embeddings) |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- `pip install -r backend/requirements.txt`
- `npm install` (inside `frontend/`)

### 1. Backend setup

```bash
cd backend

# Copy and fill in the environment file
cp .env.example .env
# Edit .env to add your GEMINI_API_KEY (see "API Key Setup" below)

# Run the API server
uvicorn app.main:app --reload --port 8000
```

On first startup, the server automatically seeds the demo manuscript in the background.

### 2. Frontend setup

```bash
cd frontend

cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
# Set NEXT_PUBLIC_DEMO_MANUSCRIPT_ID= (see below)

npm run dev
# → http://localhost:3000
```

### 3. Setting the demo manuscript ID

After the backend runs once, it writes the demo manuscript ID to `backend/demo_manuscript_id.txt`. Copy that value into `frontend/.env.local`:

```
NEXT_PUBLIC_DEMO_MANUSCRIPT_ID=<paste the ID here>
```

Restart the frontend dev server — a "View demo analysis →" button will appear on the home page.

---

## API Key Setup

### Google Gemini (Default)

1. Get an API key from Google AI Studio.
2. In `backend/.env`, set `GEMINI_API_KEY`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_ID=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL_ID=text-embedding-004
```

### IBM watsonx.ai (Optional Fallback)

If you wish to use the alternative watsonx.ai models:
1. Sign in to [cloud.ibm.com](https://cloud.ibm.com) and create a project.
2. Get the Project ID and API Key, and set them in `backend/.env`:

```env
WATSONX_API_KEY=your_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-4-h-small
```

### Local development without API credentials

Set `MOCK_AI=true` in `backend/.env` to run the full pipeline with stub AI responses — no API keys needed.

---

## Demo

### Pre-loaded manuscript

The backend automatically seeds an analysis of [*The Adventure of the Speckled Band*](https://www.gutenberg.org/ebooks/1661) (Arthur Conan Doyle, public domain) on first startup.

The story file is pre-packaged in the repository at `data/The_Adventure_of_the_Speckled_Band.txt`, so no manual download is required.


---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14 / React 18 / TypeScript | App Router, Tailwind CSS |
| Backend | Python / FastAPI | Async, BackgroundTasks |
| AI — generation | Google Gemini (Gemini 3.5 Flash) | Extraction, pacing/arc scoring, what-if generation |
| AI — embeddings | Google Gemini (text-embedding-004) | Semantic matching for what-if exploration |
| State store | SQLite + SQLAlchemy async | World-state facts, contradiction flags |
| Visualization | Visx + Cytoscape.js | Charts and relationship graph |
| Testing | pytest + MOCK_AI flag | 33 backend tests, zero live API calls |

