from typing import Any

from pydantic import BaseModel, Field


class CharacterRelationship(BaseModel):
    target_id: str
    type: str
    sentiment: str


class CharacterObject(BaseModel):
    """§6.1 Character object — matches the MVP Guide data contract exactly."""

    id: str
    name: str
    aliases: list[str] = Field(default_factory=list)
    first_appearance: str
    status_by_chapter: dict[str, str] = Field(default_factory=dict)
    relationships: list[CharacterRelationship] = Field(default_factory=list)
    extracted_by: str = "watsonx.granite-3-8b-instruct"

    def model_dump_api(self) -> dict[str, Any]:
        """Return a plain dict suitable for the API response."""
        return self.model_dump()
