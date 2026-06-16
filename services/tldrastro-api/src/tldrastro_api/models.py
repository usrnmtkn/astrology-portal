from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class HouseSystem(str, Enum):
    whole_sign = "whole_sign"
    placidus = "placidus"
    koch = "koch"
    equal = "equal"
    porphyry = "porphyry"
    regiomontanus = "regiomontanus"


class Zodiac(str, Enum):
    tropical = "tropical"
    sidereal = "sidereal"


class AspectProfile(str, Enum):
    standard = "standard"
    tight = "tight"


class DateTimeInput(BaseModel):
    date: str = Field(..., examples=["1994-04-12"])
    time: Optional[str] = Field(None, examples=["08:35"])
    timeKnown: bool = True
    timeZone: Optional[str] = Field(None, examples=["America/New_York"])
    utc: Optional[str] = Field(None, examples=["1994-04-12T12:35:00.000Z"])


class LocationInput(BaseModel):
    label: str = Field(..., examples=["New York, NY"])
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timeZone: Optional[str] = Field(None, examples=["America/New_York"])


class TimezoneRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    date: str = Field(..., examples=["1994-04-12"])
    time: Optional[str] = Field(None, examples=["08:35"])
    timeZone: Optional[str] = Field(
        None,
        description="Optional IANA timezone override when the caller already knows it.",
        examples=["America/New_York"],
    )


class TimezoneResponse(BaseModel):
    timeZone: str
    utcOffsetMinutes: int
    isDst: bool
    localDateTime: str
    utcDateTime: str
    source: str
    warnings: List[str] = Field(default_factory=list)


class ChartSettings(BaseModel):
    houseSystem: HouseSystem = HouseSystem.whole_sign
    zodiac: Zodiac = Zodiac.tropical
    ayanamsa: Optional[str] = None
    aspectProfile: AspectProfile = AspectProfile.standard
    orbs: Optional[Dict[str, float]] = None


class ChartSubject(BaseModel):
    name: Optional[str] = Field(None, examples=["Maya"])
    datetime: DateTimeInput
    location: LocationInput
    settings: ChartSettings = Field(default_factory=ChartSettings)


class Position(BaseModel):
    point: str
    planet: str
    glyph: str
    longitude: float
    sign: str
    signGlyph: str
    degree: int
    minute: int
    degreeDecimal: float
    house: Optional[int] = None
    retrograde: bool
    motion: Literal["direct", "retrograde"]
    speed: Optional[float] = None
    declination: Optional[float] = None
    theme: Optional[str] = None


class Aspect(BaseModel):
    from_: str = Field(..., alias="from")
    to: str
    type: str
    orb: float
    applying: Optional[bool] = None
    phase: Optional[Literal["applying", "separating"]] = None
    strength: Optional[int] = Field(None, ge=0, le=100)
    exactAt: Optional[str] = None
    fromHouse: Optional[int] = None
    toHouse: Optional[int] = None
    knowledgeIds: List[str] = Field(default_factory=list)


class ContentFactPacket(BaseModel):
    surface: str
    eventType: str
    headline: str
    priority: int = Field(..., ge=0, le=100)
    timeSensitivity: str
    houseSystem: HouseSystem
    zodiac: Zodiac
    facts: Dict[str, Any]
    knowledgeIds: List[str] = Field(default_factory=list)


class NatalChartRequest(BaseModel):
    subject: ChartSubject
    includeContentFacts: bool = True


class ChartMetadata(BaseModel):
    houseSystem: HouseSystem
    zodiac: Zodiac
    calculatedAt: str
    inputWarnings: List[str] = Field(default_factory=list)


class NatalChartResponse(BaseModel):
    metadata: ChartMetadata
    subjectName: Optional[str] = None
    positions: List[Position] = Field(default_factory=list)
    angles: Dict[str, Position] = Field(default_factory=dict)
    houseCusps: List[float] = Field(default_factory=list)
    aspects: List[Aspect] = Field(default_factory=list)
    chartRuler: Optional[str] = None
    sect: Optional[str] = None
    dignitySummary: Dict[str, Any] = Field(default_factory=dict)
    contentFacts: List[ContentFactPacket] = Field(default_factory=list)
