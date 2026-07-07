# Week 4 — Polish, Docs & Submission Plan

## Top-Level Overview

**Goal:** Bring the StoryGlide MVP to a publicly presentable and submittable state for the AI Builders Challenge.

**Scope:**
- Sub-Task 1: Backend error handling & `/dashboard` aggregate endpoint
- Sub-Task 2: Frontend resilience & UX polish (empty states, error boundaries, loading skeletons)
- Sub-Task 3: Pre-loaded demo manuscript (Project Gutenberg novel seeded at startup)
- Sub-Task 4: Root `README.md` matching submission checklist requirements
- Sub-Task 5: Final Bob usage log entry + submission checklist verification

**Non-goals:**
- No new AI features
- No new analysis modules
- No architectural changes to the pipeline
- No authentication or user accounts

**Approach:** Work sub-task by sub-task, validating tests and TypeScript after each. All sub-tasks are independent except Sub-Task 3 which builds on Sub-Task 1's `/dashboard` endpoint.

---

## Sub-Task 1 — Backend: `/dashboard` aggregate endpoint + error message propagation

**Status:** [ ] pending

### Intent
The MVP Guide (§7) specifies `GET /api/manuscripts/{id}/dashboard` as a single aggregated payload for the dashboard. This doesn't exist yet — the frontend makes 4 separate parallel calls. Adding the aggregate endpoint reduces round-trips and gives the frontend one place to detect errors. Also tighten the error message stored on `Manuscript.error_message` so it surfaces useful context to the frontend.

### Expected Outcomes
- New endpoint `GET /api/manuscripts/{id}/dashboard` returns `{ characters, contradictions, threads, arc }` in one response.
- The endpoint returns `202` (with status field) if still processing, and `404` if not found — consistent with existing pattern.
- `extraction_pipeline.py` stores a truncated, human-readable error message (max 500 chars) rather than a raw exception string.
- All existing backend tests still pass; add one new test for the dashboard endpoint.

### Todo List
1. In [`backend/app/routers/manuscripts.py`](backend/app/routers/manuscripts.py), add `GET /manuscripts/{manuscript_id}/dashboard` handler that calls all four `manuscript.get_*()` methods and returns them combined.
2. In [`backend/app/services/extraction_pipeline.py`](backend/app/services/extraction_pipeline.py) `except` block, truncate `str(exc)` to 500 characters before storing as `error_message`.
3. Add `test_dashboard_endpoint` to a new `backend/tests/test_dashboard.py` (MOCK_AI mode, status=done fixture, asserts all four keys present).

### Relevant Context
- [`backend/app/routers/manuscripts.py:60`](backend/app/routers/manuscripts.py) — existing pattern for `_fetch_or_404` + 202 guard
- [`backend/app/models/manuscript.py`](backend/app/models/manuscript.py) — `get_characters()`, `get_contradictions()`, `get_threads()`, `get_arc()` methods
- [`backend/app/services/extraction_pipeline.py:144`](backend/app/services/extraction_pipeline.py) — existing `except` block

---

## Sub-Task 2 — Frontend: empty states, error boundaries, and UX polish

**Status:** [ ] pending

### Intent
The dashboard currently shows nothing when a list is empty (no characters, no contradictions, etc.) and has no recovery path from a fetch error — the user sees a raw error string. Polish these surfaces so the demo looks professional even when data is sparse (e.g. a very short test manuscript).

### Expected Outcomes
- Each dashboard tab shows a friendly empty-state card when its list is empty (not a blank area).
- The dashboard error banner has a "Retry" button that re-runs `loadAll()`.
- The `UploadForm` error state has a "Try again" button that resets to `idle`.
- The dashboard `loadAll()` function uses the new `/dashboard` aggregate endpoint instead of 4 parallel calls (reduces code and round-trips).
- TypeScript type-check passes with zero new errors.

### Todo List
1. In [`frontend/app/dashboard/[manuscriptId]/page.tsx`](frontend/app/dashboard/[manuscriptId]/page.tsx), replace the 4 parallel `fetch*` calls with a single `fetchDashboard(manuscriptId)` call.
2. Add `fetchDashboard` to [`frontend/lib/api.ts`](frontend/lib/api.ts) that calls `GET /api/manuscripts/{id}/dashboard`.
3. Add an `EmptyState` component (inline in the dashboard page file) that renders a centered icon + message.
4. In each tab section of the dashboard page, wrap the list component in an empty-state check: if `list.length === 0` render `<EmptyState message="..." />`.
5. Add a "Retry" button to the dashboard error banner that calls `loadAll()` again.
6. In [`frontend/components/UploadForm.tsx`](frontend/components/UploadForm.tsx), add a "Try again" button in the `error` stage that calls `setStage("idle")` and clears `errorMsg`.

### Relevant Context
- [`frontend/app/dashboard/[manuscriptId]/page.tsx:56`](frontend/app/dashboard/[manuscriptId]/page.tsx) — `loadAll()` with 4 parallel calls
- [`frontend/app/dashboard/[manuscriptId]/page.tsx:99`](frontend/app/dashboard/[manuscriptId]/page.tsx) — error banner (no retry button currently)
- [`frontend/components/UploadForm.tsx:92`](frontend/components/UploadForm.tsx) — error block (no reset button)
- [`frontend/lib/api.ts`](frontend/lib/api.ts) — existing `fetchCharacters`, `fetchContradictions`, etc. to mirror for `fetchDashboard`

---

## Sub-Task 3 — Pre-loaded demo manuscript

**Status:** [ ] pending

### Intent
The MVP Guide (§5.1, §8 Week 4) requires a pre-loaded public-domain novel so the dashboard always has rich, clean data to show during the demo — not requiring a live upload. The guide suggests a Project Gutenberg text. The seed should run automatically on first startup if the demo manuscript hasn't been loaded yet.

### Expected Outcomes
- A `data/` directory at the project root contains a `.txt` file of a short public-domain novel (e.g. *The Time Machine* by H.G. Wells — ~35,000 words, clear chapter headings, good for demonstrating contradictions and threads).
- A `backend/app/seed_demo.py` script that: checks if a manuscript with `filename="demo_the_time_machine.txt"` already exists in the DB, and if not, reads the file and calls `extraction_pipeline.run()` with it.
- `backend/app/main.py` `lifespan` calls `seed_demo.seed()` after `create_all_tables()` in a background task (non-blocking, so startup is instant).
- The frontend home page shows a "View demo analysis" link/button if the environment variable `NEXT_PUBLIC_DEMO_MANUSCRIPT_ID` is set (populated manually or via a setup step after first seeding).
- Document the one-time setup in the README (see Sub-Task 4).

### Todo List
1. Download *The Time Machine* plain text from Project Gutenberg (URL: `https://www.gutenberg.org/files/35/35-0.txt`) and save it as `data/the_time_machine.txt`. *(Manual step — you must do this; see note below.)*
2. Create `backend/app/seed_demo.py` with an async `seed()` function: query DB for existing demo manuscript → if found, skip; if not, read `data/the_time_machine.txt`, call `extraction_pipeline.run(...)`.
3. In [`backend/app/main.py`](backend/app/main.py) `lifespan`, after `create_all_tables()`, schedule `seed_demo.seed()` as a background task using `asyncio.create_task()`.
4. Add `NEXT_PUBLIC_DEMO_MANUSCRIPT_ID=` to [`frontend/.env.local.example`](frontend/.env.local.example).
5. In [`frontend/app/page.tsx`](frontend/app/page.tsx), read `process.env.NEXT_PUBLIC_DEMO_MANUSCRIPT_ID` and if non-empty, render a "View demo analysis →" link below the upload form pointing to `/dashboard/{id}`.

### Relevant Context
- [`backend/app/main.py:10`](backend/app/main.py) — `lifespan` async context manager
- [`backend/app/services/extraction_pipeline.py:25`](backend/app/services/extraction_pipeline.py) — `run(manuscript_id, file_bytes, filename)` signature (needs a `manuscript_id`; `seed_demo.py` will create the DB record first, just as the upload endpoint does)
- [`frontend/app/page.tsx`](frontend/app/page.tsx) — home page that renders `<UploadForm />`

> **Manual step required:** You must download the file yourself (see §"API keys and manual steps" at the bottom of this plan for the exact URL and instructions).

---

## Sub-Task 4 — Root README.md

**Status:** [ ] pending

### Intent
The submission checklist (§10) requires a public GitHub README covering: problem statement, solution description, AI approach & architecture, selected challenge theme, and how IBM Bob was used. No root-level README exists yet.

### Expected Outcomes
- `README.md` at the project root covers all five required topics from the submission checklist.
- Includes a "Quick start" section (copy the `.env.example`, set API keys, run backend + frontend).
- Includes a table of IBM services used (watsonx.ai Granite, Watson NLU, Chroma) and where each appears in the code.
- Includes a link to `docs/bob-usage.md` as the IBM Bob usage evidence.
- Includes a "Demo" section placeholder for the video link and the demo manuscript.

### Todo List
1. Create [`README.md`](README.md) at the project root with all required sections (see expected outcomes above).
2. Sections to include (in order):
   - StoryGlide — tagline and one-sentence summary
   - Problem statement (from §1.1 of the MVP Guide)
   - Solution description (from §1.2)
   - AI approach & architecture (pipeline diagram as ASCII/Mermaid text, IBM services table)
   - Selected challenge theme and how the features satisfy it
   - How IBM Bob was used (link to `docs/bob-usage.md`, short summary)
   - Quick start (prerequisites, `.env` setup, run backend, run frontend)
   - API key setup instructions (watsonx.ai and Watson NLU — see §"API keys and manual steps" below)
   - Demo (video link placeholder, demo manuscript link)
   - Tech stack table

### Relevant Context
- [`docs/StoryGlide_MVP_Guide.md`](docs/StoryGlide_MVP_Guide.md) — §1, §2, §3, §10 provide the exact language needed
- [`docs/bob-usage.md`](docs/bob-usage.md) — usage log to link
- [`backend/.env.example`](backend/.env.example) — env vars to document
- [`frontend/.env.local.example`](frontend/.env.local.example) — env vars to document

---

## Sub-Task 5 — Final Bob usage log + submission checklist verification

**Status:** [ ] pending

### Intent
Before submitting, update `docs/bob-usage.md` with the Week 4 log entry and manually verify every item in the submission checklist (§10 of the MVP Guide).

### Expected Outcomes
- `docs/bob-usage.md` has a new row for Week 4 (plan + implementation).
- A `docs/submission-checklist.md` file exists with each §10 item checked off or flagged as still-needed (video link, SkillsBuild certificates, GitHub repo public).
- All backend tests pass (`pytest backend/tests`).
- Frontend TypeScript check passes (`cd frontend && npm run type-check`).

### Todo List
1. Append Week 4 Plan entry to [`docs/bob-usage.md`](docs/bob-usage.md) (this has already been done at the end of this planning response).
2. Create `docs/submission-checklist.md` with §10 checklist items, marking each as done or TODO.
3. Run `pytest backend/tests -q` and confirm all pass.
4. Run `cd frontend && npm run type-check` and confirm zero errors.

### Relevant Context
- [`docs/bob-usage.md`](docs/bob-usage.md) — log format to follow
- [`docs/StoryGlide_MVP_Guide.md:483`](docs/StoryGlide_MVP_Guide.md) — §10 submission checklist

---

## API Keys and Manual Steps (Read Before Implementing)

These items require your personal action — they cannot be automated.

### 1. Download the demo manuscript
Go to: `https://www.gutenberg.org/files/35/35-0.txt`  
Save the file as `data/the_time_machine.txt` at the project root.  
This is the pre-loaded novel for the demo.

### 2. IBM watsonx.ai API key and Project ID
1. Go to [cloud.ibm.com](https://cloud.ibm.com) and sign in (or create a free account).
2. Create a **watsonx.ai** project: click "Projects" → "New project" → give it a name.
3. Get your **Project ID**: open your project → "Manage" tab → copy the Project ID.
4. Get your **API key**: click your profile icon (top right) → "Manage access and users" → "API keys" → "Create" → copy the key immediately.
5. Get your **URL**: it is `https://us-south.ml.cloud.ibm.com` for the Dallas region (default). If you created your project in a different region, check the watsonx.ai documentation for your region's URL.
6. Paste these into `backend/.env` as:
   ```
   WATSONX_API_KEY=your_key_here
   WATSONX_PROJECT_ID=your_project_id_here
   WATSONX_URL=https://us-south.ml.cloud.ibm.com
   ```

### 3. Watson Natural Language Understanding API key
1. In [cloud.ibm.com](https://cloud.ibm.com), go to "Catalog" → search "Natural Language Understanding" → click it → select the **Lite (free)** plan → "Create".
2. After creation, open the NLU instance → "Manage" → copy the **API key** and **URL**.
3. Paste into `backend/.env`:
   ```
   WATSON_NLU_API_KEY=your_nlu_key_here
   WATSON_NLU_URL=https://api.us-south.natural-language-understanding.watson.cloud.ibm.com
   ```

### 4. Local development without API keys
Set `MOCK_AI=true` in `backend/.env` to use stub responses for all AI calls. This lets you run and test the full pipeline without any IBM credentials. Use `MOCK_AI=false` only for the final demo recording.

---

## Implementation Order

```
Sub-Task 1 (backend dashboard endpoint) 
    → Sub-Task 2 (frontend uses new endpoint + polish) 
    → Sub-Task 3 (demo seed — requires manual file download first) 
    → Sub-Task 4 (README) 
    → Sub-Task 5 (log + checklist + final validation)
```
