"""Pydantic models for job-search skill data."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class Offer(BaseModel):
    role: str
    company: str
    url: str
    location: str = ""
    domain: str = ""
    match: int = 0  # 0-10 scale (10=perfect fit, 7+=strong, 4-6=decent)
    source: str = ""
    notes: str = ""
    level: str = ""  # e.g. "MSc, 5y+", "3-4y", "PhD pref."
    salary: str = ""  # e.g. "€80-140K", "$200-250K", "£70-85K"
    mission: str = ""  # company mission, e.g. "AI for cancer treatment"
    tools: str = ""  # demanded tools/skills, e.g. "Python, PyTorch, Docker"
    deadline: str | None = None
    published_date: str | None = None  # when the offer was published (ISO date)
    hidden_gem: bool = False


class Person(BaseModel):
    name: str
    affiliation: str = ""
    domain: str = ""
    reach: str = ""  # how to contact


class FreelancePlatform(BaseModel):
    name: str
    url: str
    search_terms: str = ""


class RenderContext(BaseModel):
    date: str
    user_name: str = ""
    urgent_deadlines: list[str] = Field(default_factory=list)
    offers: list[Offer] = Field(default_factory=list)
    people: list[Person] = Field(default_factory=list)
    freelance: list[FreelancePlatform] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    admin_notes: list[str] = Field(default_factory=list)


class LinkCheckResult(BaseModel):
    url: str
    status: str  # active, dead, expired, redirect, captcha, error
    http_code: int | None = None
    detail: str = ""


class Source(BaseModel):
    name: str
    url: str
    keywords: list[str] = Field(default_factory=list)
    priority: int = 3
    source_type: str = "board"  # board | announcement | careers_page | news
    published_date: str | None = None  # for announcements/news: original publish date
    last_checked: str | None = None
    discovered: str | None = None
    recommended_by: str | None = None

    @field_validator("last_checked", "discovered", mode="before")
    @classmethod
    def coerce_date_to_str(cls, v: object) -> str | None:
        if v is None:
            return None
        return str(v)


class CleanedOffer(BaseModel):
    """An offer removed or flagged during cleaning."""

    role: str
    company: str
    url: str
    location: str = ""
    status: str  # link check status (dead, expired, redirect, etc.)
    http_code: int | None = None
    detail: str = ""


class CleanReport(BaseModel):
    """Output of js-clean."""

    date: str
    total_checked: int
    kept: int
    removed: int
    flagged: int
    removed_offers: list[CleanedOffer] = Field(default_factory=list)
    flagged_offers: list[CleanedOffer] = Field(default_factory=list)
