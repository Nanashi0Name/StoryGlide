# StoryGlide — Week 1 Foundation Plan

## Top-Level Overview

**Goal:** Establish the full-stack scaffold for StoryGlide and get the first end-to-end pipeline working: a user uploads a manuscript, the text is split into chapters, Watson NLU + watsonx.ai Granite extract entities, and the result is returned as a structured character list stored in SQLite.

**Scope:**
- Scaffold the Next.js (frontend) and FastAPI (backend) projects
- Set up project configuration, environment variables, and tooling
- Set up SQLite database (persists manuscripts, chapters, and extracted characters)
- Implement manuscript upload and chapter chunking
- Connect to watsonx.ai (Granite) and Watson NLU; extraction runs as an async background task
- Support `MOCK_AI=true` env var for local development without live IBM credentials
- Return a manuscript ID on upload; client polls `GET /api/manuscripts/{id}/status`; result available via `GET /api/manuscripts/{id}/characters`

**Non-Goals (deferred to Week 2+):**
- World-state tracker (full §6.2 schema)
- Contradiction diff engine
- Unresolved thread tracker
- Emotional arc scorer
- What-if generator
- Full dashboard UI

**Key Design Decisions:**
- SQLite with JSON columns in Week 1 (upgradable to Postgres in Week 2+)
- Async processing via FastAPI `BackgroundTasks` — `POST /api/manuscripts` returns `{ manuscript_id, status: "processing" }` immediately
- `MOCK_AI=true` stubs both Watson NLU and Granite calls for offline development

**Deliverable:** Raw text → structured character list, working end-to-end via API.

---

## Sub-Tasks

### Sub-Task 1 — Backend scaffold (FastAPI)

**Intent:** Create the Python FastAPI project with a clean layout, dependency management, environment config, and a health-check endpoint. This is the foundation everything else runs on.

**Expected Outcomes:**
- `backend/` has a runnable FastAPI app (`uvicorn backend.main:app`)
- `GET /health` returns `{"status": "ok"}`
- `pyproject.toml` (or `requirements.txt`) lists all dependencies
- `.env.example` documents all required environment variables

**Todo List:**
1. Create `backend/` project layout:
   ```
   backend/
   ├── app/
   │   ├── __init__.py
   │   ├── main.py          # FastAPI app, mounts routers
   │   ├── config.py        # Pydantic settings, reads .env
   │   ├── database.py      # SQLite setup via SQLAlchemy
   │   ├── models/
   │   │   └── __init__.py
   │   ├── routers/
   │   │   └── __init__.py
   │   └── services/
   │       └── __init__.py
   ├── requirements.txt
   ├── .env.example
   └── README.md
   ```
2. Add dependencies: `fastapi`, `uvicorn[standard]`, `python-multipart`, `python-dotenv`, `pydantic-settings`, `ibm-watsonx-ai`, `ibm-watson`, `langchain`, `chromadb`, `python-docx`, `sqlalchemy`, `aiosqlite`, `pytest`, `httpx`
3. Implement `config.py` using Pydantic `BaseSettings` to load: `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_URL`, `WATSON_NLU_API_KEY`, `WATSON_NLU_URL`, `MOCK_AI` (bool, default `false`), `DATABASE_URL` (default `sqlite:///./storyglide.db`)
4. Implement `database.py` with SQLAlchemy async engine + `Base` for declarative models; `create_all_tables()` called on startup
5. Implement `main.py` with `GET /health` endpoint and startup event calling `create_all_tables()`
6. Create `.env.example` with all variable names (no values)

**Relevant Context:**
- Guide §3.3 — tech stack choices
- Guide §7 — API endpoint list

**Status:** [x] done

---

### Sub-Task 2 — Frontend scaffold (Next.js)

**Intent:** Create the Next.js 14 (App Router) project with TypeScript, Tailwind CSS, and a minimal layout. Provides the upload UI foundation needed for Week 1 deliverable and the dashboard skeleton for Week 3.

**Expected Outcomes:**
- `frontend/` has a runnable Next.js dev server (`npm run dev`)
- Home page renders a simple upload form (file input + submit button)
- Tailwind CSS configured and working
- `NEXT_PUBLIC_API_URL` env var configured to point at the FastAPI backend

**Todo List:**
1. Scaffold Next.js 14 app with TypeScript and Tailwind CSS in `frontend/`
2. Create project layout:
   ```
   frontend/
   ├── app/
   │   ├── layout.tsx
   │   ├── page.tsx         # Upload form
   │   └── globals.css
   ├── components/
   │   └── UploadForm.tsx
   ├── lib/
   │   └── api.ts           # Typed fetch wrappers
   ├── .env.local.example
   ├── next.config.ts
   └── package.json
   ```
3. Implement `UploadForm.tsx`: file input (accept `.txt,.docx`), upload button, loading state, raw JSON result display
4. Implement `lib/api.ts`: `uploadManuscript(file: File)` calling `POST /api/manuscripts`
5. Wire `UploadForm` into `app/page.tsx`

**Relevant Context:**
- Guide §5.1 — accepted file types: `.txt`, `.docx`
- Guide §5.8 — dashboard is the primary demo surface (keep layout extensible)

**Status:** [x] done

---

### Sub-Task 3 — Manuscript upload & chapter chunking (backend)

**Intent:** Implement the `POST /api/manuscripts` endpoint. Accept `.txt` and `.docx`, parse the text, split into chapters using heading detection (regex on "Chapter N") with a 1500-word fallback, and return a list of chapter chunks with stable IDs.

**Expected Outcomes:**
- `POST /api/manuscripts` accepts a multipart file upload and returns `{ manuscript_id, status: "processing" }` immediately
- A SQLite `manuscripts` table stores: `id`, `filename`, `status`, `created_at`
- A SQLite `chapters` table stores: `id`, `manuscript_id`, `chapter_id`, `title`, `word_count`, `text`
- `GET /api/manuscripts/{id}/status` returns current status: `"processing"` | `"chunked"` | `"extracting"` | `"done"` | `"error"`
- `.txt` and `.docx` both parse correctly
- Heading detection handles "Chapter 1", "CHAPTER ONE", "Chapter I" etc.
- Fallback splits on ~1500 words when no headings found

**Todo List:**
1. Create SQLAlchemy ORM models in `app/models/manuscript.py`: `Manuscript` and `Chapter` tables
2. Create `app/services/chunker.py`:
   - `parse_text(file_bytes, filename) -> str` — handles `.txt` (decode UTF-8) and `.docx` (python-docx)
   - `split_into_chapters(text: str) -> list[ChapterChunk]` — regex heading detection, 1500-word fallback
3. Define `ChapterChunk` Pydantic model: `chapter_id`, `title`, `word_count`, `text`
4. Create `app/routers/manuscripts.py`:
   - `POST /api/manuscripts` — saves `Manuscript` row, enqueues background task, returns `{ manuscript_id, status: "processing" }`
   - `GET /api/manuscripts/{id}/status` — reads status from DB
5. Mount `manuscripts` router in `main.py`

**Relevant Context:**
- Guide §5.1 — chunking rules and file types
- Guide §6.2 — `chapter_id` is a key foreign reference across all data models

**Status:** [x] done

---

### Sub-Task 4 — Watson NLU + watsonx.ai Granite integration

**Intent:** Connect to both IBM AI services and implement the extraction layer. For each chapter chunk, call Watson NLU for entities/relations/sentiment, then call Granite to fill in implicit relationships. Return a structured character list per the §6.1 data model.

**Expected Outcomes:**
- `app/services/nlu_extractor.py` calls Watson NLU on chapter text; when `MOCK_AI=true`, returns a hardcoded stub response
- `app/services/granite_extractor.py` calls `ibm/granite-3-8b-instruct`; when `MOCK_AI=true`, returns a hardcoded stub response
- Extraction runs inside the FastAPI `BackgroundTasks` callback kicked off by `POST /api/manuscripts`; DB status progresses: `"processing"` → `"extracting"` → `"done"` (or `"error"`)
- Extracted characters are stored in a SQLite `characters` JSON column on the `Manuscript` row (upgraded to a proper table in Week 2)
- `GET /api/manuscripts/{id}/characters` returns the §6.1 character list once status is `"done"`
- Both services have unit tests that run entirely with `MOCK_AI=true` (no live API calls required in CI)

**Todo List:**
1. Create `app/models/character.py` — `CharacterObject` Pydantic model matching §6.1 schema
2. Add `characters` JSON column to the `Manuscript` SQLAlchemy model (simple JSON blob for Week 1)
3. Create `app/services/nlu_extractor.py`:
   - Check `settings.MOCK_AI`; if true return stub `NLUResult`
   - Otherwise call `ibm_watson.NaturalLanguageUnderstandingV1`, extract entities/relations/sentiment/keywords
4. Create `app/services/granite_extractor.py`:
   - Check `settings.MOCK_AI`; if true return stub `CharacterObject` list
   - Otherwise call `ibm_watsonx_ai.foundation_models.ModelInference` with structured-output prompt, parse JSON response into `CharacterObject` list
5. Create `app/services/extraction_pipeline.py` — orchestrates NLU → Granite per chunk, merges character objects across chapters, updates DB status at each stage
6. Add background task call in `POST /api/manuscripts` handler that runs `extraction_pipeline.run(manuscript_id)`
7. Add `GET /api/manuscripts/{id}/characters` route returning characters from DB
8. Write `tests/test_nlu_extractor.py` and `tests/test_granite_extractor.py` with `MOCK_AI=true` (no live calls)

**Relevant Context:**
- Guide §5.2 — extraction approach
- Guide §6.1 — `CharacterObject` JSON schema (must match exactly)
- Guide §6.2 — `extracted_by` field should capture model name

**Status:** [x] done

---

### Sub-Task 5 — Bob usage log initialization

**Intent:** Initialize `docs/bob-usage.md` with the correct format so every Bob-assisted step during Week 1 is traceable for the submission.

**Expected Outcomes:**
- `docs/bob-usage.md` has a header and a first entry covering the scaffolding session
- Format is consistent Markdown that can be appended to as the project grows

**Todo List:**
1. Write the header and table structure to `docs/bob-usage.md`
2. Add the first log entry for this planning session

**Relevant Context:**
- Guide §3.1 — "Log usage in /docs/bob-usage.md as you build"
- Guide §10 — submission checklist requires documented Bob usage

**Status:** [x] done

---

## Execution Order

```
Sub-Task 5 (Bob log init)
    ↓
Sub-Task 1 (Backend scaffold)   ← parallel →   Sub-Task 2 (Frontend scaffold)
    ↓
Sub-Task 3 (Upload + chunking)
    ↓
Sub-Task 4 (NLU + Granite extraction)
```

Sub-Tasks 1 and 2 can be done in parallel. Sub-Tasks 3 and 4 depend on Sub-Task 1.
