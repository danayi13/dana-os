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


class VGrade(enum.StrEnum):
    V0 = "V0"
    V1 = "V1"
    V2 = "V2"
    V3 = "V3"
    V4 = "V4"
    V5 = "V5"
    V6 = "V6"
    V7 = "V7"
    V8 = "V8"
    V9 = "V9"
    V10 = "V10"
    V11 = "V11"
    V12 = "V12"
    V13 = "V13"
    V14 = "V14"
    V15 = "V15"
    V16 = "V16"
    V17 = "V17"

    def to_int(self) -> int:
        return int(self.value[1:])


class GymType(enum.StrEnum):
    recurring = "recurring"
    infrequent = "infrequent"
