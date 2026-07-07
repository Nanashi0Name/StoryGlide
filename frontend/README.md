# StoryGlide — Frontend

Next.js 14 (App Router) frontend for StoryGlide.

## Quick start

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set API URL if needed
npm run dev
```

Open http://localhost:3000

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI backend base URL | `http://localhost:8000` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript type check |
