# Week 3 — Differentiator & Visualization Plan

## Top-Level Overview

**Goal:** Complete the StoryGlide Week 3 milestone: build the emotional arc scorer, what-if exploration generator (with real Chroma vector store + watsonx.ai embeddings), and the full creator dashboard (dedicated page at `/dashboard/[manuscriptId]` with tabbed sections).

**Scope:**
- Backend: `arc_scorer.py` service, `whatif_generator.py` service (with Chroma + watsonx.ai embeddings), two new API endpoints (`/arc`, `/whatif`), integrate both into `extraction_pipeline.py`
- Frontend: New Next.js route `/dashboard/[manuscriptId]`, five tabbed sections (Overview, Arc, Contradictions, Threads, What-If), using Cytoscape.js for the relationship graph and Visx for the arc chart and pacing heatmap
- Tests: Unit tests for arc scorer and what-if generator (MOCK_AI mode)

**Non-goals:** Week 4 polish (error handling UX improvements, README, demo video). No changes to Week 1/2 logic.

**Key design decisions:**
- What-if generator uses Chroma vector store + watsonx.ai embeddings for retrieval (more technically credible for judging)
- 3 preset scope types: `character_death`, `relationship_change`, `event_removal`
- Relationship graph: Cytoscape.js
- Arc chart + pacing heatmap: Visx
- Dashboard: dedicated page `/dashboard/[manuscriptId]` with tabbed layout (Overview, Arc, Contradictions, Threads, What-If)
- `arc_json` field already exists on `Manuscript` model (no schema migration needed)

**Existing context to reuse:**
- `backend/app/services/granite_extractor.py` — pattern for Granite prompt calls with MOCK_AI support
- `backend/app/services/extraction_pipeline.py` — where arc scoring is called at end of pipeline
- `backend/app/routers/manuscripts.py` — where new endpoints are added
- `backend/app/models/manuscript.py` — `get_arc()` / `set_arc()` already exist
- `frontend/components/UploadForm.tsx` — source of truth for data shape/API call patterns

---

## Sub-Tasks

---

### Sub-Task 1 — Emotional Arc Scorer (Backend)

**Status:** `[x] done`

**Intent:**
Implement the `arc_scorer.py` service that computes a tension score (0–1), sentiment label, and dominant emotion per chapter using Granite. Integrate it into `extraction_pipeline.py` so it runs at the end of Stage 2 (after world-state extraction). Results are stored in `Manuscript.arc_json` via the existing `set_arc()` method. Wire up the `GET /api/manuscripts/{id}/arc` endpoint to return real data instead of the current empty stub.

**Expected Outcomes:**
- `backend/app/services/arc_scorer.py` exists and implements `score_arc(chapters) -> list[ArcDataPoint]`
- Each `ArcDataPoint` matches the §6.5 schema: `{ chapter_id, tension_score, sentiment, dominant_emotion }`
- MOCK_AI mode returns a deterministic arc array (one entry per chapter with varied tension values)
- `extraction_pipeline.py` calls `score_arc()` and calls `manuscript.set_arc()` before setting status to `"done"`
- `GET /api/manuscripts/{id}/arc` returns `{ manuscript_id, arc: ArcDataPoint[] }`
- `backend/tests/test_arc_scorer.py` passes with MOCK_AI=true

**Todo List:**
1. Create `backend/app/services/arc_scorer.py`:
   - Define `ArcDataPoint` Pydantic model matching §6.5
   - Implement `score_arc(chapters: list[Chapter]) -> list[ArcDataPoint]`
   - MOCK_AI branch: return deterministic arc (e.g., rising tension 0.2→0.5→0.9→0.6 across chapters)
   - Live branch: for each chapter, call Granite with a prompt asking for `tension_score (0-1)`, `sentiment (positive/negative/neutral)`, `dominant_emotion` as JSON; parse response
2. In `backend/app/services/extraction_pipeline.py`:
   - Import `score_arc` from `arc_scorer`
   - After Stage 3 (thread tracking), call `arc_data = score_arc(chapters)`
   - Call `manuscript.set_arc(arc_data)` before final status update
3. In `backend/app/routers/manuscripts.py`:
   - Replace the `GET /api/manuscripts/{id}/arc` stub with real logic that calls `manuscript.get_arc()`
   - Return `{ manuscript_id, arc: [] }` if `arc_json` is None (still processing)
4. Create `backend/tests/test_arc_scorer.py`:
   - Test that `score_arc` with MOCK_AI=true returns a list with one entry per chapter
   - Verify each entry has `chapter_id`, `tension_score` (float 0–1), `sentiment`, `dominant_emotion`

**Relevant Context:**
- `backend/app/services/granite_extractor.py` — follow the same MOCK_AI guard pattern
- `backend/app/models/manuscript.py:get_arc()/set_arc()` — already implemented, just needs to be called
- `backend/app/routers/manuscripts.py` — the stub is at `GET /api/manuscripts/{id}/arc`
- `backend/app/services/extraction_pipeline.py` — add arc call after the thread tracker call

---

### Sub-Task 2 — What-If Generator (Backend)

**Status:** `[x] done`

**Intent:**
Implement the `whatif_generator.py` service. This is the key differentiator feature. It uses Chroma as a local vector store with watsonx.ai Granite embedding models to retrieve relevant context (world-state chunks near the target chapter), then prompts Granite to generate (a) a short narrative sketch and (b) downstream chapter impacts. Supports 3 preset scope types: `character_death`, `relationship_change`, `event_removal`. Wire up the `POST /api/manuscripts/{id}/whatif` endpoint.

**Expected Outcomes:**
- `backend/app/services/whatif_generator.py` exists with `embed_manuscript()` and `run_whatif()` functions
- `embed_manuscript(manuscript_id, chapters)` builds/persists a Chroma collection for the manuscript
- `run_whatif(manuscript_id, request, chapters, characters) -> WhatIfResponse` retrieves relevant chunks and calls Granite
- MOCK_AI mode returns a deterministic response without Chroma or Granite calls
- `POST /api/manuscripts/{id}/whatif` accepts `WhatIfRequest` body, returns `WhatIfResponse` matching §6.6
- `chromadb` added to `backend/requirements.txt`
- `backend/tests/test_whatif_generator.py` passes with MOCK_AI=true

**Todo List:**
1. Add `chromadb` to `backend/requirements.txt`
2. Create `backend/app/services/whatif_generator.py`:
   - Define `WhatIfRequest` Pydantic model: `{ scope: Literal["character_death","relationship_change","event_removal"], target_id: str, at_chapter: str }`
   - Define `DownstreamImpact` Pydantic model: `{ chapter_id: str, impact: str }`
   - Define `WhatIfResponse` Pydantic model: `{ summary: str, downstream_impacts: list[DownstreamImpact] }`
   - Implement `embed_manuscript(manuscript_id, chapters)`:
     - Uses Chroma client (persistent, stored in `./chroma_store/{manuscript_id}`)
     - For each chapter: embed the chapter text using watsonx.ai embedding model (`ibm/slate-125m-english-rtrvr` or equivalent)
     - MOCK_AI branch: skip actual embedding, just store chapter text as Chroma documents with dummy embedding
   - Implement `run_whatif(manuscript_id, request, chapters, characters) -> WhatIfResponse`:
     - MOCK_AI branch: return deterministic mock response
     - Live branch:
       1. Retrieve top-3 most relevant chapter chunks from Chroma using the scope + target_id as query
       2. Build context: relevant world-state JSON + retrieved chapter text
       3. Build a scope-specific prompt for Granite:
          - `character_death`: "What would happen if [target character] died at [chapter]? Given the world state…"
          - `relationship_change`: "What would happen if the relationship between [target] changed at [chapter]?"
          - `event_removal`: "What would happen if the event [target_id] at [chapter] never occurred?"
       4. Call Granite, parse JSON response into `WhatIfResponse`
3. In `extraction_pipeline.py`:
   - After arc scoring, call `embed_manuscript(manuscript_id, chapters)` to build the vector store for this manuscript
4. In `backend/app/routers/manuscripts.py`:
   - Replace the `POST /api/manuscripts/{id}/whatif` stub
   - Parse `WhatIfRequest` from request body
   - Load manuscript's chapters and characters from DB
   - Call `run_whatif()`, return result
5. Create `backend/tests/test_whatif_generator.py`:
   - Test MOCK_AI path for all 3 scope types
   - Verify response shape matches §6.6

**Relevant Context:**
- `backend/app/services/granite_extractor.py` — reuse the same `get_client()` pattern for watsonx.ai calls
- `backend/app/config.py` — already has `watsonx_api_key`, `watsonx_project_id`, `watsonx_url`
- §6.6 in the MVP Guide for the exact request/response contract
- Chroma docs: `chromadb.PersistentClient(path=...)`, `.get_or_create_collection(name=...)`, `.add(...)`, `.query(...)`

---

### Sub-Task 3 — Dashboard Page Scaffold & Tabbed Layout (Frontend)

**Status:** `[x] done`

**Intent:**
Create the `/dashboard/[manuscriptId]` Next.js route with a polished tabbed layout. This sub-task only scaffolds the shell: the route, the tab navigation, the data-fetching wrappers, and the five empty tab panels. Visualization content is added in Sub-Tasks 4 and 5. The existing home page `UploadForm` should redirect to this dashboard page after processing completes instead of showing inline results.

**Expected Outcomes:**
- `frontend/app/dashboard/[manuscriptId]/page.tsx` exists and renders
- Five tabs: Overview, Arc, Contradictions, Threads, What-If
- Active tab state managed with React `useState`
- Dashboard fetches all data (characters, contradictions, threads, arc) in parallel via `Promise.all` on mount
- Loading and error states handled
- `frontend/lib/api.ts` extended with `fetchArc()` and `runWhatIf()` typed wrappers
- Existing `UploadForm.tsx` updated: after `status === "done"`, redirect to `/dashboard/{manuscriptId}` using `next/navigation`
- Required npm packages installed: `cytoscape`, `cytoscape-layout-utilities` (or similar), `@visx/...`, `recharts` is NOT needed

**Todo List:**
1. Install frontend packages: `cytoscape`, `react-cytoscapejs`, `@visx/group`, `@visx/shape`, `@visx/scale`, `@visx/axis`, `@visx/tooltip`, `@visx/gradient`, `@visx/responsive`
2. Extend `frontend/lib/api.ts`:
   - Add `ArcDataPoint` interface: `{ chapter_id: string; tension_score: number; sentiment: string; dominant_emotion: string }`
   - Add `WhatIfRequest` interface: `{ scope: string; target_id: string; at_chapter: string }`
   - Add `WhatIfResponse` interface: `{ summary: string; downstream_impacts: { chapter_id: string; impact: string }[] }`
   - Add `fetchArc(manuscriptId: string): Promise<{ manuscript_id: string; arc: ArcDataPoint[] }>`
   - Add `runWhatIf(manuscriptId: string, body: WhatIfRequest): Promise<WhatIfResponse>`
3. Create `frontend/app/dashboard/[manuscriptId]/page.tsx`:
   - `use client` directive
   - Load manuscript data on mount: `Promise.all([fetchCharacters, fetchContradictions, fetchThreads, fetchArc])`
   - Tab navigation bar with 5 tabs: `Overview | Arc | Contradictions | Threads | What-If`
   - Render appropriate panel based on active tab (placeholder `<div>` for each in this sub-task)
   - Loading spinner while fetching; error message on failure
4. Update `frontend/components/UploadForm.tsx`:
   - Import `useRouter` from `next/navigation`
   - When status transitions to `"done"`, call `router.push('/dashboard/' + manuscriptId)` instead of rendering inline results

**Relevant Context:**
- `frontend/components/UploadForm.tsx` — current polling logic and done-state rendering
- `frontend/lib/api.ts` — existing typed fetch wrappers to follow as pattern
- `frontend/app/layout.tsx` — Tailwind classes in use
- Next.js 14 app router: dynamic route segments go in `app/dashboard/[manuscriptId]/page.tsx`

---

### Sub-Task 4 — Dashboard: Overview Tab & Relationship Graph (Frontend)

**Status:** `[x] done`

**Intent:**
Implement the Overview tab panel: summary stat cards (character count, contradiction count, unresolved thread count) and the interactive Cytoscape.js relationship graph showing characters as nodes and relationships as labelled edges, colored by sentiment (hostile = red, friendly = green, neutral = grey).

**Expected Outcomes:**
- `frontend/components/dashboard/RelationshipGraph.tsx` exists and renders a Cytoscape.js graph
- Nodes are characters; edges are relationships with `type` as label and colored by `sentiment`
- The Overview tab in the dashboard page shows 3 summary stat cards + `<RelationshipGraph />`
- Graph is interactive: pan, zoom, click-to-select

**Todo List:**
1. Create `frontend/components/dashboard/RelationshipGraph.tsx`:
   - Import `CytoscapeComponent` from `react-cytoscapejs`
   - Accept prop `characters: CharacterObject[]`
   - Build `elements` array from characters: one node per character, one edge per relationship (using `target_id` to connect)
   - Style nodes with character name label; edges colored by sentiment (`hostile` → `#ef4444`, `friendly` → `#22c55e`, `neutral` → `#9ca3af`)
   - Use `cola` or `cose` layout for readable positioning
   - Full-width, fixed height (e.g., 480px), rounded corners, dark background
2. In `frontend/app/dashboard/[manuscriptId]/page.tsx`:
   - Replace Overview tab placeholder with:
     - 3 stat cards: Characters (count), Contradictions (count), Unresolved Threads (count)
     - `<RelationshipGraph characters={characters} />`

**Relevant Context:**
- `frontend/lib/api.ts` — `CharacterObject` and `CharacterRelationship` interfaces
- `react-cytoscapejs` docs: `elements` prop format `[{ data: { id, label } }, { data: { source, target, label } }]`
- `frontend/app/globals.css` — existing Tailwind setup

---

### Sub-Task 5 — Dashboard: Arc Tab & Pacing Heatmap (Frontend)

**Status:** `[x] done`

**Intent:**
Implement the Arc tab panel: an emotional arc line chart (tension score vs chapter) and a pacing heatmap (word count per chapter visualized as a color intensity grid). Both use Visx.

**Expected Outcomes:**
- `frontend/components/dashboard/ArcChart.tsx` exists: line chart of `tension_score` per chapter, with a tooltip showing `sentiment` and `dominant_emotion` on hover
- `frontend/components/dashboard/PacingHeatmap.tsx` exists: chapter word-count heatmap rendered as a grid of colored cells, darker = more words
- Arc tab in the dashboard renders both components
- Components are responsive (use `@visx/responsive` `ParentSize`)

**Todo List:**
1. Create `frontend/components/dashboard/ArcChart.tsx`:
   - Accept `arc: ArcDataPoint[]`
   - Use `@visx/shape` LinePath, `@visx/scale` scaleLinear/scaleBand, `@visx/axis` AxisBottom/AxisLeft
   - Render chapter order (x) vs tension_score (y, 0–1)
   - Add `@visx/tooltip` to show `dominant_emotion` and `sentiment` on hover
   - Optionally render a reference "ideal arc" dashed line (flat rise-fall-rise at 0.2→0.8→0.4)
2. Create `frontend/components/dashboard/PacingHeatmap.tsx`:
   - Accept `chapters` data (chapter_id + word_count) derived from characters API or a separate source
   - Note: `word_count` per chapter is available from the characters API response — pass it in from the dashboard
   - Render a row of colored cells, one per chapter, using `@visx/shape` Bar or `rect` elements; intensity = `word_count / max_word_count`
   - Label each cell with the chapter title (abbreviated)
3. In `frontend/app/dashboard/[manuscriptId]/page.tsx`:
   - Replace Arc tab placeholder with `<ArcChart arc={arc} />` and `<PacingHeatmap chapters={...} />`
   - Note: to get chapter word counts for the heatmap, add a `fetchDashboard()` call (or derive from arc data by augmenting the arc endpoint) — simplest: include word_count in the arc endpoint response by extending `ArcDataPoint` with an optional `word_count` field on the backend

**Relevant Context:**
- `backend/app/services/arc_scorer.py` (Sub-Task 1) — extend `ArcDataPoint` to optionally include `word_count` from the `Chapter` model
- Visx examples: https://airbnb.io/visx/docs/linepath
- `@visx/responsive` `ParentSize` pattern for responsive charts

---

### Sub-Task 6 — Dashboard: Contradictions & Threads Tabs (Frontend)

**Status:** `[x] done`

**Intent:**
Implement the Contradictions and Threads tab panels, migrating and polishing the existing inline result display from `UploadForm.tsx` into standalone dashboard tab components.

**Expected Outcomes:**
- `frontend/components/dashboard/ContradictionsList.tsx` — polished list of contradiction flags
- `frontend/components/dashboard/ThreadsList.tsx` — polished list of unresolved threads
- Each contradiction card shows: entity, description, conflicting chapters, confidence badge (color-coded by confidence: high ≥0.8 red, mid ≥0.5 yellow, low grey)
- Each thread card shows: type badge, description, introduced chapter, resolved status
- Contradictions and Threads tabs render these components

**Todo List:**
1. Create `frontend/components/dashboard/ContradictionsList.tsx`:
   - Accept `contradictions: ContradictionFlag[]`
   - Render each as a card: entity name (bold), description, two chapter badges for `conflicting_chapters`, confidence badge color-coded
2. Create `frontend/components/dashboard/ThreadsList.tsx`:
   - Accept `threads: UnresolvedThread[]`
   - Render each as a card: type badge (e.g., "Chekhov's Gun"), description, "Introduced in" chapter tag, resolved/unresolved status pill
3. In `frontend/app/dashboard/[manuscriptId]/page.tsx`:
   - Replace Contradictions tab placeholder with `<ContradictionsList contradictions={contradictions} />`
   - Replace Threads tab placeholder with `<ThreadsList threads={threads} />`

**Relevant Context:**
- `frontend/components/UploadForm.tsx` — existing contradiction/thread rendering logic to refactor/reuse
- `frontend/lib/api.ts` — `ContradictionFlag` and `UnresolvedThread` interfaces already defined

---

### Sub-Task 7 — Dashboard: What-If Tab (Frontend)

**Status:** `[x] done`

**Intent:**
Implement the What-If tab panel: a form where the author selects a scope type (from 3 presets), a target character or event ID, and a chapter, then submits to generate an alternate path narrative with downstream impact cards.

**Expected Outcomes:**
- `frontend/components/dashboard/WhatIfPanel.tsx` exists with a scope selector, target selector, chapter selector, and submit button
- After submission, renders the narrative summary and a list of downstream impact cards
- Calls `POST /api/manuscripts/{id}/whatif` via `runWhatIf()` in `api.ts`
- Loading state while waiting for Granite response
- What-If tab in dashboard renders `<WhatIfPanel />`

**Todo List:**
1. Create `frontend/components/dashboard/WhatIfPanel.tsx`:
   - Props: `manuscriptId: string`, `characters: CharacterObject[]`, `arc: ArcDataPoint[]` (for chapter list)
   - Scope selector: dropdown with 3 options ("Character Death", "Relationship Change", "Event Removal")
   - Target selector: when scope is `character_death` or `relationship_change`, show a dropdown of character names (from `characters`); when `event_removal`, show a free-text input for event name
   - Chapter selector: dropdown of chapter IDs (derived from `arc` data or characters `first_appearance` list)
   - Submit button (disabled while loading)
   - On submit: call `runWhatIf(manuscriptId, { scope, target_id, at_chapter })`
   - On response: render summary paragraph + list of downstream impact cards (chapter_id + impact text)
2. In `frontend/app/dashboard/[manuscriptId]/page.tsx`:
   - Replace What-If tab placeholder with `<WhatIfPanel manuscriptId={manuscriptId} characters={characters} arc={arc} />`

**Relevant Context:**
- `frontend/lib/api.ts` — `runWhatIf()` added in Sub-Task 3
- §6.6 of MVP Guide for exact request/response shape
- `frontend/components/UploadForm.tsx` — pattern for form state and async fetch with loading state

---

### Sub-Task 8 — Tests & Bob Usage Log Update

**Status:** `[x] done`

**Intent:**
Ensure all new backend services have unit test coverage (MOCK_AI mode), run the full test suite to confirm nothing regressed, and append the Week 3 entry to the IBM Bob usage log.

**Expected Outcomes:**
- `backend/tests/test_arc_scorer.py` passes
- `backend/tests/test_whatif_generator.py` passes (all 3 scope types)
- All existing tests (`test_chunker`, `test_nlu_extractor`, `test_granite_extractor`, `test_contradiction_engine`, `test_thread_tracker`) still pass
- `docs/bob-usage.md` has a new row 003 for Week 3

**Todo List:**
1. Verify `backend/tests/test_arc_scorer.py` covers:
   - `score_arc([])` returns `[]`
   - `score_arc(chapters)` returns one entry per chapter with valid `tension_score`, `sentiment`, `dominant_emotion`
2. Verify `backend/tests/test_whatif_generator.py` covers:
   - `run_whatif` with `character_death` scope returns `WhatIfResponse` with `summary` and `downstream_impacts`
   - Same for `relationship_change` and `event_removal`
3. Run full test suite: `cd backend && python -m pytest tests/ -v`
4. Fix any regressions
5. Append row 003 to `docs/bob-usage.md` describing Week 3 assistance

**Relevant Context:**
- All existing test files in `backend/tests/` for pattern reference
- `docs/bob-usage.md` — existing row format to match
