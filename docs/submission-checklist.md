# StoryGlide — Submission Checklist

Based on §10 of the [MVP Guide](StoryGlide_MVP_Guide.md).

---

## Required Items

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Working prototype built primarily with IBM Bob | ✅ Done | Full pipeline running; 47 backend tests pass; frontend TypeScript clean |
| 2 | IBM Bob SkillsBuild course completion certificate for every team member | ⬜ TODO | Complete the course at [skillsbuild.org](https://skillsbuild.org) and save your certificate PDF |
| 3 | Public GitHub repository | ⬜ TODO | Ensure the repo is set to **Public** before submitting |
| 4 | README — problem statement | ✅ Done | [`README.md`](../README.md) §Problem Statement |
| 5 | README — solution description | ✅ Done | [`README.md`](../README.md) §Solution Description |
| 6 | README — AI approach and architecture | ✅ Done | [`README.md`](../README.md) §AI Approach & Architecture |
| 7 | README — selected challenge theme | ✅ Done | [`README.md`](../README.md) §Selected Challenge Theme |
| 8 | README — how IBM Bob was used | ✅ Done | [`README.md`](../README.md) §How IBM Bob Was Used + [`docs/bob-usage.md`](bob-usage.md) |
| 9 | Published project submission page (team details, GitHub link, video) | ⬜ TODO | Create on the challenge platform before the deadline |
| 10 | Publicly accessible demo/presentation video (max 3 minutes) | ⬜ TODO | Record: pre-loaded novel first, then live upload. Upload to YouTube/Vimeo and set to Public. Add link to README §Demo |
| 11 | GitHub repo and video link confirmed public | ⬜ TODO | Check both links open in an incognito window before submitting |

---

## Pre-submission Steps

### Download the demo novel (required for live demo)
```
https://www.gutenberg.org/files/35/35-0.txt  →  save as  data/the_time_machine.txt
```

### Configure API keys
Fill in `backend/.env` with your watsonx.ai and Watson NLU credentials (see README §API Key Setup).

### Run with real AI
Set `MOCK_AI=false` in `backend/.env` before recording the demo video.

### Set demo manuscript ID
After seeding, copy `backend/demo_manuscript_id.txt` into `frontend/.env.local` as `NEXT_PUBLIC_DEMO_MANUSCRIPT_ID`.

### Demo video script (≤ 3 minutes)
1. **(0:00–0:30)** Open home page → click "View demo analysis →" → show the pre-loaded *Time Machine* dashboard overview (character graph, stat cards).
2. **(0:30–1:00)** Switch to Contradictions tab — explain one flag. Switch to Threads tab — explain one open thread.
3. **(1:00–1:30)** Switch to Emotional Arc tab — walk through the arc chart and pacing heatmap.
4. **(1:30–2:15)** Switch to What-If tab — run a `character_death` scenario on the Time Traveller. Read the narrative sketch and downstream impacts.
5. **(2:15–3:00)** Return to home page — upload a short `.txt` manuscript live. Watch it process and land on the dashboard.

---

## Bob Usage Evidence

Full log: [`docs/bob-usage.md`](bob-usage.md)

Every code-generation step is logged with date, mode, phase, and files produced.
