from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_all_tables
from app.routers import manuscripts


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_all_tables()
    yield


app = FastAPI(
    title="StoryGlide API",
    description="Flight recorder and flight simulator for your manuscript.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(manuscripts.router, prefix="/api")


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"status": "ok"}
