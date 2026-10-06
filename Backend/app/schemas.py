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
    ai_assist: bool = False


class Extraction(StrictModel):
    platform: str = Field(default="", max_length=200)
    usernames: list[Short] = Field(default_factory=list, max_length=30)
    urls: list[Short] = Field(default_factory=list, max_length=30)
    phone_numbers: list[Short] = Field(default_factory=list, max_length=30)
    dates: list[Short] = Field(default_factory=list, max_length=30)
    threat_type: str = Field(default="unspecified", max_length=200)
    summary: str = Field(default="", max_length=1500)
    confidence: float = Field(default=0.5, ge=0, le=1)

    @field_validator("summary")
    @classmethod
    def short_summary(cls, value):
        if len(value.split()) > 60:
            raise ValueError("Summary exceeds 60 words")
        return value


class Case(StrictModel):
    platform: Short = ""
    usernames: str = Field(default="", max_length=2000)
    dates: Short = ""
    description: str = Field(default="", max_length=12000)
    accused: str = Field(default="", max_length=2000)
    scenario: Short = ""
    is_minor: bool = False
    statement: str = Field(default="", max_length=20000)


class GuidanceRequest(StrictModel):
    scenario: str = Field(max_length=500)
    details: Case
    lang: Lang = "en"
    is_minor: bool = False
    ai_assist: bool = False


class StatementRequest(StrictModel):
    case: Case
    lang: Lang = "en"
    ai_assist: bool = False


class RankedChoice(StrictModel):
    id: str = Field(max_length=80)
    explanation: int = Field(ge=0, le=20, strict=True)


class Ranking(StrictModel):
    choices: list[RankedChoice] = Field(max_length=8)


class StatementPlan(StrictModel):
    # The model may reorder supplied facts, but cannot write new facts.
    fact_order: list[Annotated[int, Field(ge=0, le=10, strict=True)]] = Field(
        max_length=10
    )
    introduction: int = Field(ge=0, le=1, strict=True)


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
