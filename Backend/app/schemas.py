from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re

Lang = Literal["en", "hi", "mr"]
Short = Annotated[str, Field(max_length=500)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ExtractRequest(StrictModel):
    text: str = Field(min_length=1, max_length=12000)
    lang: Lang = "en"


class Extraction(StrictModel):
    platform: str = Field(default="", max_length=200)
    usernames: list[Short] = Field(default_factory=list, max_length=30)
    dates: list[Short] = Field(default_factory=list, max_length=30)
    threat_type: str = Field(default="unspecified", max_length=200)
    summary: str = Field(default="", max_length=1500)


class Case(StrictModel):
    platform: Short = ""
    usernames: str = Field(default="", max_length=2000)
    dates: Short = ""
    description: str = Field(default="", max_length=12000)
    accused: str = Field(default="", max_length=2000)
    scenario: Short = ""
    is_minor: bool = False


class GuidanceRequest(StrictModel):
    scenario: str = Field(max_length=500)
    details: Case
    lang: Lang = "en"
    is_minor: bool = False


class Evidence(StrictModel):
    index: int = Field(ge=1, le=200)
    timestamp: str = Field(max_length=40)
    fileName: str = Field(max_length=255)
    fileHash: str = Field(pattern=r"^[a-f0-9]{64}$")
    platform: Short = ""
    note: str = Field(default="", max_length=2000)
    prevHash: str = Field(pattern=r"^[a-f0-9]{64}$")
    entryHash: str = Field(pattern=r"^[a-f0-9]{64}$")

    @field_validator("timestamp")
    @classmethod
    def iso_timestamp(cls, value):
        from datetime import datetime

        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value


class DraftRequest(StrictModel):
    kind: Literal["complaint", "takedown", "section63", "timeline"]
    case: Case
    evidence: list[Evidence] = Field(default_factory=list, max_length=200)
    lang: Lang = "en"
    # Optional edited preview. Always rendered as escaped plain text, never HTML.
    edited_body: str | None = Field(default=None, max_length=250000)
