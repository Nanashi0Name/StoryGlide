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
| **Extraction & embedding** | Watson NLU extracts entities, relations, and sentiment per chunk. IBM Granite fills in implicit relationships and world-state facts. Each chunk is embedded with a Granite embedding model and indexed in Chroma for retrieval. |
| **World-state tracker** | One record per chapter capturing the story world at that point: character statuses, locations, faction control, objects, and events. |
| **Contradiction diff engine** | Walks the ordered world-state records and flags logical conflicts (e.g. a character who died in chapter 4 appearing alive in chapter 15). Uses structured state diffs — not raw LLM comparison — to catch long-range inconsistencies. |
| **Unresolved thread tracker** | Identifies "planted" narrative elements (Chekhov's guns, promises, foreshadowing, unanswered questions) and flags any that are unresolved by the final chapter. |
| **Emotional arc scorer** | Scores each chapter 0–1 for tension and tags a dominant emotion. Plotted as an arc chart with a reference curve overlay. |
| **What-if exploration generator** | Author selects a scope (character death, relationship change, event removal) and a target chapter. Granite generates a short alternate-path sketch and a list of downstream chapters that would need rewriting. |
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
  Extraction & embedding
    ├─ Watson NLU  ──── entities, relations, sentiment per chunk
    ├─ IBM Granite ──── world-state JSON, implicit relationships, threads
    └─ Granite embeddings → Chroma vector store
        │
        ▼
  World-state tracker  ──── per-chapter JSON records in SQLite
        │
        ▼
  Analysis engine
    ├─ Contradiction diff  ──── state-diff logic (structured, not LLM)
    ├─ Thread tracker      ──── cross-reference planted vs resolved elements
    ├─ Arc scorer          ──── tension score + dominant emotion per chapter
    └─ What-if generator   ──── RAG retrieval → Granite generation
        │
        ▼
  Creator dashboard  ──── Next.js 14, Cytoscape.js, Visx
```

### IBM Services Used

| Service | Model / API | Where in code |
|---|---|---|
| **watsonx.ai** | `ibm/granite-3-8b-instruct` | `granite_extractor.py`, `arc_scorer.py`, `whatif_generator.py` |
| **watsonx.ai embeddings** | `ibm/slate-125m-english-rtrvr` | `whatif_generator.py` (Chroma ingestion + query) |
| **Watson Natural Language Understanding** | Entities, relations, sentiment | `nlu_extractor.py` |
| **Chroma** (local vector store) | — | `whatif_generator.py` |

### Key design decision

Contradiction detection operates on **structured state diffs**, not on asking an LLM to compare raw passages. This allows catching long-range inconsistencies (e.g. a location destroyed in chapter 4 being referenced as active in chapter 15) that naive semantic comparison misses.

---

## Selected Challenge Theme

**Create with AI: The Future of Creative Industries** — *"Build solutions that help creators work smarter, explore new forms of expression, and unlock new creative possibilities."*

| Theme phrase | Feature |
|---|---|
| Work smarter | Contradiction diff engine and thread tracker automate work that currently takes hours of manual re-reading. |
| Explore new forms of expression | What-if exploration generator — lets the author generate and compare alternate character/plot paths without rewriting the manuscript. |
| Unlock new creative possibilities | The same world-state model that finds problems also powers safe experimentation with solutions. |

---

## How IBM Bob Was Used

IBM Bob was used as the primary development tool across the entire SDLC — scaffolding, code generation, refactors, and test generation. Every Bob-assisted step is logged in [`docs/bob-usage.md`](docs/bob-usage.md).

Summary of Bob's contributions:
- **Week 1:** Scaffolded the full FastAPI backend and Next.js frontend from scratch; implemented the upload, chunking, and extraction pipeline.
- **Week 2:** Built the world-state tracker, contradiction diff engine, and unresolved-thread tracker.
- **Week 3:** Built the what-if generator, emotional arc scorer, and the full creator dashboard (6 components).
- **Week 4:** Added the `/dashboard` aggregate endpoint, frontend empty states and retry UX, demo seed, and this README.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- IBM Cloud account (for live AI calls — see API Key Setup below)
- `pip install -r backend/requirements.txt`
- `npm install` (inside `frontend/`)

### 1. Backend setup

```bash
cd backend

# Copy and fill in the environment file
cp .env.example .env
# Edit .env — see "API Key Setup" section below

# Run the API server
uvicorn app.main:app --reload --port 8000
```

On first startup the server automatically seeds the demo manuscript in the background (see [Demo](#demo)).

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

### IBM watsonx.ai

1. Sign in to [cloud.ibm.com](https://cloud.ibm.com) (or create a free account).
2. **Create a project:** click "Projects" → "New project" → give it a name.
3. **Get the Project ID:** open the project → "Manage" tab → copy the Project ID.
4. **Get an API key:** click your profile icon (top right) → "Manage access and users" → "API keys" → "Create" → copy the key immediately (it is only shown once).
5. **URL:** `https://us-south.ml.cloud.ibm.com` for the Dallas region (default). Check the watsonx.ai docs if your project is in a different region.

```env
WATSONX_API_KEY=your_key_here
WATSONX_PROJECT_ID=your_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com
```

### Watson Natural Language Understanding

1. In [IBM Cloud Catalog](https://cloud.ibm.com/catalog), search "Natural Language Understanding" → select the **Lite (free)** plan → "Create".
2. Open the NLU instance → "Manage" → copy the **API key** and **URL**.

```env
WATSON_NLU_API_KEY=your_nlu_key_here
WATSON_NLU_URL=https://api.us-south.natural-language-understanding.watson.cloud.ibm.com
```

### Local development without IBM credentials

Set `MOCK_AI=true` in `backend/.env` to run the full pipeline with stub AI responses — no API keys needed. Use `MOCK_AI=false` only for the real demo.

---

## Demo

### Pre-loaded novel

The backend automatically seeds an analysis of [*The Time Machine*](https://www.gutenberg.org/files/35/35-0.txt) (H.G. Wells, public domain) on first startup.

**Manual step:** Download the file and save it before starting the backend:

```
https://www.gutenberg.org/files/35/35-0.txt  →  data/the_time_machine.txt
```

### Demo video

> 📹 **[Watch the demo](#)** *(link to be added before submission)*

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 14 / React 18 / TypeScript | App Router, Tailwind CSS |
| Backend | Python / FastAPI | Async, BackgroundTasks |
| AI — generation | IBM watsonx.ai (Granite) | Extraction, arc scoring, what-if |
| AI — embeddings | IBM watsonx.ai (Slate) | RAG for what-if retrieval |
| AI — NLP | Watson Natural Language Understanding | Entities, relations, sentiment |
| Vector store | Chroma (local) | Chunk embeddings |
| State store | SQLite + SQLAlchemy async | World-state facts, contradiction flags |
| Visualization | Visx + Cytoscape.js | Charts and relationship graph |
| Testing | pytest + MOCK_AI flag | 47 backend tests, zero live API calls |

---

## Submission Checklist

See [`docs/submission-checklist.md`](docs/submission-checklist.md).

---

<p align="center"><sub>Built with <a href="https://www.ibm.com/products/bob">IBM Bob</a> for the AI Builders Challenge</sub></p>
