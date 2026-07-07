import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Manuscript(Base):
    __tablename__ = "manuscripts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="processing")
    characters_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    chapters: Mapped[list["Chapter"]] = relationship(
        "Chapter", back_populates="manuscript", cascade="all, delete-orphan"
    )

    def get_characters(self) -> list:
        if self.characters_json is None:
            return []
        return json.loads(self.characters_json)

    def set_characters(self, characters: list) -> None:
        self.characters_json = json.dumps(characters)


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    manuscript_id: Mapped[str] = mapped_column(String, nullable=False)
    chapter_id: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    manuscript: Mapped["Manuscript"] = relationship("Manuscript", back_populates="chapters")
