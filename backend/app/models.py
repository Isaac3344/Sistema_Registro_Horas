from __future__ import annotations
from datetime import date, time, datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import field_validator

LUNCH_MINUTES_ALLOWED = {0, 30, 60, 90, 120}

class WorkLogBase(SQLModel):
    worker_name: str = Field(index=True, min_length=2, max_length=120)
    work_date: date = Field(index=True)

    entry_time: Optional[time] = Field(default=None)
    exit_time: Optional[time] = Field(default=None)

    lunch_minutes: int = Field(default=0)

    cost_center: str = Field(default="")
    description: str = Field(default="")

    @field_validator("lunch_minutes")
    @classmethod
    def validate_lunch_minutes(cls, v):
        if v not in LUNCH_MINUTES_ALLOWED:
            raise ValueError("lunch_minutes debe ser 0, 30, 60, 90 o 120")
        return v

class WorkLog(WorkLogBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WorkLogCreate(WorkLogBase):
    pass

class WorkLogUpdate(SQLModel):
    worker_name: Optional[str] = None
    work_date: Optional[date] = None
    entry_time: Optional[time] = None
    exit_time: Optional[time] = None
    lunch_minutes: Optional[int] = None
    cost_center: Optional[str] = None
    description: Optional[str] = None

class WorkLogRead(WorkLogBase):
    id: int
    created_at: datetime
    updated_at: datetime
    total_minutes: int

def compute_total_minutes(entry_time, exit_time, lunch_minutes):
    if not entry_time or not exit_time:
        return 0
    entry = entry_time.hour * 60 + entry_time.minute
    exit_ = exit_time.hour * 60 + exit_time.minute
    return max((exit_ - entry) - lunch_minutes, 0)
