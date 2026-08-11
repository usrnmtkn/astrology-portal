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


class EphemerisProvenance(BaseModel):
    library: str
    libraryVersion: Optional[str] = None
    requestedEngine: str
    actualEngine: str
    actualEngines: List[str] = Field(default_factory=list)
    fallback: bool
    dataPath: Optional[str] = None
    returnedFlags: List[int] = Field(default_factory=list)
    calculations: int = 0


class ChartMetadata(BaseModel):
    houseSystem: HouseSystem
    zodiac: Zodiac
    calculatedAt: str
    inputWarnings: List[str] = Field(default_factory=list)
    ephemeris: Optional[EphemerisProvenance] = None


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


ReportHorizon = Literal["1_month", "4_months", "6_months", "12_months"]


class SolarReturnRequest(BaseModel):
    natalSubject: ChartSubject
    targetDate: str = Field(..., examples=["2026-02-18"])
    returnLocation: Optional[LocationInput] = None
    useBirthplace: bool = False
    settings: ChartSettings = Field(default_factory=ChartSettings)
    includeContentFacts: bool = False


class SolarReturnOverlay(BaseModel):
    point: str
    sourceChart: Literal["solar_return", "natal"]
    targetChart: Literal["solar_return", "natal"]
    house: int


class SolarReturnAngleContact(BaseModel):
    point: str
    angle: str
    angleChart: Literal["solar_return", "natal"]
    orb: float


class SolarReturnAspect(BaseModel):
    solarReturnPoint: str
    natalPoint: str
    aspect: str
    orb: float


class SolarReturnLordCondition(BaseModel):
    ruler: str
    sign: str
    house: Optional[int] = None
    retrograde: bool = False
    essentialCondition: Literal["domicile", "exaltation", "detriment", "fall", "peregrine"]
    angular: bool = False


class SolarReturnAnalysis(BaseModel):
    solarReturnToNatalOverlays: List[SolarReturnOverlay] = Field(default_factory=list)
    natalToSolarReturnOverlays: List[SolarReturnOverlay] = Field(default_factory=list)
    angleContacts: List[SolarReturnAngleContact] = Field(default_factory=list)
    aspects: List[SolarReturnAspect] = Field(default_factory=list)
    lordOfYear: SolarReturnLordCondition
    coincidenceChecks: Dict[str, bool] = Field(default_factory=dict)
    bigYearScore: int = Field(..., ge=0)
    bigYearDrivers: List[str] = Field(default_factory=list)


class SolarReturnResponse(BaseModel):
    metadata: ChartMetadata
    returnMoment: str
    location: LocationInput
    natal: NatalChartResponse
    chart: NatalChartResponse
    quadrantHouseSystem: str
    quadrantHouseCusps: List[float] = Field(default_factory=list)
    quadrantHouses: Dict[str, int] = Field(default_factory=dict)
    analysis: SolarReturnAnalysis


class ReportWindowRequest(BaseModel):
    natalSubject: ChartSubject
    start: str = Field(..., examples=["2026-02-18T01:59:00Z"])
    end: str = Field(..., examples=["2027-02-18T07:40:00Z"])
    location: LocationInput
    reportHorizon: ReportHorizon
    settings: ChartSettings = Field(default_factory=ChartSettings)
    includeSolarReturn: bool = True
    includeContentFacts: bool = False
    natalPointLongitudes: Dict[str, float] = Field(default_factory=dict)


class ReportTransitPass(BaseModel):
    exactAt: str
    motion: Literal["direct", "retrograde"]
    transitLongitude: float
    orbWindowStart: Optional[str] = None
    orbWindowEnd: Optional[str] = None
    stationProximityDegrees: Optional[float] = None
    stationAt: Optional[str] = None


class ReportTransitArc(BaseModel):
    id: str
    transitPlanet: str
    natalPoint: str
    natalSign: str
    natalHouse: Optional[int] = None
    aspect: str
    category: Literal["WORK", "SELF", "SEX & LOVE", "FRIENDS & FAMILY"]
    score: int = Field(..., ge=0)
    passCount: int = Field(..., ge=1)
    passes: List[ReportTransitPass] = Field(default_factory=list)
    isReturn: bool = False
    knowledgeIds: List[str] = Field(default_factory=list)


class ReportKeyDate(BaseModel):
    id: str
    occursAt: str
    eventType: str
    transitPlanet: Optional[str] = None
    natalPoint: Optional[str] = None
    aspect: Optional[str] = None
    category: Literal["WORK", "SELF", "SEX & LOVE", "FRIENDS & FAMILY"]
    score: int = Field(..., ge=0)
    exactAt: str


class ReportNatalContact(BaseModel):
    natalPoint: str
    natalHouse: Optional[int] = None
    aspect: str
    orb: float


class ReportLunarEvent(BaseModel):
    id: str
    kind: Literal["new_moon", "full_moon", "solar_eclipse", "lunar_eclipse"]
    subtype: Optional[Literal["total", "annular", "partial", "penumbral", "hybrid"]] = None
    occursAt: str
    longitude: float
    sign: str
    natalHouse: Optional[int] = None
    natalContacts: List[ReportNatalContact] = Field(default_factory=list)


class ReportStation(BaseModel):
    planet: str
    occursAt: str
    longitude: float
    motionAfter: Literal["direct", "retrograde"]
    natalContacts: List[ReportNatalContact] = Field(default_factory=list)


class ReportIngress(BaseModel):
    planet: str
    occursAt: str
    sign: str
    longitude: float
    relevance: List[str] = Field(default_factory=list)


class ReportPeriodSegment(BaseModel):
    id: str
    startsAt: str
    endsAt: str
    label: str
    calendarYear: int


class ReportWindowResponse(BaseModel):
    metadata: ChartMetadata
    reportHorizon: ReportHorizon
    startsAt: str
    endsAt: str
    natal: NatalChartResponse
    profections: ProfectionsResponse
    solarReturn: Optional[SolarReturnResponse] = None
    slowTransitArcs: List[ReportTransitArc] = Field(default_factory=list)
    fastTransitKeyDates: List[ReportKeyDate] = Field(default_factory=list)
    lunarEvents: List[ReportLunarEvent] = Field(default_factory=list)
    stations: List[ReportStation] = Field(default_factory=list)
    ingresses: List[ReportIngress] = Field(default_factory=list)
    periods: List[ReportPeriodSegment] = Field(default_factory=list)
    calendarYearBoundaries: List[str] = Field(default_factory=list)
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
