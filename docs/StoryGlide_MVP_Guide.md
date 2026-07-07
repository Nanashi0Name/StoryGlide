*A flight recorder and flight simulator for your manuscript*

MVP Development Guide

AI Builders Challenge with IBM Bob --- Theme: Create with AI: The Future
of Creative Industries

Prepared for: coding assistant hand-off. This document specifies the
problem, architecture, data contracts, endpoints, and a 4-week build
plan in enough detail to start implementation directly.

# 1. Project overview

## 1.1 Problem statement

Writers, especially novelists working alone, have no fast way to check
whether their story is internally consistent, well-paced, and
emotionally coherent across tens of thousands of words. Manual
continuity tracking (character status, world state, unresolved plot
threads) is tedious and error-prone even for professional editors.
Existing AI writing tools either generate prose for the author (raising
authenticity concerns) or offer shallow grammar/style checking that
misses structural and logical issues spanning many chapters.

## 1.2 Solution summary

StoryGlide ingests a full manuscript and builds a structured,
chapter-by-chapter model of the story world (characters, locations,
factions, objects, events). On top of that model it runs:

-   A contradiction diff engine that catches logical/state
    inconsistencies across distant chapters (not just same-page
    contradictions)

-   An unresolved-thread tracker ("Chekhov\'s gun" detector)

-   An emotional arc scorer that visualizes tension/sentiment across the
    book

-   A what-if exploration generator that lets the author simulate
    alternate story paths using the same world-state model

The tool does not write the author\'s prose. It diagnoses structural
issues and lets the author safely explore alternatives --- positioning
it as an analysis and exploration tool, not a ghostwriter.

## 1.3 Target users

-   Independent novelists and screenwriters self-editing long-form
    fiction

-   Writing coaches and workshop facilitators giving structural feedback

-   Literary agencies / small presses doing manuscript triage (stretch
    use case)

# 2. Challenge alignment

## 2.1 Selected theme

Create with AI: The Future of Creative Industries --- "Build solutions
that help creators work smarter, explore new forms of expression, and
unlock new creative possibilities."

## 2.2 How the MVP satisfies the theme

  -----------------------------------------------------------------------
  **Theme phrase**        **Feature that satisfies it**
  ----------------------- -----------------------------------------------
  Work smarter            Contradiction diff engine, unresolved thread
                          tracker, pacing/arc visualization --- automate
                          work that currently takes hours of manual
                          re-reading.

  Explore new forms of    What-if exploration generator --- lets the
  expression              author generate and compare alternate
                          character/plot paths without rewriting the
                          manuscript.

  Unlock new creative     Combining diagnosis with simulation: the same
  possibilities           world-state model that finds problems also
                          powers safe experimentation with solutions.
  -----------------------------------------------------------------------

## 2.3 Judging criteria mapping

  -----------------------------------------------------------------------
  **Criterion**     **Primary evidence in this MVP**
  ----------------- -----------------------------------------------------
  Technical         Structured world-state extraction (not naive LLM
  execution         Q&A), RAG-based chunking/embeddings for full-length
                    manuscripts, visible IBM Bob usage log.

  Innovation        State-diff contradiction detection and the what-if
                    generator --- both uncommon in existing
                    writing-assistant tools.

  Challenge fit     Direct mapping above; both diagnostic and generative
                    sides of the theme are represented.

  Feasibility       No model training required; built entirely on
                    existing APIs (watsonx.ai, Watson NLU) within a
                    4-week scope.

  Real-world impact Addresses a real, currently paid service (manuscript
                    coverage / structural editing) with a clear
                    underserved user base (indie authors).
  -----------------------------------------------------------------------

# 3. Tech stack

## 3.1 Required

-   IBM Bob --- primary development tool. Used across the SDLC:
    scaffolding, code generation, refactors, and test generation. Log
    usage in /docs/bob-usage.md as you build.

-   AI as a core functional component --- satisfied by the extraction,
    diff, scoring, and generation modules below (not a bolt-on feature).

## 3.2 Recommended, used in this design

-   watsonx.ai --- IBM Granite models for generation (contradiction
    summaries, what-if narratives, arc scoring) and Granite/Slate
    embedding models for retrieval.

-   Watson Natural Language Understanding --- entity, relation,
    sentiment, and emotion extraction from manuscript text.

-   LangChain or LangFlow --- orchestration of the multi-step extraction
    → diff → generation pipeline.

## 3.3 Application stack

  ------------------------------------------------------------------------
  **Layer**     **Choice**                **Notes**
  ------------- ------------------------- --------------------------------
  Frontend      Next.js / React           Upload UI, dashboard, what-if
                                          panel

  Backend       Python (FastAPI)          Orchestrates NLU/Granite calls,
                                          exposes REST API

  Vector store  Chroma or FAISS (local) / Chunk embeddings for retrieval
                watsonx.data              over long manuscripts

  State store   Postgres or SQLite (MVP)  World-state facts per chapter,
                with JSON columns         contradiction flags, threads
  ------------------------------------------------------------------------

# 4. System architecture

Five-stage pipeline, single direction, top to bottom:

-   1\. Manuscript upload --- React frontend, file parsed and split into
    chapters/scenes.

-   2\. Extraction & embedding --- Watson NLU extracts
    entities/relations/sentiment per chunk; watsonx.ai embeddings index
    chunks for retrieval.

-   3\. World-state tracker --- structured per-chapter facts (character
    status, location, faction control, objects, events) stored as JSON,
    keyed by chapter.

-   4\. Analysis & exploration engine --- four sub-modules run against
    the world-state store: contradiction diff, unresolved-thread
    tracker, emotional arc scorer, what-if generator.

-   5\. Creator dashboard --- aggregates all outputs into the
    relationship graph, pacing heatmap, arc chart, thread list, and
    what-if panel.

*Key design decision: contradiction detection operates on structured
state diffs, not on asking an LLM to compare raw passages. This is what
allows it to catch long-range inconsistencies (e.g. a location destroyed
in an early chapter being treated as active many chapters later) that
naive semantic comparison misses.*

# 5. Feature specifications

## 5.1 Manuscript upload & chunking

Accepts .txt and .docx. Splits into chapters using heading detection
(regex on "Chapter N" patterns, falling back to fixed-length scene
chunks of \~1500 words if no headings are found). Each chunk gets a
stable chapter_id.

For the live demo, pre-load one public-domain novel (e.g. a Project
Gutenberg text) so the dashboard always has clean data to show, in
addition to supporting live user upload.

## 5.2 Extraction & embedding

For each chapter chunk, call Watson NLU to extract entities (characters,
locations, organizations), relations, keywords, and sentiment. Call a
watsonx.ai Granite model with a structured-output prompt to fill in what
NLU misses (implicit relationships, faction control, object ownership).
Embed each chunk with a watsonx.ai embedding model and store the vector
for later retrieval by the what-if generator.

## 5.3 World-state tracker

The core data structure. One record per chapter capturing the state of
the story world at that point. See section 6.2 for the schema. This is
built once per manuscript and updated incrementally if the author
re-uploads a revision.

## 5.4 Contradiction diff engine

Walks the ordered list of chapter-state records. For each tracked entity
(character, location, faction, object), builds a timeline of its
recorded states. Flags a contradiction when a later state cannot be
logically reached from an earlier one without an explaining event in
between (e.g. status alive → deceased → alive with no resurrection event
recorded; a destroyed location later described as governed by an active
army). Output: a list of contradiction_flag records, each with a
confidence score and the two conflicting chapters.

## 5.5 Unresolved thread tracker

Uses the Granite model to identify "planted" narrative elements per
chapter: introduced objects, made promises, foreshadowing statements,
unanswered questions. Cross-references later chapters for a resolution.
Anything unresolved by the final chapter is flagged as an open thread.

## 5.6 Emotional arc scorer

Runs sentiment/tension scoring per chapter via Granite, normalized to a
0--1 tension scale plus a dominant-emotion label. Plotted against
chapter order to produce the arc chart. Optionally overlay a reference
story-shape curve (e.g. a rise-fall-rise pattern) for comparison.

## 5.7 What-if exploration generator

The generative, expression-unlocking feature. The author selects a scope
(character death, relationship change, event removal) and a target
chapter. The system retrieves the relevant world-state and surrounding
text chunks, then prompts Granite to generate: (a) a short narrative
sketch of the alternate path, and (b) a list of downstream consequences
it would create given the existing world-state (which later chapters
would need to change). Keep this to 2--3 preset scope types for the MVP
rather than fully open-ended prompts --- this keeps output quality and
demo reliability high.

## 5.8 Creator dashboard

Single-page view combining: interactive character relationship graph,
pacing heatmap (scene length / dialogue ratio), emotional arc chart,
unresolved thread list, contradiction list, and the what-if exploration
panel. Prioritize this being visually polished --- it is the primary
demo surface.

# 6. Data models

These are the core JSON contracts the backend should implement first. A
coding assistant can generate the database schema and API serializers
directly from these.

## 6.1 Character object

{

\"id\": \"char_001\",

\"name\": \"Elena Voss\",

\"aliases\": \[\"Ellie\"\],

\"first_appearance\": \"chapter_02\",

\"status_by_chapter\": {

\"chapter_02\": \"alive\",

\"chapter_14\": \"deceased\"

},

\"relationships\": \[

{ \"target_id\": \"char_004\", \"type\": \"sibling\", \"sentiment\":
\"hostile\" }

\]

}

## 6.2 Chapter world-state object

{

\"chapter_id\": \"chapter_15\",

\"characters_present\": \[\"char_001\", \"char_004\"\],

\"locations\": \[\"kingdom_of_varen\"\],

\"faction_control\": {

\"kingdom_of_varen\": \"destroyed_ch04\"

},

\"key_objects\": \[\"ancient_sword\"\],

\"events\": \[\"army_appears_at_gate\"\],

\"extracted_by\": \"watsonx.granite-3-8b-instruct\"

}

## 6.3 Contradiction flag object

{

\"id\": \"flag_009\",

\"type\": \"state_conflict\",

\"entity\": \"kingdom_of_varen\",

\"conflicting_chapters\": \[\"chapter_04\", \"chapter_15\"\],

\"description\": \"Kingdom marked destroyed in ch.4; army referenced as
active in ch.15\",

\"confidence\": 0.82

}

## 6.4 Unresolved thread object

{

\"id\": \"thread_003\",

\"type\": \"chekhov_gun\",

\"introduced_chapter\": \"chapter_06\",

\"description\": \"Locked chest given to protagonist, never opened\",

\"resolved\": false

}

## 6.5 Emotional arc data point

{

\"chapter_id\": \"chapter_10\",

\"tension_score\": 0.71,

\"sentiment\": \"negative\",

\"dominant_emotion\": \"fear\"

}

## 6.6 What-if request / response

// Request

{

\"scope\": \"character_death\",

\"target_id\": \"char_001\",

\"at_chapter\": \"chapter_03\"

}

// Response

{

\"summary\": \"Short narrative sketch of the alternate path\...\",

\"downstream_impacts\": \[

{ \"chapter_id\": \"chapter_09\", \"impact\": \"This scene assumes Elena
is alive; would need rewriting.\" }

\]

}

# 7. API endpoint outline

  ------------------------------------------------------------------------------------
  **Method**   **Endpoint**                           **Purpose**
  ------------ -------------------------------------- --------------------------------
  POST         /api/manuscripts                       Upload a manuscript, kicks off
                                                      async processing

  GET          /api/manuscripts/{id}/status           Poll processing status

  GET          /api/manuscripts/{id}/characters       Character list and relationship
                                                      graph

  GET          /api/manuscripts/{id}/contradictions   Contradiction flags

  GET          /api/manuscripts/{id}/threads          Unresolved thread list

  GET          /api/manuscripts/{id}/arc              Emotional arc data points

  POST         /api/manuscripts/{id}/whatif           Run a what-if exploration

  GET          /api/manuscripts/{id}/dashboard        Aggregated payload for the
                                                      dashboard view
  ------------------------------------------------------------------------------------

# 8. Four-week development roadmap

## Week 1 --- Foundation

-   Scaffold repo (Next.js frontend, FastAPI backend) using IBM Bob; log
    every Bob-assisted step

-   All team members complete the required IBM Bob SkillsBuild course;
    save certificates

-   Manuscript ingestion: upload, chapter chunking

-   Connect watsonx.ai (Granite) and Watson NLU

*Deliverable: raw text → structured character list working end-to-end*

## Week 2 --- Core diagnostic engine

-   Build the world-state tracker (schema in 6.2)

-   Build the contradiction diff engine (state-diff logic, not raw LLM
    comparison)

-   Build the unresolved-thread tracker

*Deliverable: upload a public-domain novel, get back a contradiction
list and thread list*

## Week 3 --- Differentiator and visualization

-   Build the what-if exploration generator (2--3 preset scope types)

-   Build the emotional arc scorer

-   Build the dashboard: relationship graph, pacing heatmap, arc chart,
    thread list, what-if panel

*Deliverable: full pipeline, visually complete, running on a pre-loaded
demo novel*

## Week 4 --- Polish, docs, submission

-   Bug fixes, error handling, loading states

-   Write GitHub README: problem statement, solution description, AI
    approach/architecture, selected theme, IBM Bob usage

-   Record ≤ 3 minute demo video: pre-loaded novel first, then live
    upload

-   Publish submission page with team and repo links

*Deliverable: everything public and accessible before the deadline*

# 9. Scope cuts if time runs short

Cut in this order. Do not cut the world-state tracker or the what-if
generator --- they are what differentiate this from a generic
writing-assistant submission.

-   1\. Live user-upload support --- keep only the pre-loaded demo
    manuscript

-   2\. Emotional arc scorer

-   3\. Reduce the what-if generator to a single preset scope type

# 10. Submission checklist

-   Working prototype built primarily with IBM Bob

-   Every team member\'s IBM Bob SkillsBuild course completion
    certificate

-   Public GitHub repository with README covering: problem statement,
    solution description, AI approach and architecture, selected
    challenge theme, how IBM Bob was used

-   Published project submission page: project and team details, GitHub
    link, publicly accessible demo/presentation video (max 3 minutes)

-   Confirm GitHub repo and video link are public before submitting
