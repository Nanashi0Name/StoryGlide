# StoryGlide — IBM Bob Usage Log

This file tracks every step where IBM Bob assisted in building the StoryGlide MVP.
Required for the AI Builders Challenge submission (see §10 of the MVP Guide).

---

## Log Entries

| # | Date | Mode | Phase | What Bob assisted with | Files produced / modified |
|---|------|------|-------|------------------------|---------------------------|
| 001 | 2025-01-27 | Plan | Week 1 — Planning | Read and analyzed `StoryGlide_MVP_Guide.md`. Explored empty project structure. Facilitated 3 design decisions (SQLite in Week 1, async background task processing, MOCK_AI stub mode). Produced a fully structured 5-sub-task Week 1 plan. | `docs/week1-foundation-plan.md` |
| 002 | 2025-01-27 | Agent | Week 1 — Foundation | Initialized Bob usage log. Scaffolded full FastAPI backend (`config`, `database`, `main`, routers, services, models). Scaffolded Next.js 14 frontend (TypeScript, Tailwind, upload form, API client). Implemented manuscript upload endpoint, chapter chunking service (regex heading detection + 1500-word fallback), Watson NLU extractor, Granite extractor (both with MOCK_AI stub mode), extraction pipeline with async background task and SQLite persistence. Wrote unit tests for chunker, NLU extractor, and Granite extractor. | `backend/**`, `frontend/**`, `docs/bob-usage.md` |
