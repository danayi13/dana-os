import enum


class GoalType(enum.StrEnum):
    binary = "binary"
    milestone = "milestone"


class GoalStatus(enum.StrEnum):
    active = "active"
    completed = "completed"
    archived = "archived"


class PeriodType(enum.StrEnum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
    custom = "custom"


class GoalDirection(enum.StrEnum):
    at_least = "at_least"
    at_most = "at_most"
    track = "track"  # no threshold — pure observation


class NudgeStateEnum(enum.StrEnum):
    active = "active"
    snoozed = "snoozed"
    dismissed = "dismissed"
