from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class HouseSystem(str, Enum):
    whole_sign = "whole_sign"


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


class AspectConditions(BaseModel):
    applying: bool = False
    perfects: bool = False
    receiverRetrograde: bool = False
    receiverCombust: bool = False
    reception: bool = False
    favorEligible: bool = False


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
    conditions: AspectConditions = Field(default_factory=AspectConditions)


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


class AppResponseContract(BaseModel):
    headline: str
    summary: str
    keyFactors: List[str] = Field(default_factory=list)
    timingTags: List[str] = Field(default_factory=list)
    relationshipTags: List[str] = Field(default_factory=list)
    confidence: int = Field(..., ge=0, le=100)
    contentFactIds: List[str] = Field(default_factory=list)


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


class SkyCurrentRequest(BaseModel):
    datetime: DateTimeInput
    location: LocationInput
    settings: ChartSettings = Field(default_factory=ChartSettings)
    includeContentFacts: bool = True


class MoonStatus(BaseModel):
    kind: Literal["sign", "void"]
    label: str
    sign: str
    nextSign: Optional[str] = None
    until: Optional[str] = None
    remainingLabel: Optional[str] = None


class MoonEvent(BaseModel):
    name: Literal["Full Moon", "New Moon"]
    sign: str
    occursAt: str
    days: float


class SkyCurrentResponse(BaseModel):
    metadata: ChartMetadata
    location: LocationInput
    generatedAt: str
    positions: List[Position] = Field(default_factory=list)
    aspects: List[Aspect] = Field(default_factory=list)
    angles: Dict[str, Position] = Field(default_factory=dict)
    houseCusps: List[float] = Field(default_factory=list)
    ascendant: str
    ascendantLongitude: Optional[float] = None
    midheaven: str
    midheavenLongitude: Optional[float] = None
    moonPhase: str
    moonIllumination: float
    moonStatus: Optional[MoonStatus] = None
    moonEvent: Optional[MoonEvent] = None
    contentFacts: List[ContentFactPacket] = Field(default_factory=list)


class TransitChartRequest(BaseModel):
    natalSubject: ChartSubject
    transitDatetime: DateTimeInput
    transitLocation: LocationInput
    settings: ChartSettings = Field(default_factory=ChartSettings)
    includeContentFacts: bool = True


class TransitHit(BaseModel):
    id: str
    transitPlanet: str
    transitSign: str
    transitHouse: Optional[int] = None
    natalPoint: str
    natalSign: str
    natalHouse: Optional[int] = None
    aspect: str
    orb: float
    applying: Optional[bool] = None
    phase: Optional[Literal["applying", "separating"]] = None
    strength: int = Field(..., ge=0, le=100)
    score: int = Field(..., ge=0)
    exactAt: Optional[str] = None
    knowledgeIds: List[str] = Field(default_factory=list)
    conditions: AspectConditions = Field(default_factory=AspectConditions)


class TransitChartResponse(BaseModel):
    metadata: ChartMetadata
    natal: NatalChartResponse
    transitChart: SkyCurrentResponse
    hits: List[TransitHit] = Field(default_factory=list)
    contentFacts: List[ContentFactPacket] = Field(default_factory=list)


class ProfectionsRequest(BaseModel):
    natalSubject: ChartSubject
    targetDate: str = Field(..., examples=["2026-06-16"])
    respectHouseSystem: bool = False
    includeContentFacts: bool = True


class ProfectionPeriod(BaseModel):
    level: Literal["annual", "monthly"]
    age: int
    house: int
    sign: str
    ruler: str
    startsAt: str
    endsAt: str
    activatedNatalPlanets: List[str] = Field(default_factory=list)


class ProfectionsResponse(BaseModel):
    metadata: ChartMetadata
    natal: NatalChartResponse
    age: int
    annual: ProfectionPeriod
    monthly: ProfectionPeriod
    activatedNatalPlanets: List[str] = Field(default_factory=list)
    contentFacts: List[ContentFactPacket] = Field(default_factory=list)


class PersonalTimingRequest(BaseModel):
    natalSubject: ChartSubject
    targetDatetime: DateTimeInput
    targetLocation: LocationInput
    settings: ChartSettings = Field(default_factory=ChartSettings)
    includeContentFacts: bool = True
    maxTransits: int = Field(12, ge=1, le=50)


class TimingBoostedTransit(BaseModel):
    hit: TransitHit
    baseScore: int
    boostedScore: int
    boostReasons: List[str] = Field(default_factory=list)


class PersonalTimingResponse(BaseModel):
    metadata: ChartMetadata
    app: AppResponseContract
    natal: NatalChartResponse
    currentSky: SkyCurrentResponse
    profections: ProfectionsResponse
    topTransits: List[TransitHit] = Field(default_factory=list)
    timingBoostedTransits: List[TimingBoostedTransit] = Field(default_factory=list)
    activatedHouse: int
    activatedSign: str
    activatedRuler: str
    activatedNatalPlanets: List[str] = Field(default_factory=list)
    contentFacts: List[ContentFactPacket] = Field(default_factory=list)


class SynastryRequest(BaseModel):
    personA: ChartSubject
    personB: ChartSubject
    settings: ChartSettings = Field(default_factory=ChartSettings)
    includeContentFacts: bool = True


class SynastryContact(BaseModel):
    id: str
    fromPerson: Literal["A", "B"]
    fromPoint: str
    fromSign: str
    fromHouse: Optional[int] = None
    toPerson: Literal["A", "B"]
    toPoint: str
    toSign: str
    toHouse: Optional[int] = None
    aspect: str
    orb: float
    strength: int = Field(..., ge=0, le=100)
    score: int = Field(..., ge=0)
    knowledgeIds: List[str] = Field(default_factory=list)


class HouseOverlay(BaseModel):
    id: str
    planetOwner: Literal["A", "B"]
    houseOwner: Literal["A", "B"]
    point: str
    sign: str
    house: int
    knowledgeIds: List[str] = Field(default_factory=list)


class SynastryResponse(BaseModel):
    metadata: ChartMetadata
    app: AppResponseContract
    personA: NatalChartResponse
    personB: NatalChartResponse
    contacts: List[SynastryContact] = Field(default_factory=list)
    houseOverlays: List[HouseOverlay] = Field(default_factory=list)
    contentFacts: List[ContentFactPacket] = Field(default_factory=list)


class CompositeRequest(BaseModel):
    personA: ChartSubject
    personB: ChartSubject
    settings: ChartSettings = Field(default_factory=ChartSettings)
    includeContentFacts: bool = True


class CompositeResponse(BaseModel):
    metadata: ChartMetadata
    app: AppResponseContract
    personA: NatalChartResponse
    personB: NatalChartResponse
    positions: List[Position] = Field(default_factory=list)
    aspects: List[Aspect] = Field(default_factory=list)
    houseCusps: List[float] = Field(default_factory=list)
    angles: Dict[str, Position] = Field(default_factory=dict)
    contentFacts: List[ContentFactPacket] = Field(default_factory=list)


class RelationshipTheme(BaseModel):
    id: str
    label: str
    score: int = Field(..., ge=0)
    source: Literal["synastry", "composite", "overlay"]
    knowledgeIds: List[str] = Field(default_factory=list)


class RelationshipCompareRequest(BaseModel):
    personA: ChartSubject
    personB: ChartSubject
    settings: ChartSettings = Field(default_factory=ChartSettings)
    includeContentFacts: bool = True


class RelationshipCompareResponse(BaseModel):
    metadata: ChartMetadata
    app: AppResponseContract
    synastry: SynastryResponse
    composite: CompositeResponse
    relationshipThemes: List[RelationshipTheme] = Field(default_factory=list)
    contentFacts: List[ContentFactPacket] = Field(default_factory=list)
