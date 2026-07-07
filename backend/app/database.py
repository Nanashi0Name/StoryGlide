from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def create_all_tables() -> None:
    """Create all SQLAlchemy-mapped tables if they do not yet exist."""
    # Import models here so their metadata is registered on Base before create_all.
    import app.models.manuscript  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        yield session
