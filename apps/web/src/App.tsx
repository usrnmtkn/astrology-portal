import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
  MapPin,
  Moon,
  Pencil,
  Plus,
  Settings,
  Sparkles,
  Star,
  Sun,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { ContentBundle } from "./content/types";
import { defaultLocation, getAstrodienstSky, getCurrentSky } from "./services/ephemeris";
import {
  getAuthAccount,
  isAuthConfigured,
  loadPersistedProfile,
  onAuthAccountChange,
  signInWithEmail,
  signInWithProvider,
  signOutAuth,
  signUpWithEmail,
  upsertPersistedProfile
} from "./services/auth";
import type { AuthAccount } from "./services/auth";
import {
  createManualChart,
  deleteManualChart,
  listManualCharts,
  updateManualChart
} from "./services/manualCharts";
import type { ManualChart, ManualChartInput } from "./services/manualCharts";
import { hasMapboxToken, reverseGeocodeCity, searchCities } from "./services/mapbox";
import { getInitialAccountMode } from "./services/session";
import { browserTimeZone, timeZoneForLocation, withTimeZone, zonedDateTimeToUtc } from "./services/timezones";
import type { AccountMode, LocationInput, PlanetPosition, SkySnapshot } from "./types";

type PlacementMode = "paragraph" | "table";
type PortalMode = AccountMode | "profile" | "friends" | "account" | "settings";
type TransitTerm = "short" | "long";
type TransitDirection = "applying" | "separating";
type UiTheme = "light" | "dark";
type SignupProvider = "email" | "google";

type UserChart = {
  id: string;
  name: string;
  type: "Birth chart";
  birthDate: string;
  birthTime: string;
  birthCity: string;
  birthLocation?: LocationInput | null;
};

type ChartSettings = {
  houseSystem: "Whole House";
  zodiac: "Tropical";
  aspects: "Standard" | "Tight";
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  provider: SignupProvider;
  avatarUrl?: string;
  sun: string;
  moon: string;
  rising: string;
  currentLocation?: string;
  currentLocationData?: LocationInput | null;
  settings?: ChartSettings;
  charts: UserChart[];
};

type SignupForm = {
  fullName: string;
  email: string;
  password: string;
  birthDate: string;
  birthTime: string;
  unknownBirthTime: boolean;
  birthCity: string;
  birthLocation: LocationInput | null;
};

type TransitForm = {
  name: string;
  birthPlace: string;
  birthLocation: LocationInput | null;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  birthHour: string;
  birthMinute: string;
  birthMeridiem: "AM" | "PM";
  unknownBirthTime: boolean;
  currentLocation: string;
  currentLocationData: LocationInput | null;
  chartDate: string;
};

type ManualChartForm = {
  displayName: string;
  relationshipType: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  birthPlace: string;
  birthLocation: LocationInput | null;
  notes: string;
};

type TransitItem = {
  id: string;
  term: TransitTerm;
  glyph: string;
  transitPlanet: string;
  aspect: string;
  natalPoint: string;
  natalSign: string;
  orb: string;
  direction: TransitDirection;
  arc: number[];
  note: string;
};

type FriendProfileTab = "compatibility" | "updates" | "between" | "chart" | "settings";

type FriendTimingContext = {
  age: number | null;
  profectedHouse: number | null;
  profectedSign: string;
  lordOfYear: string;
};

type CitySuggestion = Awaited<ReturnType<typeof searchCities>>[number];
type SignupTimeParts = {
  hour: string;
  minute: string;
  meridiem: "AM" | "PM";
};

type SignupDateParts = {
  month: string;
  day: string;
  year: string;
};

type AuthMode = "create" | "login";
type SkyDetail = {
  glyph: string;
  kicker: string;
  title: string;
  meta: string;
  body: ReactNode[];
  content?: ContentBundle;
};

type ContentDomain = "sky" | "natal" | "relationship";
type LazyContentRegistry = Pick<
  typeof import("./content/skyRegistry"),
  "approvedVoiceOrKnowledgeFallback" | "aspectContentId" | "currentSkyAspectContentId" | "placementContentId"
>;

type ContentFallback = {
  bundle: ContentBundle;
  summary: string | null;
  body: string | null;
  detailParagraphs: string[];
};

const loadedContentRegistries: Partial<Record<ContentDomain, LazyContentRegistry>> = {};

function normalizeContentIdPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function contentRegistryFor(domain: ContentDomain) {
  return loadedContentRegistries[domain] ?? null;
}

function aspectContentId(planetA: string, aspect: string, planetB: string, domain: ContentDomain = "natal") {
  const registry = contentRegistryFor(domain);

  if (registry) {
    return registry.aspectContentId(planetA, aspect, planetB);
  }

  return `${normalizeContentIdPart(planetA)}-${normalizeContentIdPart(aspect)}-${normalizeContentIdPart(planetB)}`;
}

function currentSkyAspectContentId(planetA: string, aspect: string, planetB: string) {
  const registry = contentRegistryFor("sky");

  if (registry) {
    return registry.currentSkyAspectContentId(planetA, aspect, planetB);
  }

  return `sky-${aspectContentId(planetA, aspect, planetB)}`;
}

function placementContentId(planet: string, sign: string, domain: ContentDomain = "natal") {
  const registry = contentRegistryFor(domain);

  if (registry) {
    return registry.placementContentId(planet, sign);
  }

  return `${normalizeContentIdPart(planet)}-in-${normalizeContentIdPart(sign)}`;
}

function approvedVoiceOrKnowledgeFallback(id: string, domain: ContentDomain = "natal"): ContentFallback {
  const registry = contentRegistryFor(domain);

  if (registry) {
    return registry.approvedVoiceOrKnowledgeFallback(id);
  }

  return {
    bundle: {
      id,
      knowledge: null,
      voice: null,
      status: "INCOMPLETE"
    },
    summary: null,
    body: null,
    detailParagraphs: []
  };
}

function importContentRegistry(domain: ContentDomain): Promise<LazyContentRegistry> {
  if (domain === "sky") {
    return import("./content/skyRegistry");
  }

  if (domain === "relationship") {
    return import("./content/relationshipRegistry");
  }

  return import("./content/natalRegistry");
}

type ProfilePersistencePayload = {
  version: 1;
  profile: UserProfile;
  preferences: {
    theme: UiTheme;
    sunriseOrbEnabled: boolean;
    dyslexiaFriendlyFont: boolean;
    selectedLocation: LocationInput | null;
  };
  updatedAt: string;
};

const selectedLocationStorageKey = "tldrastro:selectedLocation";
const selectedThemeStorageKey = "tldrastro:theme";
const sunriseOrbStorageKey = "tldrastro:sunriseOrb";
const dyslexiaFontStorageKey = "tldrastro:dyslexiaFont";
const userProfileStorageKey = "tldrastro:userProfile";
const portalModeStorageKey = "tldrastro:portalMode";
const pendingSignupStorageKey = "tldrastro:pendingSignup";
const synodicMonthDays = 29.530588;
const lunarMeanDailyMotion = 13.176358;
const zodiacSigns = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];
const traditionalSignRulers: Record<string, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Mars",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Saturn",
  Pisces: "Jupiter"
};
const houseLifeAreas: Record<number, string> = {
  1: "identity, body, and personal direction",
  2: "money, resources, and self-worth",
  3: "communication, siblings, and daily movement",
  4: "home, family, roots, and emotional foundation",
  5: "creativity, pleasure, romance, and children",
  6: "workflows, health, service, and maintenance",
  7: "partnerships, agreements, and direct others",
  8: "shared resources, trust, debt, and deep change",
  9: "belief, study, travel, and perspective",
  10: "career, visibility, reputation, and calling",
  11: "friends, networks, hopes, and belonging",
  12: "rest, privacy, retreat, and hidden pressure"
};
const portalModes: PortalMode[] = ["guest", "member", "profile", "friends", "account", "settings"];
const authenticatedPortalModes: PortalMode[] = ["member", "profile", "friends", "account", "settings"];

function isPortalMode(value: unknown): value is PortalMode {
  return typeof value === "string" && portalModes.includes(value as PortalMode);
}

function isAuthenticatedPortalMode(value: PortalMode): value is Exclude<PortalMode, "guest"> {
  return authenticatedPortalModes.includes(value);
}

function getStoredPortalMode() {
  try {
    const savedMode = window.localStorage.getItem(portalModeStorageKey);

    return isPortalMode(savedMode) ? savedMode : null;
  } catch {
    return null;
  }
}

function getInitialPortalMode(): PortalMode {
  return getStoredPortalMode() ?? getInitialAccountMode();
}

function authenticatedLandingMode(currentMode: PortalMode, restoredMode: PortalMode | null): PortalMode {
  if (isAuthenticatedPortalMode(currentMode)) {
    return currentMode;
  }

  if (restoredMode && isAuthenticatedPortalMode(restoredMode)) {
    return restoredMode;
  }

  return "profile";
}

function unauthenticatedLandingMode(currentMode: PortalMode): PortalMode {
  if (currentMode === "member") {
    return "guest";
  }

  if (currentMode === "friends" || currentMode === "account" || currentMode === "settings") {
    return "profile";
  }

  return currentMode;
}

const placementThemes: Record<string, string> = {
  Sun: "identity and vitality",
  Moon: "mood and instinct",
  Mercury: "thought and messages",
  Venus: "love and taste",
  Mars: "drive and action",
  Jupiter: "growth and belief",
  Saturn: "structure and limits",
  Uranus: "change and disruption",
  Neptune: "dreams and intuition",
  Pluto: "depth and transformation",
  "True Node": "direction and timing"
};

const placementMeanings: Record<string, string> = {
  Sun: "sets the tone for how attention, energy, and confidence want to move.",
  Moon: "describes the emotional weather and what people reach for instinctively.",
  Mercury: "shows how messages, plans, decisions, and nervous energy are moving.",
  Venus: "speaks to taste, attraction, ease, money, and what feels worth choosing.",
  Mars: "points to heat, friction, courage, and the kind of effort that wants an outlet.",
  Jupiter: "expands the room, making growth easier where curiosity is already alive.",
  Saturn: "asks for structure, patience, boundaries, and a more honest relationship with time.",
  Uranus: "breaks the pattern just enough to show what needs more freedom.",
  Neptune: "softens the edges, heightening imagination, longing, and projection.",
  Pluto: "draws attention to pressure, power, endings, and deep internal change.",
  "True Node": "marks the directional pull of the moment and what feels fated, unfamiliar, or newly relevant."
};

const planetMotives: Record<string, string> = {
  Sun: "attention, vitality, and the larger tone of the season",
  Moon: "mood, instinct, and immediate emotional need",
  Mercury: "language, choices, messages, and the story being told",
  Venus: "connection, pleasure, values, and what feels worth choosing",
  Mars: "heat, action, conflict, and the need to move",
  Jupiter: "growth, perspective, appetite, and permission",
  Saturn: "structure, proof, limits, and the reality of time",
  Uranus: "change, disruption, freedom, and what refuses the usual pattern",
  Neptune: "imagination, longing, sensitivity, and the places where things blur",
  Pluto: "pressure, power, obsession, and deep change",
  "True Node": "direction, timing, and the unfamiliar pull forward"
};

const signCurrentStyles: Record<string, string> = {
  Aries: "directness, urgency, courage, and the need to begin",
  Taurus: "stability, embodiment, patience, and material reality",
  Gemini: "curiosity, language, movement, and fast-changing information",
  Cancer: "memory, protection, belonging, and emotional context",
  Leo: "visibility, creative confidence, pride, and the wish to be seen",
  Virgo: "discernment, repair, usefulness, and attention to detail",
  Libra: "relationship, fairness, comparison, and the search for balance",
  Scorpio: "trust, intensity, privacy, and what is happening below the surface",
  Sagittarius: "belief, honesty, perspective, and the need for more room",
  Capricorn: "structure, restraint, responsibility, and practical next steps",
  Aquarius: "systems, distance, objectivity, and the pressure to update old patterns",
  Pisces: "feeling, imagination, porousness, and the pull toward surrender"
};

const planetPlainRoles: Record<string, string> = {
  Sun: "where attention, confidence, and the main tone of the day are moving",
  Moon: "what people feel, need, remember, and react to instinctively",
  Mercury: "how you think, talk, listen, plan, and exchange information",
  Venus: "what feels desirable, pleasant, valuable, or worth choosing",
  Mars: "how heat, effort, anger, courage, and urgency move through the day",
  Jupiter: "where growth, belief, appetite, and possibility get amplified",
  Saturn: "structure, discipline, limits, responsibility, and what can last",
  Uranus: "change, interruption, freedom, and the part of the day that refuses the usual pattern",
  Neptune: "imagination, longing, sensitivity, projection, and the places where facts get blurry",
  Pluto: "pressure, power, obsession, endings, and the need for deeper change",
  "True Node": "direction, timing, and the unfamiliar thing pulling attention forward"
};

const signPlainRoles: Record<string, string> = {
  Aries: "fast, direct, and ready to act",
  Taurus: "slow, practical, and focused on what is tangible",
  Gemini: "curious, verbal, scattered, and full of moving pieces",
  Cancer: "emotional, protective, memory-led, and sensitive to tone",
  Leo: "expressive, visible, proud, and looking for creative honesty",
  Virgo: "specific, observant, corrective, and focused on what can be improved",
  Libra: "relational, comparative, and focused on balance or fairness",
  Scorpio: "private, intense, and alert to control, trust, or hidden motives",
  Sagittarius: "restless, honest, future-facing, and hungry for perspective",
  Capricorn: "serious, contained, practical, and aware of consequences",
  Aquarius: "detached, system-aware, and ready to question the old pattern",
  Pisces: "porous, imaginative, compassionate, and easy to blur around the edges"
};

const aspectPlainRoles: Record<string, string> = {
  conjunction: "a close contact, so both planets speak at once",
  opposition: "a face-off, so two needs ask to be held at the same time",
  square: "a friction point, so something asks for adjustment",
  trine: "an easy flow, so support is available without much force",
  sextile: "a supportive opening, so the opportunity is there if you use it"
};

const defaultTransitForm: TransitForm = {
  name: "",
  birthPlace: "",
  birthLocation: null,
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  birthHour: "",
  birthMinute: "",
  birthMeridiem: "AM",
  unknownBirthTime: false,
  currentLocation: "",
  currentLocationData: null,
  chartDate: new Date().toISOString().slice(0, 10)
};

const defaultManualChartForm: ManualChartForm = {
  displayName: "",
  relationshipType: "friend",
  birthDate: "",
  birthTime: "12:00",
  birthTimeUnknown: false,
  birthPlace: "",
  birthLocation: null,
  notes: ""
};

const defaultChartSettings: ChartSettings = {
  houseSystem: "Whole House",
  zodiac: "Tropical",
  aspects: "Standard"
};

function normalizeChartSettings(settings?: Partial<ChartSettings> | null): ChartSettings {
  return {
    houseSystem: "Whole House",
    zodiac: "Tropical",
    aspects: settings?.aspects === "Tight" ? "Tight" : "Standard"
  };
}

function createBlankTransitForm(): TransitForm {
  return {
    ...defaultTransitForm,
    chartDate: new Date().toISOString().slice(0, 10)
  };
}

const defaultSignupForm: SignupForm = {
  fullName: "",
  email: "",
  password: "",
  birthDate: "",
  birthTime: "",
  unknownBirthTime: false,
  birthCity: "",
  birthLocation: null
};

function isLocationInput(value: unknown): value is LocationInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const location = value as Partial<LocationInput>;

  return (
    typeof location.label === "string" &&
    typeof location.latitude === "number" &&
    typeof location.longitude === "number"
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Partial<UserProfile>;

  return typeof profile.id === "string"
    && typeof profile.name === "string"
    && typeof profile.email === "string"
    && Array.isArray(profile.charts);
}

function isProfilePersistencePayload(value: unknown): value is ProfilePersistencePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<ProfilePersistencePayload>;

  return payload.version === 1 && isUserProfile(payload.profile);
}

function createProfilePersistencePayload({
  profile,
  theme,
  sunriseOrbEnabled,
  dyslexiaFriendlyFont,
  selectedLocation
}: {
  profile: UserProfile;
  theme: UiTheme;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  selectedLocation: LocationInput | null;
}): ProfilePersistencePayload {
  return {
    version: 1,
    profile,
    preferences: {
      theme,
      sunriseOrbEnabled,
      dyslexiaFriendlyFont,
      selectedLocation
    },
    updatedAt: new Date().toISOString()
  };
}

function isSignupForm(value: unknown): value is SignupForm {
  if (!value || typeof value !== "object") {
    return false;
  }

  const form = value as Partial<SignupForm>;

  return typeof form.fullName === "string"
    && typeof form.email === "string"
    && typeof form.password === "string"
    && typeof form.birthDate === "string"
    && typeof form.birthTime === "string"
    && typeof form.unknownBirthTime === "boolean"
    && typeof form.birthCity === "string";
}

function dateInputValue(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string) {
  return new Date(`${value}T12:00:00`);
}

function timeInZoneForInput(date: Date, timeZone = browserTimeZone()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).formatToParts(date);
  const valueFor = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = valueFor("hour") || "12";
  const minute = valueFor("minute") || "00";
  const meridiem = valueFor("dayPeriod").toUpperCase() === "PM" ? "PM" : "AM";

  return `${hour}:${minute} ${meridiem}`;
}

function skyDateTimeFromInput(value: string, location: LocationInput, now: Date = new Date()) {
  const resolvedLocation = withTimeZone(location);
  const localTime = timeInZoneForInput(now, resolvedLocation.timeZone);

  return zonedDateTimeToUtc(value, localTime, resolvedLocation.timeZone);
}

function formatSkyDate(value: string) {
  return dateFromInput(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function formatPlacementDegree(position?: PlanetPosition) {
  if (!position) {
    return "";
  }

  return `${position.degree.toFixed(2)}°`;
}

function formatBriefPlacementDegree(position?: PlanetPosition) {
  if (!position) {
    return "";
  }

  return `${Math.round(position.degree)}°`;
}

function zodiacLongitude(position?: PlanetPosition) {
  if (!position) {
    return 0;
  }

  const signIndex = zodiacSigns.indexOf(position.sign);

  return (Math.max(signIndex, 0) * 30 + position.degree) % 360;
}

function normalizedAngle(value: number) {
  return ((value % 360) + 360) % 360;
}

function zodiacSignForLongitude(longitude: number) {
  return zodiacSigns[Math.floor(normalizedAngle(longitude) / 30)] ?? "Aries";
}

function nextMoonEvent(sky: SkySnapshot) {
  if (sky.moonEvent) {
    return {
      name: sky.moonEvent.name,
      days: sky.moonEvent.days,
      sign: sky.moonEvent.sign,
      occursAt: new Date(sky.moonEvent.occursAt)
    };
  }

  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const phaseAngle = normalizedAngle(zodiacLongitude(moon) - zodiacLongitude(sun));
  const nextEvent = phaseAngle < 180 ? "Full Moon" : "New Moon";
  const degreesUntilEvent = nextEvent === "Full Moon" ? 180 - phaseAngle : 360 - phaseAngle;
  const daysUntilEvent = Math.max(0, (degreesUntilEvent / 360) * synodicMonthDays);
  const generatedAt = new Date(sky.generatedAt);
  const baseTime = Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt;
  const occursAt = new Date(baseTime.getTime() + daysUntilEvent * 86_400_000);
  const moonEventLongitude = zodiacLongitude(moon) + daysUntilEvent * lunarMeanDailyMotion;

  return {
    name: nextEvent,
    days: daysUntilEvent,
    sign: zodiacSignForLongitude(moonEventLongitude),
    occursAt
  };
}

function formatMoonCountdown(days: number) {
  if (days < 0.5) {
    return "less than a day";
  }

  if (days < 1.5) {
    return "about 1 day";
  }

  return `${Math.round(days)} days`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarDaysFor(month: Date) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstOfMonth);

  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getInitialLocation() {
  try {
    const savedLocation = window.localStorage.getItem(selectedLocationStorageKey);

    if (!savedLocation) {
      return {
        location: defaultLocation,
        hasSavedLocation: false
      };
    }

    const parsedLocation = JSON.parse(savedLocation) as unknown;

    if (isLocationInput(parsedLocation)) {
      return {
        location: withTimeZone(parsedLocation),
        hasSavedLocation: true
      };
    }

    return {
      location: defaultLocation,
      hasSavedLocation: false
    };
  } catch {
    return {
      location: defaultLocation,
      hasSavedLocation: false
    };
  }
}

function getInitialTheme(): UiTheme {
  try {
    const savedTheme = window.localStorage.getItem(selectedThemeStorageKey);

    return savedTheme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getInitialSunriseOrb() {
  try {
    return window.localStorage.getItem(sunriseOrbStorageKey) !== "off";
  } catch {
    return true;
  }
}

function getInitialDyslexiaFont() {
  try {
    return window.localStorage.getItem(dyslexiaFontStorageKey) === "on";
  } catch {
    return false;
  }
}

function getInitialUserProfile(): UserProfile | null {
  try {
    const savedProfile = window.localStorage.getItem(userProfileStorageKey);

    if (!savedProfile) {
      return null;
    }

    const parsedProfile = JSON.parse(savedProfile) as unknown;

    return isUserProfile(parsedProfile) ? parsedProfile : null;
  } catch {
    return null;
  }
}

function zodiacFromBirthDate(value: string) {
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const monthValue = isoMatch?.[2] ?? slashMatch?.[1] ?? "";
  const dayValue = isoMatch?.[3] ?? slashMatch?.[2] ?? "";
  const month = Number(monthValue);
  const day = Number(dayValue);

  if (!month || !day) {
    return "Gemini";
  }

  const signStarts = [
    { sign: "Capricorn", month: 1, day: 1 },
    { sign: "Aquarius", month: 1, day: 20 },
    { sign: "Pisces", month: 2, day: 19 },
    { sign: "Aries", month: 3, day: 21 },
    { sign: "Taurus", month: 4, day: 20 },
    { sign: "Gemini", month: 5, day: 21 },
    { sign: "Cancer", month: 6, day: 21 },
    { sign: "Leo", month: 7, day: 23 },
    { sign: "Virgo", month: 8, day: 23 },
    { sign: "Libra", month: 9, day: 23 },
    { sign: "Scorpio", month: 10, day: 23 },
    { sign: "Sagittarius", month: 11, day: 22 },
    { sign: "Capricorn", month: 12, day: 22 }
  ];

  return signStarts.reduce((currentSign, item) => (
    month > item.month || (month === item.month && day >= item.day) ? item.sign : currentSign
  ), "Capricorn");
}

function planetSignFromSky(sky: SkySnapshot, planet: string) {
  return sky.positions.find((position) => position.planet === planet)?.sign ?? "";
}

function natalBigThreeFromSky(sky: SkySnapshot, unknownBirthTime: boolean) {
  return {
    sun: planetSignFromSky(sky, "Sun") || sky.positions[0]?.sign || "Sun pending",
    moon: planetSignFromSky(sky, "Moon") || "Moon pending",
    rising: unknownBirthTime ? "Rising pending" : sky.ascendant
  };
}

function validChartBirthDate(chart?: UserChart) {
  const value = chart?.birthDate?.trim() ?? "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const [, month = "", day = "", year = ""] = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) ?? [];

  if (!month || !day || !year) {
    return "";
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function validChartBirthCity(chart?: UserChart) {
  return chart?.birthCity && chart.birthCity !== "Birth city needed" ? chart.birthCity : "";
}

function validChartBirthTime(chart?: UserChart) {
  return chart?.birthTime && chart.birthTime !== "Birth time needed" ? chart.birthTime : "";
}

function chartNameFromProfile(name: string) {
  const trimmedName = name.trim();

  return trimmedName ? `${trimmedName}'s birth chart` : "My birth chart";
}

function splitSignupBirthTime(value: string): SignupTimeParts {
  const [, hour = "", minute = "", meridiem = "AM"] = value.match(/^(\d{1,2}):(\d{0,2})\s?(AM|PM)$/i) ?? [];

  return {
    hour,
    minute,
    meridiem: meridiem.toUpperCase() === "PM" ? "PM" : "AM"
  };
}

function formatSignupBirthTime({ hour, minute, meridiem }: SignupTimeParts) {
  const cleanHour = hour.replace(/\D/g, "").slice(0, 2);
  const cleanMinute = minute.replace(/\D/g, "").slice(0, 2);

  if (!cleanHour && !cleanMinute) {
    return "";
  }

  return `${cleanHour}:${cleanMinute} ${meridiem}`;
}

function splitSignupBirthDate(value: string): SignupDateParts {
  const [, year = "", month = "", day = ""] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];

  return { month, day, year };
}

function formatSignupBirthDate({ month, day, year }: SignupDateParts) {
  const cleanMonth = month.replace(/\D/g, "").slice(0, 2);
  const cleanDay = day.replace(/\D/g, "").slice(0, 2);
  const cleanYear = year.replace(/\D/g, "").slice(0, 4);

  if (cleanMonth.length !== 2 || cleanDay.length !== 2 || cleanYear.length !== 4) {
    return "";
  }

  return `${cleanYear}-${cleanMonth}-${cleanDay}`;
}

function formatProfileBirthDate(value: string) {
  const { month, day, year } = splitSignupBirthDate(value);

  return month && day && year ? `${month}/${day}/${year}` : value;
}

function formatProfileBirthDateLong(value: string) {
  const [, year = "", month = "", day = ""] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (!year || Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function twentyFourHourTimeToDisplay(value: string) {
  const [, rawHour = "", rawMinute = ""] = value.match(/^(\d{1,2}):(\d{2})/) ?? [];
  const hour = Number(rawHour);

  if (!rawHour || Number.isNaN(hour)) {
    return "12:00 PM";
  }

  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${rawMinute || "00"} ${meridiem}`;
}

function displayTimeToTwentyFourHour(value: string | null | undefined) {
  if (!value) {
    return "12:00";
  }

  const [, rawHour = "", rawMinute = "00", meridiem = "AM"] = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i) ?? [];
  const hour = Number(rawHour);

  if (!rawHour || Number.isNaN(hour)) {
    return value.slice(0, 5);
  }

  const hour24 = meridiem.toUpperCase() === "PM"
    ? (hour % 12) + 12
    : hour % 12;

  return `${String(hour24).padStart(2, "0")}:${rawMinute}`;
}

function manualChartFormFromChart(chart?: ManualChart | null): ManualChartForm {
  if (!chart) {
    return defaultManualChartForm;
  }

  return {
    displayName: chart.displayName,
    relationshipType: chart.relationshipType || "friend",
    birthDate: chart.birthDate,
    birthTime: displayTimeToTwentyFourHour(chart.birthTime),
    birthTimeUnknown: chart.birthTimeUnknown,
    birthPlace: chart.birthPlace,
    birthLocation: chart.birthLocation,
    notes: chart.notes ?? ""
  };
}

function manualChartBigThree(chart: ManualChart) {
  if (!chart.natalChart) {
    return {
      sun: zodiacFromBirthDate(chart.birthDate),
      moon: "Moon pending",
      rising: chart.birthTimeUnknown ? "Rising pending" : "Rising pending"
    };
  }

  return natalBigThreeFromSky(chart.natalChart, chart.birthTimeUnknown);
}

function manualChartSubtitle(chart: ManualChart) {
  const birthTime = chart.birthTimeUnknown ? "Time unknown" : twentyFourHourTimeToDisplay(chart.birthTime ?? "12:00");

  return `${formatProfileBirthDateLong(chart.birthDate)} · ${birthTime} · ${compactCityLabel(chart.birthPlace)}`;
}

function createUserProfile(form: SignupForm, provider: SignupProvider, account?: AuthAccount | null): UserProfile {
  const name = form.fullName.trim() || account?.name || (provider === "email" ? "New stargazer" : `${providerLabel(provider)} account`);
  const email = account?.email || form.email.trim() || `${provider}@tldrastro.local`;
  const resolvedProvider = normalizeSignupProvider(account?.provider, provider);
  const sun = zodiacFromBirthDate(form.birthDate);
  const chart: UserChart = {
    id: `chart-${Date.now()}`,
    name: chartNameFromProfile(name),
    type: "Birth chart",
    birthDate: form.birthDate || "Birth date needed",
    birthTime: form.unknownBirthTime ? "Time unknown" : form.birthTime || "Birth time needed",
    birthCity: form.birthCity.trim() || "Birth city needed",
    birthLocation: form.birthLocation
  };

  return {
    id: account?.id ?? `user-${Date.now()}`,
    name,
    email,
    provider: resolvedProvider,
    avatarUrl: account?.avatarUrl,
    sun,
    moon: "Moon pending",
    rising: form.unknownBirthTime || !form.birthTime ? "Rising pending" : "Rising pending",
    settings: defaultChartSettings,
    charts: [chart]
  };
}

function normalizeSignupProvider(value: string | undefined, fallback: SignupProvider): SignupProvider {
  return value === "email" || value === "google" ? value : fallback;
}

function readPendingSignupForm() {
  try {
    const savedForm = window.localStorage.getItem(pendingSignupStorageKey);

    if (!savedForm) {
      return defaultSignupForm;
    }

    const parsedForm = JSON.parse(savedForm) as unknown;

    return isSignupForm(parsedForm) ? parsedForm : defaultSignupForm;
  } catch {
    return defaultSignupForm;
  }
}

function savePendingSignupForm(form: SignupForm) {
  try {
    window.localStorage.setItem(pendingSignupStorageKey, JSON.stringify(form));
  } catch {
    return;
  }
}

function clearPendingSignupForm() {
  try {
    window.localStorage.removeItem(pendingSignupStorageKey);
  } catch {
    return;
  }
}

function providerLabel(provider: SignupProvider) {
  const labels: Record<SignupProvider, string> = {
    email: "Email",
    google: "Google"
  };

  return labels[provider];
}

function profileInitials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "tldr";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function profileFirstName(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "Profile";
  return source.split(/\s+/).filter(Boolean)[0] ?? "Profile";
}

function compactCityLabel(city: string) {
  const stateMap: Record<string, string> = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
    Wisconsin: "WI",
    Wyoming: "WY"
  };
  const withoutCountry = city.replace(/,\s*United States$/i, "").trim();

  return withoutCountry
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => (index > 0 && stateMap[part] ? stateMap[part] : part))
    .join(", ");
}

function chartSetupSteps(profile: UserProfile) {
  const primaryChart = profile.charts[0];
  const birthDate = validChartBirthDate(primaryChart);
  const birthTime = Boolean(primaryChart?.birthTime && primaryChart.birthTime !== "Birth time needed");
  const birthCity = Boolean(primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed");
  const currentCity = Boolean(profile.currentLocation?.trim());

  return [
    { label: "Birth date", complete: Boolean(birthDate) },
    { label: "Birth time", complete: birthTime },
    { label: "Birth city", complete: birthCity },
    { label: "Current city", complete: currentCity }
  ];
}

function hasCompleteChartSetup(profile: UserProfile) {
  return chartSetupSteps(profile).every((step) => step.complete);
}

function chartFlowStepsLeft(profile: UserProfile) {
  const primaryChart = profile.charts[0];
  const savedBirthDate = validChartBirthDate(primaryChart);
  const savedBirthCity = Boolean(primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed");
  const birthInfoComplete = Boolean(savedBirthDate && savedBirthCity);
  const currentCityComplete = Boolean(profile.currentLocation?.trim());

  return [
    birthInfoComplete ? "" : "Birth information",
    currentCityComplete ? "" : "Current city"
  ].filter(Boolean).length;
}

function ProfileAvatar({ profile, size = "regular" }: { profile: UserProfile; size?: "regular" | "large" }) {
  return (
    <span className={`profile-avatar profile-avatar-${size}`} aria-hidden="true">
      {profile.avatarUrl ? (
        <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        profileInitials(profile.name, profile.email)
      )}
    </span>
  );
}

function SmileNavIcon({ size = 18 }: { size?: number }) {
  return (
    <svg aria-hidden="true" fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M8.5 14q3.5 3 7 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M9.5 10h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      <path d="M14.5 10h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

function BrandAsterisk({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth="13" strokeLinecap="round">
        <line x1="50" y1="87" x2="50" y2="13" />
        <line x1="82.04" y1="68.5" x2="17.96" y2="31.5" />
        <line x1="82.04" y1="31.5" x2="17.96" y2="68.5" />
      </g>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="google-mark" aria-hidden="true" viewBox="0 0 20 20" focusable="false">
      <path d="M19.6 10.23c0-.71-.06-1.39-.18-2.05H10v3.87h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.35Z" fill="#4285F4" />
      <path d="M10 20c2.7 0 4.96-.9 6.62-2.42l-3.23-2.51c-.9.6-2.04.95-3.39.95a5.9 5.9 0 0 1-5.6-4.12H1.06v2.59A9.99 9.99 0 0 0 10 20Z" fill="#34A853" />
      <path d="M4.4 11.9a6.01 6.01 0 0 1 0-3.8V5.51H1.06a10 10 0 0 0 0 8.98L4.4 11.9Z" fill="#FBBC04" />
      <path d="M10 3.98c1.47 0 2.79.5 3.82 1.49l2.87-2.86A9.6 9.6 0 0 0 10 0 9.99 9.99 0 0 0 1.06 5.51L4.4 8.1A5.9 5.9 0 0 1 10 3.98Z" fill="#E94235" />
    </svg>
  );
}

const sampleTransits: TransitItem[] = [
  {
    id: "sun-square-mercury",
    term: "short",
    glyph: "□",
    transitPlanet: "Sun",
    aspect: "square",
    natalPoint: "Mercury",
    natalSign: "Pisces",
    orb: "0° 41'",
    direction: "separating",
    arc: [2.4, 1.5, 0.6, 0.1, 1.2, 2.1],
    note: "The day asks for cleaner language. Name the pressure point before you try to solve it."
  },
  {
    id: "mercury-quincunx-uranus",
    term: "short",
    glyph: "⚻",
    transitPlanet: "Mercury",
    aspect: "quincunx",
    natalPoint: "Uranus",
    natalSign: "Scorpio",
    orb: "0° 17'",
    direction: "separating",
    arc: [1.8, 1.1, 0.4, 0.2, 0.9, 1.6],
    note: "Plans may need a small adjustment rather than a dramatic rewrite."
  },
  {
    id: "mars-sextile-mercury",
    term: "short",
    glyph: "✶",
    transitPlanet: "Mars",
    aspect: "sextile",
    natalPoint: "Mercury",
    natalSign: "Pisces",
    orb: "0° 31'",
    direction: "separating",
    arc: [2.1, 1.2, 0.5, 0.2, 0.8, 1.7],
    note: "Action and language can cooperate when the request is specific."
  },
  {
    id: "mercury-opposition-neptune",
    term: "short",
    glyph: "☍",
    transitPlanet: "Mercury",
    aspect: "opposition",
    natalPoint: "Neptune",
    natalSign: "Sagittarius",
    orb: "1° 04'",
    direction: "separating",
    arc: [2.8, 2.0, 1.1, 0.4, 0.9, 1.8],
    note: "Check assumptions. The most poetic interpretation is not always the most useful one."
  },
  {
    id: "mercury-trine-mars",
    term: "short",
    glyph: "△",
    transitPlanet: "Mercury",
    aspect: "trine",
    natalPoint: "Mars",
    natalSign: "Virgo",
    orb: "1° 29'",
    direction: "applying",
    arc: [2.9, 2.1, 1.4, 0.8, 0.3, 0.6],
    note: "Momentum returns through practical words, direct asks, and useful edits."
  },
  {
    id: "jupiter-quincunx-mars",
    term: "long",
    glyph: "⚻",
    transitPlanet: "Jupiter",
    aspect: "quincunx",
    natalPoint: "Mars",
    natalSign: "Virgo",
    orb: "0° 30'",
    direction: "applying",
    arc: [1.7, 1.2, 0.8, 0.4, 0.2, 0.5],
    note: "Growth is available, but it wants a cleaner use of energy."
  },
  {
    id: "saturn-sextile-ascendant",
    term: "long",
    glyph: "✶",
    transitPlanet: "Saturn",
    aspect: "sextile",
    natalPoint: "Ascendant",
    natalSign: "Scorpio",
    orb: "0° 43'",
    direction: "separating",
    arc: [1.2, 0.8, 0.4, 0.1, 0.7, 1.1],
    note: "A more durable self-presentation is forming through limits, pace, and repetition."
  },
  {
    id: "saturn-quincunx-moon",
    term: "long",
    glyph: "⚻",
    transitPlanet: "Saturn",
    aspect: "quincunx",
    natalPoint: "Moon",
    natalSign: "Libra",
    orb: "0° 55'",
    direction: "separating",
    arc: [1.5, 1.0, 0.6, 0.2, 0.4, 0.9],
    note: "Emotional expectations may need more structure before they feel calm."
  },
  {
    id: "uranus-square-sun",
    term: "long",
    glyph: "□",
    transitPlanet: "Uranus",
    aspect: "square",
    natalPoint: "Sun",
    natalSign: "Aquarius",
    orb: "2° 24'",
    direction: "applying",
    arc: [3.0, 2.5, 2.0, 1.5, 1.0, 0.7],
    note: "The identity story is loosening. Give the future a little more room to interrupt."
  },
  {
    id: "pluto-square-chiron",
    term: "long",
    glyph: "□",
    transitPlanet: "Pluto",
    aspect: "square",
    natalPoint: "Chiron",
    natalSign: "Taurus",
    orb: "0° 13'",
    direction: "separating",
    arc: [0.9, 0.5, 0.2, 0.1, 0.6, 1.0],
    note: "A deep repair process is active around agency, grief, and old survival patterns."
  }
];

const transitAspectDefinitions = [
  { type: "conjunction", exact: 0, orb: 4 },
  { type: "sextile", exact: 60, orb: 3 },
  { type: "square", exact: 90, orb: 4 },
  { type: "trine", exact: 120, orb: 4 },
  { type: "opposition", exact: 180, orb: 4 }
] as const;

const longTransitPlanets = new Set(["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "True Node"]);

function angularDistance(first: number, second: number) {
  const difference = Math.abs(normalizedAngle(first - second));
  return difference > 180 ? 360 - difference : difference;
}

function formatOrb(orb: number) {
  const degrees = Math.floor(orb);
  const minutes = Math.round((orb - degrees) * 60);

  return `${degrees}° ${String(minutes).padStart(2, "0")}'`;
}

function transitNote(transitPlanet: string, aspect: string, natalPoint: string) {
  const tones: Record<string, string> = {
    conjunction: "starts a direct conversation with",
    sextile: "opens a cooperative path to",
    square: "creates useful friction with",
    trine: "moves smoothly through",
    opposition: "pulls awareness across"
  };

  return `${transitPlanet} ${tones[aspect] ?? "contacts"} your natal ${natalPoint}. Read this as timing: today's sky is activating that part of your chart.`;
}

function buildNatalTransitItems(transitPositions: PlanetPosition[], natalPositions: PlanetPosition[]): TransitItem[] {
  return transitPositions.flatMap((transitPosition) => (
    natalPositions.flatMap((natalPosition) => {
      const separation = angularDistance(zodiacLongitude(transitPosition), zodiacLongitude(natalPosition));
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= definition.orb)
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      if (!aspect) {
        return [];
      }

      const id = `${transitPosition.planet}-${aspect.type}-${natalPosition.planet}`.toLowerCase().replace(/\s+/g, "-");

      return {
        id,
        term: longTransitPlanets.has(transitPosition.planet) ? "long" : "short",
        glyph: aspectGlyph(aspect.type),
        transitPlanet: transitPosition.planet,
        aspect: aspect.type,
        natalPoint: natalPosition.planet,
        natalSign: natalPosition.sign,
        orb: formatOrb(aspect.orbValue),
        direction: aspect.orbValue <= 1 ? "applying" : "separating",
        arc: [aspect.orbValue + 1.8, aspect.orbValue + 1.1, aspect.orbValue + 0.4, aspect.orbValue, aspect.orbValue + 0.5, aspect.orbValue + 1.2],
        note: transitNote(transitPosition.planet, aspect.type, natalPosition.planet)
      } satisfies TransitItem;
    })
  ))
    .sort((first, second) => Number.parseFloat(first.orb) - Number.parseFloat(second.orb))
    .slice(0, 12);
}

function transitOrbValue(transit: TransitItem) {
  const [degreePart = "0", minutePart = "0"] = transit.orb.split(" ");
  const degrees = Number.parseFloat(degreePart);
  const minutes = Number.parseFloat(minutePart.replace("'", ""));

  return (Number.isFinite(degrees) ? degrees : 0) + (Number.isFinite(minutes) ? minutes / 60 : 0);
}

function completedAgeOnDate(birthDate: string, currentDateValue: string) {
  const [, birthYear = "", birthMonth = "", birthDay = ""] = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
  const currentDate = new Date(currentDateValue);

  if (!birthYear || Number.isNaN(currentDate.getTime())) {
    return null;
  }

  const year = Number(birthYear);
  const month = Number(birthMonth);
  const day = Number(birthDay);
  let age = currentDate.getUTCFullYear() - year;
  const hasBirthdayPassed = currentDate.getUTCMonth() + 1 > month
    || (currentDate.getUTCMonth() + 1 === month && currentDate.getUTCDate() >= day);

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function signAtWholeSignHouse(ascendant: string, house: number) {
  const ascendantIndex = zodiacSigns.indexOf(ascendant);

  if (ascendantIndex < 0 || house < 1) {
    return "";
  }

  return zodiacSigns[(ascendantIndex + house - 1) % 12] ?? "";
}

function wholeSignHouseForSign(sign: string, ascendant: string) {
  const signIndex = zodiacSigns.indexOf(sign);
  const ascendantIndex = zodiacSigns.indexOf(ascendant);

  if (signIndex < 0 || ascendantIndex < 0) {
    return null;
  }

  return ((signIndex - ascendantIndex + 12) % 12) + 1;
}

function friendTimingContext(chart: ManualChart, currentSky: SkySnapshot): FriendTimingContext {
  const age = completedAgeOnDate(chart.birthDate, currentSky.generatedAt);
  const ascendant = chart.natalChart?.ascendant ?? "";
  const profectedHouse = age === null ? null : (age % 12) + 1;
  const profectedSign = profectedHouse ? signAtWholeSignHouse(ascendant, profectedHouse) : "";
  const lordOfYear = traditionalSignRulers[profectedSign] ?? "";

  return {
    age,
    profectedHouse,
    profectedSign,
    lordOfYear
  };
}

function timingBoostForTransit(transit: TransitItem, chart: ManualChart, timing: FriendTimingContext) {
  const natalPoint = chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint);
  let score = 0;

  if (timing.lordOfYear && transit.transitPlanet === timing.lordOfYear) {
    score += 14;
  }

  if (timing.profectedHouse && natalPoint?.house === timing.profectedHouse) {
    score += 12;
  }

  if (natalPoint?.house && [1, 4, 7, 10].includes(natalPoint.house)) {
    score += 7;
  }

  return score;
}

function rankedFriendTransits(currentSky: SkySnapshot, chart: ManualChart) {
  const timing = friendTimingContext(chart, currentSky);

  return buildNatalTransitItems(currentSky.positions, chart.natalChart?.positions ?? [])
    .sort((first, second) => {
      const firstScore = (first.term === "long" ? 8 : 0)
        + (["Sun", "Moon", "Ascendant", "Midheaven"].includes(first.natalPoint) ? 10 : 0)
        + timingBoostForTransit(first, chart, timing)
        - transitOrbValue(first);
      const secondScore = (second.term === "long" ? 8 : 0)
        + (["Sun", "Moon", "Ascendant", "Midheaven"].includes(second.natalPoint) ? 10 : 0)
        + timingBoostForTransit(second, chart, timing)
        - transitOrbValue(second);

      return secondScore - firstScore;
    });
}

function transitLifeArea(transit: TransitItem, chart: ManualChart) {
  const natalPoint = chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint);

  return natalPoint?.house ? `${ordinalHouse(natalPoint.house)} house` : "house pending";
}

function transitLifeAreaTheme(transit: TransitItem, chart: ManualChart) {
  const natalPoint = chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint);

  return natalPoint?.house ? houseLifeAreas[natalPoint.house] ?? "life area" : "life area pending";
}

function currentSkyHouseActivations(currentSky: SkySnapshot, chart: ManualChart) {
  const ascendant = chart.natalChart?.ascendant ?? "";

  return currentSky.positions
    .map((position) => ({
      planet: position.planet,
      sign: position.sign,
      house: wholeSignHouseForSign(position.sign, ascendant)
    }))
    .filter((activation): activation is { planet: string; sign: string; house: number } => Boolean(activation.house))
    .sort((first, second) => {
      const firstAngular = [1, 4, 7, 10].includes(first.house) ? 0 : 1;
      const secondAngular = [1, 4, 7, 10].includes(second.house) ? 0 : 1;

      return firstAngular - secondAngular || first.house - second.house;
    });
}

function friendUpdateSummary(chart: ManualChart, transit?: TransitItem) {
  if (!transit) {
    return `${chart.displayName}'s natal chart is saved. Today's exact contacts will appear when their calculated chart has active transit hits.`;
  }

  const area = transitLifeArea(transit, chart);
  const areaTheme = transitLifeAreaTheme(transit, chart);
  const content = approvedVoiceOrKnowledgeFallback(aspectContentId(transit.transitPlanet, transit.aspect, transit.natalPoint));

  return content.summary ?? `${transit.transitPlanet} ${transit.aspect} ${transit.natalPoint} is active in their ${area}: ${areaTheme}. This is timing, not a verdict.`;
}

function timingSummary(chart: ManualChart, timing: FriendTimingContext) {
  if (!timing.profectedHouse || !timing.profectedSign || !timing.lordOfYear) {
    return `${chart.displayName}'s annual timing is pending until their birth time and rising sign are available.`;
  }

  return `${chart.displayName} is in a ${ordinalHouse(timing.profectedHouse)} house year: ${houseLifeAreas[timing.profectedHouse]}. ${timing.lordOfYear} is lord of the year, so ${timing.lordOfYear} contacts rank higher for them.`;
}

function compatibilityHighlights(profileNatalSky: SkySnapshot | null, chart: ManualChart) {
  const friendSky = chart.natalChart;
  const friendBigThree = manualChartBigThree(chart);
  const highlights = [
    {
      title: "Chart signature",
      body: `${chart.displayName}'s Sun is in ${friendBigThree.sun}, Moon in ${friendBigThree.moon}, and rising is ${friendBigThree.rising}.`
    }
  ];

  if (!profileNatalSky || !friendSky) {
    highlights.push({
      title: "Compatibility pending",
      body: "Add or calculate both charts to compare natal contacts, shared elements, and relationship timing."
    });
    return highlights;
  }

  const synastryHits = profileNatalSky.positions.flatMap((yourPosition) => (
    friendSky.positions.flatMap((theirPosition) => {
      const separation = angularDistance(zodiacLongitude(yourPosition), zodiacLongitude(theirPosition));
      const aspect = transitAspectDefinitions
        .map((definition) => ({ ...definition, orbValue: Math.abs(separation - definition.exact) }))
        .filter((definition) => definition.orbValue <= 5)
        .sort((first, second) => first.orbValue - second.orbValue)[0];

      return aspect ? [{ yourPosition, theirPosition, aspect }] : [];
    })
  )).filter((hit) => ["Sun", "Moon", "Venus", "Mars", "Mercury", "Saturn"].includes(hit.yourPosition.planet) && ["Sun", "Moon", "Venus", "Mars", "Mercury", "Saturn"].includes(hit.theirPosition.planet));

  const topHit = synastryHits[0];
  if (topHit) {
    highlights.push({
      title: `${topHit.yourPosition.planet} ${topHit.aspect.type} ${topHit.theirPosition.planet}`,
      body: `A close natal contact connects your ${topHit.yourPosition.planet} with ${chart.displayName}'s ${topHit.theirPosition.planet}. This is a static relationship pattern: it describes the baseline, not today's mood.`
    });
  }

  const yourElement = profileNatalSky.dominantElement;
  const theirElement = friendSky.dominantElement;
  highlights.push({
    title: yourElement === theirElement ? `${yourElement} emphasis` : `${yourElement} meets ${theirElement}`,
    body: yourElement === theirElement
      ? `Both charts lean ${yourElement.toLowerCase()}, so the relationship may find common language through the same basic tempo.`
      : `Your chart leans ${yourElement.toLowerCase()} while theirs leans ${theirElement.toLowerCase()}, giving the connection different instincts to translate.`
  });

  return highlights.slice(0, 3);
}

function relationshipWeather(profileTransits: TransitItem[], friendTransits: TransitItem[], chart: ManualChart) {
  const sharedPlanets = profileTransits.flatMap((yourTransit) => (
    friendTransits
      .filter((friendTransit) => friendTransit.transitPlanet === yourTransit.transitPlanet)
      .map((friendTransit) => ({ yourTransit, friendTransit }))
  ));

  if (sharedPlanets.length > 0) {
    return sharedPlanets.slice(0, 3).map(({ yourTransit, friendTransit }) => ({
      title: `${yourTransit.transitPlanet} is touching both charts`,
      body: `For you it contacts ${yourTransit.natalPoint}; for ${chart.displayName}, it contacts ${friendTransit.natalPoint}. Same sky, different room.`
    }));
  }

  return friendTransits.slice(0, 2).map((transit) => ({
    title: `${chart.displayName}'s current weather`,
    body: `${transit.transitPlanet} ${transit.aspect} ${transit.natalPoint} may shape how available, direct, or sensitive they feel right now.`
  }));
}

function circleActivationCards(currentSky: SkySnapshot, charts: ManualChart[]) {
  const rows = charts
    .filter((chart) => chart.natalChart)
    .map((chart) => ({
      chart,
      transits: rankedFriendTransits(currentSky, chart).slice(0, 5),
      timing: friendTimingContext(chart, currentSky)
    }));
  const byPlanet = new Map<string, ManualChart[]>();
  const byHouse = new Map<number, ManualChart[]>();
  const byProfectedHouse = new Map<number, ManualChart[]>();
  const byLordOfYear = new Map<string, ManualChart[]>();

  rows.forEach(({ chart, transits, timing }) => {
    if (timing.profectedHouse) {
      byProfectedHouse.set(timing.profectedHouse, [...(byProfectedHouse.get(timing.profectedHouse) ?? []), chart]);
    }

    if (timing.lordOfYear) {
      byLordOfYear.set(timing.lordOfYear, [...(byLordOfYear.get(timing.lordOfYear) ?? []), chart]);
    }

    transits.forEach((transit) => {
      byPlanet.set(transit.transitPlanet, [...(byPlanet.get(transit.transitPlanet) ?? []), chart]);
      const natalPoint = chart.natalChart?.positions.find((position) => position.planet === transit.natalPoint);

      if (natalPoint?.house) {
        byHouse.set(natalPoint.house, [...(byHouse.get(natalPoint.house) ?? []), chart]);
      }
    });
  });

  const planetCards = Array.from(byPlanet.entries())
    .filter(([, activeCharts]) => new Set(activeCharts.map((chart) => chart.id)).size >= 2)
    .map(([planet, activeCharts]) => {
      const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());

      return {
        title: `${planet} is active in your circle`,
        body: `${uniqueCharts.slice(0, 3).map((chart) => chart.displayName).join(", ")} ${uniqueCharts.length === 1 ? "has" : "have"} ${planet} contacts in the current sky.`
      };
    });
  const houseCards = Array.from(byHouse.entries())
    .filter(([, activeCharts]) => new Set(activeCharts.map((chart) => chart.id)).size >= 2)
    .map(([house, activeCharts]) => {
      const uniqueCharts = Array.from(new Map(activeCharts.map((chart) => [chart.id, chart])).values());

      return {
        title: `${ordinalHouse(house)} house repetition`,
        body: `${uniqueCharts.slice(0, 3).map((chart) => chart.displayName).join(", ")} are all getting ${ordinalHouse(house)} house activation.`
      };
    });
  const profectionCards = Array.from(byProfectedHouse.entries())
    .filter(([, activeCharts]) => activeCharts.length >= 2)
    .map(([house, activeCharts]) => ({
      title: `${ordinalHouse(house)} house years repeat`,
      body: `${activeCharts.slice(0, 3).map((chart) => chart.displayName).join(", ")} are in ${ordinalHouse(house)} house years, so ${houseLifeAreas[house]} may be louder across the circle.`
    }));
  const lordCards = Array.from(byLordOfYear.entries())
    .filter(([, activeCharts]) => activeCharts.length >= 2)
    .map(([planet, activeCharts]) => ({
      title: `${planet} years in your circle`,
      body: `${activeCharts.slice(0, 3).map((chart) => chart.displayName).join(", ")} have ${planet} as lord of the year. ${planet} transits may land with extra relevance for them.`
    }));

  return [...profectionCards, ...lordCards, ...planetCards, ...houseCards].slice(0, 3);
}

function circleFeedPreviewCards(currentSky: SkySnapshot, charts: ManualChart[]) {
  const calculatedCharts = charts.filter((chart) => chart.natalChart);
  const circleCards = circleActivationCards(currentSky, charts);

  if (circleCards.length > 0) {
    return circleCards.map((card) => ({
      ...card,
      label: "Circle pattern"
    }));
  }

  if (calculatedCharts.length === 1) {
    const chart = calculatedCharts[0];
    const topTransit = rankedFriendTransits(currentSky, chart)[0];
    const timing = friendTimingContext(chart, currentSky);

    return [
      {
        label: "Friend update",
        title: topTransit ? `${chart.displayName}: ${topTransit.transitPlanet} ${topTransit.aspect} ${topTransit.natalPoint}` : `${chart.displayName}'s update is ready`,
        body: topTransit ? friendUpdateSummary(chart, topTransit) : timingSummary(chart, timing)
      },
      {
        label: "Comparison chart",
        title: `${chart.displayName} and you`,
        body: "One friend is enough for compatibility, synastry-style contacts, chart signatures, and relationship weather. Select their profile below to read the comparison."
      },
      {
        label: "Relationship weather",
        title: "Between Us is active",
        body: "This compares what today's sky is doing to you and to them, then looks for shared planets, pressure points, and timing themes between both charts."
      }
    ];
  }

  return [
    {
      label: "Friend updates",
      title: "Current astrology for each person",
      body: "Add one friend to read their chart, compare it with yours, and rank today's transits by house activation, angularity, and annual timing."
    },
    {
      label: "Circle patterns",
      title: "Who is feeling something similar",
      body: "With two or more saved friends, repeated planet, house, profection, or lord-of-year signals appear here."
    },
    {
      label: "Between Us",
      title: "Dynamic relationship weather",
      body: "Selecting a friend compares what today's sky is doing to you, to them, and between the two charts."
    }
  ];
}

export function App() {
  const initialLocationState = useMemo(getInitialLocation, []);
  const restoredPortalModeRef = useRef<PortalMode | null>(getStoredPortalMode());
  const [theme, setTheme] = useState<UiTheme>(getInitialTheme);
  const [sunriseOrbEnabled, setSunriseOrbEnabled] = useState(getInitialSunriseOrb);
  const [dyslexiaFriendlyFont, setDyslexiaFriendlyFont] = useState(getInitialDyslexiaFont);
  const [skyDate, setSkyDate] = useState(dateInputValue);
  const [mode, setMode] = useState<PortalMode>(getInitialPortalMode);
  const [location, setLocation] = useState<LocationInput>(initialLocationState.location);
  const [manualLocation, setManualLocation] = useState(initialLocationState.location.label);
  const [hasLocationPreference, setHasLocationPreference] = useState(initialLocationState.hasSavedLocation);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cityPickerRef = useRef<HTMLFormElement | null>(null);
  const cityPickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [citySearchStatus, setCitySearchStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [transitForm, setTransitForm] = useState<TransitForm>(createBlankTransitForm);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getInitialUserProfile);
  const [remoteAccountId, setRemoteAccountId] = useState<string | null>(null);
  const [remoteProfileReady, setRemoteProfileReady] = useState(false);
  const [accountIntent, setAccountIntent] = useState<AuthMode>("create");
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [chartModalStep, setChartModalStep] = useState<"overview" | "birth" | "city">("overview");
  const [transitsDrawn, setTransitsDrawn] = useState(false);
  const [profileTransits, setProfileTransits] = useState<TransitItem[]>([]);
  const [profileNatalSky, setProfileNatalSky] = useState<SkySnapshot | null>(null);
  const [selectedTransitId, setSelectedTransitId] = useState(sampleTransits[0].id);
  const [skyRefreshKey, setSkyRefreshKey] = useState(() => Date.now());
  const lastRemoteProfileSaveRef = useRef("");
  const [sky, setSky] = useState<SkySnapshot>(() => {
    const initialLocation = withTimeZone(initialLocationState.location);

    return getCurrentSky(initialLocation, skyDateTimeFromInput(dateInputValue(), initialLocation));
  });
  const [selectedSkyDetail, setSelectedSkyDetail] = useState<SkyDetail | null>(null);
  const [, setContentRegistryVersion] = useState(0);
  const activeTransits = profileTransits.length > 0 ? profileTransits : sampleTransits;
  const selectedTransit = activeTransits.find((transit) => transit.id === selectedTransitId) ?? activeTransits[0] ?? sampleTransits[0];
  const isSignupMode = mode === "profile" && !userProfile;
  const isProfileMode = mode === "profile" || mode === "friends" || mode === "account" || mode === "settings";

  useEffect(() => {
    let cancelled = false;
    const domains: ContentDomain[] = ["sky"];

    if (mode === "profile" || mode === "member" || mode === "account" || mode === "settings") {
      domains.push("natal");
    }

    if (mode === "friends") {
      domains.push("natal", "relationship");
    }

    Promise.all(domains
      .filter((domain) => !loadedContentRegistries[domain])
      .map((domain) => importContentRegistry(domain).then((registry) => {
        loadedContentRegistries[domain] = registry;
      })))
      .then(() => {
        if (!cancelled) {
          setContentRegistryVersion((version) => version + 1);
        }
      })
      .catch((error) => {
        console.warn("Astro knowledge registry failed to load; using local content fallbacks.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (!cityPickerOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (
        !target ||
        cityPickerRef.current?.contains(target) ||
        cityPickerTriggerRef.current?.contains(target)
      ) {
        return;
      }

      setCityPickerOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCityPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [cityPickerOpen]);

  useEffect(() => {
    let cancelled = false;
    const skyLocation = withTimeZone(location);
    const selectedDateTime = skyDateTimeFromInput(skyDate, skyLocation, new Date(skyRefreshKey));

    setSky(getCurrentSky(skyLocation, selectedDateTime));
    getAstrodienstSky(skyLocation, selectedDateTime)
      .then((nextSky) => {
        if (!cancelled) {
          setSky(nextSky);
        }
      })
      .catch((error) => {
        console.warn("Swiss Ephemeris sky calculation failed; using fallback sky.", error);
        if (!cancelled) {
          setSky(getCurrentSky(skyLocation, selectedDateTime));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, skyDate, skyRefreshKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(selectedThemeStorageKey, theme);
    } catch {
      return;
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(sunriseOrbStorageKey, sunriseOrbEnabled ? "on" : "off");
    } catch {
      return;
    }
  }, [sunriseOrbEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(dyslexiaFontStorageKey, dyslexiaFriendlyFont ? "on" : "off");
    } catch {
      return;
    }
  }, [dyslexiaFriendlyFont]);

  useEffect(() => {
    if (!userProfile && isAuthenticatedPortalMode(mode)) {
      return;
    }

    try {
      window.localStorage.setItem(portalModeStorageKey, mode);
    } catch {
      return;
    }
  }, [mode, userProfile]);

  useEffect(() => {
    if (!hasLocationPreference) {
      return;
    }

    try {
      window.localStorage.setItem(selectedLocationStorageKey, JSON.stringify(location));
    } catch {
      return;
    }
  }, [hasLocationPreference, location]);

  useEffect(() => {
    try {
      if (userProfile) {
        window.localStorage.setItem(userProfileStorageKey, JSON.stringify(userProfile));
      } else {
        window.localStorage.removeItem(userProfileStorageKey);
      }
    } catch {
      return;
    }
  }, [userProfile]);

  useEffect(() => {
    if (!remoteAccountId || !remoteProfileReady || !userProfile) {
      return;
    }

    let cancelled = false;
    const payload = createProfilePersistencePayload({
      profile: userProfile,
      theme,
      sunriseOrbEnabled,
      dyslexiaFriendlyFont,
      selectedLocation: hasLocationPreference ? location : null
    });
    const serializedPayload = JSON.stringify(payload);

    if (serializedPayload === lastRemoteProfileSaveRef.current) {
      return;
    }

    lastRemoteProfileSaveRef.current = serializedPayload;
    upsertPersistedProfile(remoteAccountId, payload)
      .catch((error) => {
        if (!cancelled) {
          lastRemoteProfileSaveRef.current = "";
          console.warn("Supabase profile persistence failed; using local profile cache.", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    remoteAccountId,
    remoteProfileReady,
    userProfile,
    theme,
    sunriseOrbEnabled,
    dyslexiaFriendlyFont,
    hasLocationPreference,
    location
  ]);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    const primaryChart = userProfile.charts[0];
    const birthDate = validChartBirthDate(primaryChart);
    const birthCity = validChartBirthCity(primaryChart);
    const birthTime = validChartBirthTime(primaryChart);

    if (!birthDate || !birthCity || !birthTime) {
      setProfileNatalSky(null);
      return;
    }

    const unknownBirthTime = birthTime === "Time unknown";
    let cancelled = false;
    const birthLocation = withTimeZone(primaryChart?.birthLocation ?? locationFromLabel(birthCity));
    const birthDateTime = zonedDateTimeToUtc(birthDate, unknownBirthTime ? "12:00 PM" : birthTime, birthLocation.timeZone);

    getAstrodienstSky(birthLocation, birthDateTime)
      .then((natalSky) => {
        if (cancelled) {
          return;
        }

        const natalBigThree = natalBigThreeFromSky(natalSky, unknownBirthTime);
        const nextTransits = buildNatalTransitItems(sky.positions, natalSky.positions);

        setProfileNatalSky(natalSky);
        setProfileTransits(nextTransits);
        setTransitsDrawn(true);
        setSelectedTransitId((currentId) => (
          nextTransits.some((transit) => transit.id === currentId)
            ? currentId
            : nextTransits[0]?.id ?? sampleTransits[0].id
        ));

        setUserProfile((currentProfile) => {
          if (!currentProfile || currentProfile.id !== userProfile.id) {
            return currentProfile;
          }

          const currentChart = currentProfile.charts[0];
          const shouldUpdateChartLocation = currentChart?.birthLocation?.timeZone !== birthLocation.timeZone;
          const nextRising = natalBigThree.rising;

          if (
            currentProfile.sun === natalBigThree.sun
            && currentProfile.moon === natalBigThree.moon
            && currentProfile.rising === nextRising
            && !shouldUpdateChartLocation
          ) {
            return currentProfile;
          }

          return {
            ...currentProfile,
            sun: natalBigThree.sun,
            moon: natalBigThree.moon,
            rising: nextRising,
            charts: currentChart
              ? [{ ...currentChart, birthLocation }, ...currentProfile.charts.slice(1)]
              : currentProfile.charts
          };
        });
      })
      .catch(() => {
        return;
      });

    return () => {
      cancelled = true;
    };
  }, [
    userProfile?.id,
    userProfile?.sun,
    userProfile?.moon,
    userProfile?.rising,
    userProfile?.charts[0]?.birthDate,
    userProfile?.charts[0]?.birthTime,
    userProfile?.charts[0]?.birthCity,
    userProfile?.charts[0]?.birthLocation?.label,
    userProfile?.charts[0]?.birthLocation?.timeZone,
    sky.generatedAt
  ]);

  useEffect(() => {
    let cancelled = false;

    async function applyAuthAccount(account: AuthAccount | null) {
      if (!account) {
        setRemoteAccountId(null);
        setRemoteProfileReady(false);
        lastRemoteProfileSaveRef.current = "";
        setMode(unauthenticatedLandingMode);
        return;
      }

      setRemoteAccountId(account.id);
      setRemoteProfileReady(false);

      const pendingForm = readPendingSignupForm();

      try {
        const persistedProfile = await loadPersistedProfile(account.id);

        if (cancelled) {
          return;
        }

        if (isProfilePersistencePayload(persistedProfile)) {
          const remoteTheme = persistedProfile.preferences?.theme;
          const remoteSunriseOrb = persistedProfile.preferences?.sunriseOrbEnabled;
          const remoteDyslexiaFont = persistedProfile.preferences?.dyslexiaFriendlyFont;
          const remoteLocation = persistedProfile.preferences?.selectedLocation;

          setUserProfile(persistedProfile.profile);
          if (remoteTheme === "light" || remoteTheme === "dark") {
            setTheme(remoteTheme);
          }
          if (typeof remoteSunriseOrb === "boolean") {
            setSunriseOrbEnabled(remoteSunriseOrb);
          }
          if (typeof remoteDyslexiaFont === "boolean") {
            setDyslexiaFriendlyFont(remoteDyslexiaFont);
          }
          if (isLocationInput(remoteLocation)) {
            const nextLocation = withTimeZone(remoteLocation);

            setLocation(nextLocation);
            setManualLocation(nextLocation.label);
            setHasLocationPreference(true);
          }
        } else {
          setUserProfile((currentProfile) => currentProfile ?? createUserProfile(pendingForm, "email", account));
        }

        clearPendingSignupForm();
        setMode((currentMode) => authenticatedLandingMode(currentMode, restoredPortalModeRef.current));
        setRemoteProfileReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.warn("Supabase profile load failed; using local profile cache.", error);
        setUserProfile((currentProfile) => currentProfile ?? createUserProfile(pendingForm, "email", account));
        clearPendingSignupForm();
        setMode((currentMode) => authenticatedLandingMode(currentMode, restoredPortalModeRef.current));
        setRemoteProfileReady(true);
      }
    }

    getAuthAccount()
      .then((account) => {
        if (cancelled) {
          return;
        }

        void applyAuthAccount(account);
      })
      .catch(() => {
        return;
      });

    const unsubscribe = onAuthAccountChange((account) => {
      if (cancelled) {
        return;
      }

      void applyAuthAccount(account);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (hasLocationPreference || !("geolocation" in navigator)) {
      return;
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          label: "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        reverseGeocodeCity(nextLocation.latitude, nextLocation.longitude)
          .catch(() => null)
          .then((mappedLocation) => {
            if (cancelled) {
              return;
            }

            const resolvedLocation = withTimeZone(mappedLocation ?? nextLocation);

            setLocation(resolvedLocation);
            setManualLocation(resolvedLocation.label);
            setHasLocationPreference(true);
          });
      },
      () => {
        return;
      },
      {
        enableHighAccuracy: false,
        maximumAge: 600000,
        timeout: 7000
      }
    );

    return () => {
      cancelled = true;
    };
  }, [hasLocationPreference]);

  useEffect(() => {
    function refreshSky() {
      setSkyRefreshKey(Date.now());
    }

    window.addEventListener("pageshow", refreshSky);

    return () => {
      window.removeEventListener("pageshow", refreshSky);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const query = manualLocation.trim();

    if (!cityPickerOpen || !hasMapboxToken() || query.length < 2) {
      setCitySuggestions([]);
      setCitySearchStatus("idle");
      return;
    }

    setCitySearchStatus("loading");
    const searchTimer = window.setTimeout(() => {
      searchCities(query)
        .then((suggestions) => {
          if (cancelled) {
            return;
          }

          setCitySuggestions(suggestions);
          setCitySearchStatus(suggestions.length > 0 ? "ready" : "empty");
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setCitySuggestions([]);
          setCitySearchStatus("error");
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(searchTimer);
    };
  }, [cityPickerOpen, manualLocation]);

  function applyManualLocation() {
    const nextLocation = locationFromLabel(manualLocation);

    setLocation(nextLocation);
    setManualLocation(nextLocation.label);
    setHasLocationPreference(true);
    setCityPickerOpen(false);
  }

  function applyCitySuggestion(suggestion: CitySuggestion) {
    setLocation(withTimeZone({
      label: suggestion.label,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      timeZone: suggestion.timeZone
    }));
    setManualLocation(suggestion.label);
    setHasLocationPreference(true);
    setCitySuggestions([]);
    setCitySearchStatus("idle");
    setCityPickerOpen(false);
  }

  function openCreateChartModal({
    prefill = false,
    step = "overview"
  }: {
    prefill?: boolean;
    step?: "overview" | "birth" | "city";
  } = {}) {
    setChartModalStep(step);

    if (!prefill) {
      const blankForm = createBlankTransitForm();
      setTransitForm(userProfile ? { ...blankForm, name: userProfile.name } : blankForm);
      setChartModalOpen(true);
      return;
    }

    if (userProfile) {
      const primaryChart = userProfile.charts[0];
      const birthDate = primaryChart?.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(primaryChart.birthDate) ? primaryChart.birthDate : "";
      const birthDateParts = splitSignupBirthDate(birthDate);
      const unknownBirthTime = primaryChart?.birthTime === "Time unknown";
      const birthTimeParts = splitSignupBirthTime(unknownBirthTime ? "12:00 PM" : primaryChart?.birthTime ?? "");

      setTransitForm((currentForm) => ({
        ...currentForm,
        name: userProfile.name,
        birthPlace: primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "",
        birthLocation: primaryChart?.birthLocation ?? null,
        birthMonth: birthDateParts.month,
        birthDay: birthDateParts.day,
        birthYear: birthDateParts.year,
        birthHour: birthTimeParts.hour,
        birthMinute: birthTimeParts.minute,
        birthMeridiem: birthTimeParts.meridiem,
        unknownBirthTime,
        currentLocation: userProfile.currentLocation ?? currentForm.currentLocation,
        currentLocationData: userProfile.currentLocationData ?? currentForm.currentLocationData
      }));
    }

    setChartModalOpen(true);
  }

  async function drawTransitChart({
    closeModal = true,
    nextStep
  }: {
    closeModal?: boolean;
    nextStep?: "overview" | "birth" | "city";
  } = {}) {
    const currentCity = transitForm.currentLocation.trim();
    let resolvedCurrentLocationData = transitForm.currentLocationData;
    const nextBirthDate = formatSignupBirthDate({
      month: transitForm.birthMonth,
      day: transitForm.birthDay,
      year: transitForm.birthYear
    });
    const nextBirthTime = transitForm.unknownBirthTime
      ? "Time unknown"
      : formatSignupBirthTime({
        hour: transitForm.birthHour,
        minute: transitForm.birthMinute,
        meridiem: transitForm.birthMeridiem
      }) || "Birth time needed";
    const nextName = transitForm.name.trim();
    const birthCity = transitForm.birthPlace.trim();
    const birthLocation = birthCity
      ? transitForm.birthLocation?.label === birthCity
        ? withTimeZone(transitForm.birthLocation)
        : locationFromLabel(birthCity)
      : null;

    if (currentCity) {
      const nextLocation = transitForm.currentLocationData?.label === currentCity
        ? transitForm.currentLocationData
        : locationFromLabel(currentCity);

      resolvedCurrentLocationData = nextLocation;
      setLocation(nextLocation);
      setManualLocation(nextLocation.label);
      setTransitForm((currentForm) => ({
        ...currentForm,
        currentLocation: nextLocation.label
      }));
      setHasLocationPreference(true);
    }

    if (userProfile) {
      const primaryChart = userProfile.charts[0];
      const nextProfileName = nextName || userProfile.name;
      let nextChart: UserChart = {
        id: primaryChart?.id ?? `chart-${Date.now()}`,
        name: chartNameFromProfile(nextProfileName),
        type: "Birth chart",
        birthDate: nextBirthDate || "Birth date needed",
        birthTime: nextBirthTime,
        birthCity: birthCity || "Birth city needed",
        birthLocation
      };
      let nextSun = nextBirthDate ? zodiacFromBirthDate(nextBirthDate) : userProfile.sun;
      let nextMoon = userProfile.moon;
      let nextRising = transitForm.unknownBirthTime || nextBirthTime === "Birth time needed" ? "Rising pending" : userProfile.rising;

      if (nextBirthDate && birthLocation && nextBirthTime !== "Birth time needed") {
        const birthDateTime = zonedDateTimeToUtc(
          nextBirthDate,
          transitForm.unknownBirthTime ? "12:00 PM" : nextBirthTime,
          birthLocation.timeZone
        );
        const natalSky = await getAstrodienstSky(birthLocation, birthDateTime);
        const natalBigThree = natalBigThreeFromSky(natalSky, transitForm.unknownBirthTime);
        const nextTransits = buildNatalTransitItems(sky.positions, natalSky.positions);

        nextSun = natalBigThree.sun;
        nextMoon = natalBigThree.moon;
        nextRising = natalBigThree.rising;
        nextChart = { ...nextChart, birthLocation: birthLocation };
        setProfileTransits(nextTransits);
        setSelectedTransitId(nextTransits[0]?.id ?? sampleTransits[0].id);
      }

      setUserProfile({
        ...userProfile,
        name: nextProfileName,
        sun: nextSun,
        moon: nextMoon,
        rising: nextRising,
        currentLocation: currentCity || userProfile.currentLocation,
        currentLocationData: resolvedCurrentLocationData ?? userProfile.currentLocationData,
        settings: normalizeChartSettings(userProfile.settings),
        charts: [nextChart, ...userProfile.charts.slice(1)]
      });
    }

    setTransitsDrawn(true);
    setChartModalOpen(!closeModal);
    if (nextStep) {
      setChartModalStep(nextStep);
    }
    setMode(userProfile ? "profile" : "guest");
  }

  const isTodayMode = mode === "guest" || mode === "member";
  const needsChartSetup = Boolean(userProfile && !hasCompleteChartSetup(userProfile));

  return (
    <main className={`app-shell theme-${theme} mode-${mode} ${sunriseOrbEnabled ? "sunrise-orb-enabled" : "sunrise-orb-disabled"} ${dyslexiaFriendlyFont ? "dyslexia-font-enabled" : "dyslexia-font-disabled"} ${isSignupMode ? "auth-mode" : ""}`}>
      {!isSignupMode && (
        <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <BrandAsterisk />
          </div>
          <div className="brand-wordmark" aria-label="tldrastro">
            <span>TLDR</span>
            <em>astro</em>
          </div>
        </div>

        <nav className="site-nav" aria-label="Primary navigation">
          <button className={mode === "guest" || mode === "member" ? "active" : ""} onClick={() => setMode(userProfile ? "member" : "guest")}>
            <Sparkles size={18} aria-hidden="true" />
            <span>Sky</span>
          </button>
          {userProfile && (
            <>
              <button
                className={`account-nav ${mode === "profile" ? "active" : ""}`}
                type="button"
                onClick={() => setMode("profile")}
              >
                <SmileNavIcon />
                <span>You</span>
              </button>
              <button
                className={`primary-friends-nav ${mode === "friends" ? "active" : ""}`}
                type="button"
                onClick={() => setMode("friends")}
              >
                <Users size={18} aria-hidden="true" />
                <span>Friends</span>
              </button>
            </>
          )}
        </nav>

        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle"
            key={theme}
            aria-pressed={theme === "dark"}
            aria-label="Toggle theme"
            title="Toggle theme"
            onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Moon size={22} aria-hidden="true" /> : <Sun size={22} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            <span className="hamburger-icon" aria-hidden="true">
              <span className="hamburger-line hamburger-line-top" />
              <span className="hamburger-line hamburger-line-middle" />
              <span className="hamburger-line hamburger-line-bottom" />
            </span>
          </button>
          {menuOpen && (
            <nav className="site-menu" aria-label="Site menu">
              {userProfile && (
                <>
                  <button className="site-menu-friends" type="button" onClick={() => { setMode("friends"); setMenuOpen(false); }}>
                    <Users size={20} aria-hidden="true" />
                    <span>Friends</span>
                  </button>
                  <button type="button" onClick={() => { setMode("account"); setMenuOpen(false); }}>
                    <User size={20} aria-hidden="true" />
                    <span>Account</span>
                  </button>
                </>
              )}
              <button type="button" onClick={() => { setMode("settings"); setMenuOpen(false); }}>
                <Settings size={20} aria-hidden="true" />
                <span>Settings</span>
              </button>
              {userProfile ? (
                <button className="site-menu-signout" type="button" onClick={async () => { await signOutAuth(); setUserProfile(null); setMode("profile"); setMenuOpen(false); }}>
                  <LogOut size={20} aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              ) : (
                <div className="site-menu-auth" aria-label="Account actions">
                  <button
                    className="site-menu-join"
                    type="button"
                    onClick={() => {
                      setAccountIntent("create");
                      setMode("profile");
                      setMenuOpen(false);
                    }}
                  >
                    Join tldr astro
                  </button>
                  <button
                    className="site-menu-login"
                    type="button"
                    onClick={() => {
                      setAccountIntent("login");
                      setMode("profile");
                      setMenuOpen(false);
                    }}
                  >
                    Login
                  </button>
                </div>
              )}
            </nav>
          )}
        </div>
        </header>
      )}

      {isTodayMode && (
        <section className="today-hero" aria-label="Today controls">
          <h1>the sky today.</h1>
          <div className="today-controls">
            <button
              className="today-pill"
              type="button"
              aria-expanded={datePickerOpen}
              aria-controls="sky-date-picker"
              onClick={() => setDatePickerOpen((isOpen) => !isOpen)}
            >
              <CalendarDays size={18} aria-hidden="true" />
              <span>{formatSkyDate(skyDate)}</span>
            </button>
            <button
              className="today-pill"
              type="button"
              ref={cityPickerTriggerRef}
              aria-expanded={cityPickerOpen}
              aria-controls="city-picker"
              onClick={() => setCityPickerOpen((isOpen) => !isOpen)}
            >
              <MapPin size={18} aria-hidden="true" />
              <span>{sky.location.label}</span>
              <Pencil size={16} aria-hidden="true" />
            </button>
          </div>
          {datePickerOpen && (
            <SkyDatePicker
              value={skyDate}
              onSelect={(nextDate) => {
                setSkyDate(nextDate);
                setDatePickerOpen(false);
              }}
            />
          )}
          {cityPickerOpen && (
            <form
              className="city-picker hero-city-picker"
              id="city-picker"
              ref={cityPickerRef}
              onSubmit={(event) => {
                event.preventDefault();
                applyManualLocation();
              }}
            >
              <label>
                <span>City</span>
                <input
                  value={manualLocation}
                  onChange={(event) => setManualLocation(event.target.value)}
                  aria-label="City"
                  placeholder="Search for a city"
                  autoFocus
                />
              </label>
              <CitySuggestions
                suggestions={citySuggestions}
                status={citySearchStatus}
                mapboxEnabled={hasMapboxToken()}
                onSelect={applyCitySuggestion}
              />
              <div className="city-picker-actions">
                <button type="submit">Update</button>
                <button type="button" onClick={() => setCityPickerOpen(false)}>Cancel</button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className={isSignupMode ? "portal-grid signup-layout" : isProfileMode ? "portal-grid profile-layout" : "portal-grid"}>
        {!isSignupMode && !isProfileMode && (
          <section className="sky-panel" aria-label="Current sky">
            <SkyWheel positions={sky.positions} aspects={sky.aspects} />

            <SkyCards sky={sky} />
            <RetrogradeCallout positions={sky.positions} generatedAt={sky.generatedAt} onOpenDetail={setSelectedSkyDetail} />
          </section>
        )}

        <section className="detail-panel" aria-label="Portal details">
          {mode === "guest" && <TodayView positions={sky.positions} aspects={sky.aspects} onOpenDetail={setSelectedSkyDetail} />}
          {mode === "member" && (
            <TodayView positions={sky.positions} aspects={sky.aspects} onOpenDetail={setSelectedSkyDetail} />
          )}
          {mode === "profile" && (
            userProfile ? (
              <ProfileView
                profile={userProfile}
                onUpdateProfile={setUserProfile}
                transitForm={transitForm}
                transitItems={activeTransits}
                natalSky={profileNatalSky}
                transitsDrawn={transitsDrawn}
                selectedTransit={selectedTransit}
                selectedTransitId={selectedTransitId}
                setSelectedTransitId={setSelectedTransitId}
                onCreateChart={() => openCreateChartModal()}
              />
            ) : (
              <SignupView
                initialMode={accountIntent}
                onClose={() => {
                  setAccountIntent("create");
                  setMode(userProfile ? "profile" : "guest");
                }}
                onCreateProfile={(nextProfile) => {
                  setUserProfile(nextProfile);
                  setMode("profile");
                }}
              />
            )
          )}
          {mode === "friends" && userProfile && (
            <ManualChartsPanel
              profile={userProfile}
              currentSky={sky}
              profileNatalSky={profileNatalSky}
              profileTransits={activeTransits}
            />
          )}
{mode === "account" && userProfile && (
  <AccountView
    profile={userProfile}
    onSignOut={async () => {
      await signOutAuth();
      setUserProfile(null);
      setMode("profile");
    }}
    onUpdateProfile={setUserProfile}
  />
)}
          {mode === "settings" && (
            userProfile ? (
              <SettingsView
                profile={userProfile}
                onUpdateProfile={setUserProfile}
                theme={theme}
                sunriseOrbEnabled={sunriseOrbEnabled}
                onThemeChange={setTheme}
                onSunriseOrbChange={setSunriseOrbEnabled}
                dyslexiaFriendlyFont={dyslexiaFriendlyFont}
                onDyslexiaFontChange={setDyslexiaFriendlyFont}
                onSignOut={async () => {
                  await signOutAuth();
                  setUserProfile(null);
                  setMode("profile");
                }}
              />
            ) : (
              <GuestSettingsView
                theme={theme}
                location={location}
                sunriseOrbEnabled={sunriseOrbEnabled}
                onThemeChange={setTheme}
                onSunriseOrbChange={setSunriseOrbEnabled}
                dyslexiaFriendlyFont={dyslexiaFriendlyFont}
                onDyslexiaFontChange={setDyslexiaFriendlyFont}
              />
            )
          )}
        </section>
      </section>

      {isTodayMode && mode === "member" && userProfile && needsChartSetup && (
        <button className="create-chart-fab" type="button" onClick={() => openCreateChartModal()}>
          <span className="create-chart-fab-icon" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <span className="create-chart-fab-copy">
            <strong>Create your chart</strong>
            <em>{chartFlowStepsLeft(userProfile)} steps left</em>
          </span>
        </button>
      )}

      {chartModalOpen && (
        <div className="chart-modal-backdrop" role="presentation" onMouseDown={() => setChartModalOpen(false)}>
          <section
            className="chart-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chart-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="chart-modal-close" type="button" aria-label="Close create chart" onClick={() => setChartModalOpen(false)}>
              ×
            </button>
            <CreateChartFlow
              form={transitForm}
              setForm={setTransitForm}
              profile={userProfile}
              step={chartModalStep}
              setStep={setChartModalStep}
              onSave={drawTransitChart}
            />
          </section>
        </div>
      )}

      {selectedSkyDetail && (
        <div className="sky-detail-backdrop" role="presentation" onMouseDown={() => setSelectedSkyDetail(null)}>
          <section
            className="sky-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sky-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="sky-detail-close" type="button" aria-label="Close detail" onClick={() => setSelectedSkyDetail(null)}>
              <X size={22} aria-hidden="true" />
            </button>
            <div className="sky-detail-glyph" aria-hidden="true">{selectedSkyDetail.glyph}</div>
            <span>{selectedSkyDetail.kicker}</span>
            <h2 id="sky-detail-title">{selectedSkyDetail.title}</h2>
            <p className="sky-detail-meta">{selectedSkyDetail.meta}</p>
            <div className="sky-detail-body">
              {selectedSkyDetail.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        </div>
      )}

    </main>
  );
}

function locationFromLabel(label: string): LocationInput {
  const seed = label.trim();

  if (!seed) {
    return withTimeZone(defaultLocation);
  }

  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  const location = {
    label: seed,
    latitude: ((hash % 1400) / 10) - 70,
    longitude: ((hash % 3000) / 10) - 150
  };

  return {
    ...location,
    timeZone: timeZoneForLocation(location)
  };
}

function SkyDatePicker({
  value,
  onSelect
}: {
  value: string;
  onSelect: (value: string) => void;
}) {
  const selectedDate = dateFromInput(value);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const days = calendarDaysFor(visibleMonth);
  const todayValue = dateInputValue();
  const selectedValue = dateInputValue(selectedDate);
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className="date-picker" id="sky-date-picker" aria-label="Select sky date">
      <div className="date-picker-header">
        <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth((month) => addMonths(month, -1))}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <strong>{monthLabel(visibleMonth)}</strong>
        <button type="button" aria-label="Next month" onClick={() => setVisibleMonth((month) => addMonths(month, 1))}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="date-picker-weekdays" aria-hidden="true">
        {weekdayLabels.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="date-picker-grid" role="grid" aria-label={monthLabel(visibleMonth)}>
        {days.map((day) => {
          const dayValue = dateInputValue(day);
          const isSelected = dayValue === selectedValue;
          const isToday = dayValue === todayValue;
          const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();

          return (
            <button
              key={dayValue}
              type="button"
              className={[
                isSelected ? "selected" : "",
                isToday ? "today" : "",
                isOutsideMonth ? "outside-month" : ""
              ].filter(Boolean).join(" ")}
              aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              aria-selected={isSelected}
              role="gridcell"
              onClick={() => onSelect(dayValue)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <button className="date-picker-today" type="button" onClick={() => onSelect(todayValue)}>
        Today
      </button>
    </section>
  );
}

function CitySuggestions({
  suggestions,
  status,
  mapboxEnabled,
  onSelect
}: {
  suggestions: CitySuggestion[];
  status: "idle" | "loading" | "ready" | "empty" | "error";
  mapboxEnabled: boolean;
  onSelect: (suggestion: CitySuggestion) => void;
}) {
  if (!mapboxEnabled) {
    return (
      <p className="city-picker-note">
        Add VITE_MAPBOX_ACCESS_TOKEN to enable suggested city search.
      </p>
    );
  }

  if (status === "idle") {
    return <p className="city-picker-note">Start typing to see suggested cities.</p>;
  }

  if (status === "loading") {
    return <p className="city-picker-note">Searching cities...</p>;
  }

  if (status === "error") {
    return <p className="city-picker-note">City suggestions are unavailable right now.</p>;
  }

  if (status === "empty") {
    return <p className="city-picker-note">No city suggestions found.</p>;
  }

  return (
    <div className="city-suggestions" role="listbox" aria-label="Suggested cities">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          role="option"
          onClick={() => onSelect(suggestion)}
        >
          <strong>{suggestion.label}</strong>
          {suggestion.region && <span>{suggestion.region}</span>}
        </button>
      ))}
    </div>
  );
}

function aspectGlyph(type: string) {
  const glyphs: Record<string, string> = {
    conjunction: "☌",
    opposition: "☍",
    square: "□",
    trine: "△",
    sextile: "✶"
  };

  return glyphs[type] ?? "·";
}

function pointGlyph(point: string) {
  const glyphs: Record<string, string> = {
    Sun: "☉",
    Moon: "☽",
    Mercury: "☿",
    Venus: "♀",
    Mars: "♂",
    Jupiter: "♃",
    Saturn: "♄",
    Uranus: "♅",
    Neptune: "♆",
    Pluto: "♇",
    "True Node": "☊",
    Ascendant: "↑",
    Midheaven: "MC"
  };

  return glyphs[point] ?? point.slice(0, 1);
}

function wholeDegreeOrb(orb: number) {
  return `${Math.round(orb)}°`;
}

function AspectGlyphs({ from, aspect, to }: { from: string; aspect: string; to: string }) {
  return (
    <span className="aspect-row-glyphs" aria-hidden="true">
      <span>{pointGlyph(from)}</span>
      <span>{aspectGlyph(aspect)}</span>
      <span>{pointGlyph(to)}</span>
    </span>
  );
}

function formatDegree(degree: number) {
  return degree.toFixed(2);
}

const placementPlanetOrder = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

const planetDignities: Record<string, Partial<Record<string, { label: string; tone: "good" | "weak" }>>> = {
  Sun: {
    Leo: { label: "Domicile", tone: "good" },
    Aries: { label: "Exalted", tone: "good" },
    Aquarius: { label: "Detriment", tone: "weak" },
    Libra: { label: "Fall", tone: "weak" }
  },
  Moon: {
    Cancer: { label: "Domicile", tone: "good" },
    Taurus: { label: "Exalted", tone: "good" },
    Capricorn: { label: "Detriment", tone: "weak" },
    Scorpio: { label: "Fall", tone: "weak" }
  },
  Mercury: {
    Gemini: { label: "Domicile", tone: "good" },
    Virgo: { label: "Domicile", tone: "good" },
    Sagittarius: { label: "Detriment", tone: "weak" },
    Pisces: { label: "Fall", tone: "weak" }
  },
  Venus: {
    Taurus: { label: "Domicile", tone: "good" },
    Libra: { label: "Domicile", tone: "good" },
    Pisces: { label: "Exalted", tone: "good" },
    Aries: { label: "Detriment", tone: "weak" },
    Scorpio: { label: "Detriment", tone: "weak" },
    Virgo: { label: "Fall", tone: "weak" }
  },
  Mars: {
    Aries: { label: "Domicile", tone: "good" },
    Scorpio: { label: "Domicile", tone: "good" },
    Capricorn: { label: "Exalted", tone: "good" },
    Taurus: { label: "Detriment", tone: "weak" },
    Libra: { label: "Detriment", tone: "weak" },
    Cancer: { label: "Fall", tone: "weak" }
  },
  Jupiter: {
    Sagittarius: { label: "Domicile", tone: "good" },
    Pisces: { label: "Domicile", tone: "good" },
    Cancer: { label: "Exalted", tone: "good" },
    Gemini: { label: "Detriment", tone: "weak" },
    Virgo: { label: "Detriment", tone: "weak" },
    Capricorn: { label: "Fall", tone: "weak" }
  },
  Saturn: {
    Capricorn: { label: "Domicile", tone: "good" },
    Aquarius: { label: "Domicile", tone: "good" },
    Libra: { label: "Exalted", tone: "good" },
    Cancer: { label: "Detriment", tone: "weak" },
    Leo: { label: "Detriment", tone: "weak" },
    Aries: { label: "Fall", tone: "weak" }
  },
  Uranus: {
    Aquarius: { label: "Natural", tone: "good" },
    Taurus: { label: "Constrained", tone: "weak" }
  },
  Neptune: {
    Pisces: { label: "Natural", tone: "good" },
    Virgo: { label: "Constrained", tone: "weak" }
  },
  Pluto: {
    Scorpio: { label: "Natural", tone: "good" },
    Taurus: { label: "Constrained", tone: "weak" }
  }
};

function placementDignity(position: PlanetPosition) {
  return planetDignities[position.planet]?.[position.sign] ?? null;
}

function placementRangeLabel(position: PlanetPosition) {
  return `${position.sign} 0°-30° · current degree ${formatDegree(position.degree)}°`;
}

function placementStatuses(position: PlanetPosition) {
  const statuses: Array<{ label: string; tone: "muted" | "alert" }> = [];

  if (position.motion === "retrograde") {
    statuses.push({ label: "Retrograde", tone: "alert" });
  }

  if (position.degree >= 29) {
    statuses.push({ label: "Last degree", tone: "alert" });
  } else if (position.degree < 1) {
    statuses.push({ label: "Fresh ingress", tone: "muted" });
  }

  return statuses;
}

function formatPlacementPosition(position: PlanetPosition) {
  return `${position.sign}${position.motion === "retrograde" ? " ℞" : ""} ${formatDegree(position.degree)}°`;
}

function ordinalHouse(house: number) {
  const rem100 = house % 100;

  if (rem100 >= 11 && rem100 <= 13) {
    return `${house}th`;
  }

  const suffixes: Record<number, string> = {
    1: "st",
    2: "nd",
    3: "rd"
  };

  return `${house}${suffixes[house % 10] ?? "th"}`;
}

const natalSignatureDescriptions: Record<string, string> = {
  Ascendant: "Your motivation for living life",
  Sun: "Your identity and where you shine",
  Moon: "Your inner world and emotions",
  Mercury: "How and where you communicate",
  Venus: "How and where you connect",
  Mars: "How and where you take action",
  Jupiter: "How and where you grow",
  Saturn: "Where you build and commit",
  Uranus: "How and where you break free",
  Neptune: "How and where you dream",
  Pluto: "How and where you transform"
};

function natalPlacementTitle(position: PlanetPosition) {
  return `${position.planet} in ${position.sign} · ${ordinalHouse(position.house)} House`;
}

function natalPlacementDescription(planet: string) {
  return natalSignatureDescriptions[planet] ?? "A signature in your chart";
}

const signElementMap: Record<string, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire",
  Leo: "Fire",
  Sagittarius: "Fire",
  Taurus: "Earth",
  Virgo: "Earth",
  Capricorn: "Earth",
  Gemini: "Air",
  Libra: "Air",
  Aquarius: "Air",
  Cancer: "Water",
  Scorpio: "Water",
  Pisces: "Water"
};

function natalElementBalance(positions: PlanetPosition[]) {
  const counts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };

  positions.forEach((position) => {
    const element = signElementMap[position.sign];

    if (element) {
      counts[element] += 1;
    }
  });

  return (["Fire", "Earth", "Air", "Water"] as const).map((element) => ({
    element,
    count: counts[element]
  }));
}

function formatPlanetDegree(position: PlanetPosition) {
  const degree = Math.floor(position.degree);
  const minutes = Math.round((position.degree - degree) * 60);

  if (minutes === 60) {
    return `${degree + 1}°00'`;
  }

  return `${degree}°${String(minutes).padStart(2, "0")}'`;
}

function aspectTooltipLines(position: PlanetPosition, aspects: SkySnapshot["aspects"]) {
  const activeAspects = aspects
    .filter((aspect) => aspect.from === position.planet || aspect.to === position.planet)
    .map((aspect) => {
      const otherPlanet = aspect.from === position.planet ? aspect.to : aspect.from;
      return `${aspect.type} ${otherPlanet} (${aspect.orb.toFixed(1)}° orb)`;
    });

  if (activeAspects.length === 0) {
    return ["No exact aspects right now."];
  }

  const visibleAspects = activeAspects.slice(0, 4);

  if (activeAspects.length > visibleAspects.length) {
    visibleAspects.push(`+${activeAspects.length - visibleAspects.length} more`);
  }

  return visibleAspects;
}

function SkyWheel({
  positions,
  aspects,
  ascendant,
  ascendantLongitude,
  midheavenLongitude,
  showHouses = false
}: {
  positions: PlanetPosition[];
  aspects: SkySnapshot["aspects"];
  ascendant?: string;
  ascendantLongitude?: number;
  midheavenLongitude?: number;
  showHouses?: boolean;
}) {
  const signs = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces"
  ];
  const isNatalWheel = showHouses && typeof ascendantLongitude === "number";
  const ascendantSignIndex = ascendant ? signs.indexOf(ascendant) : -1;
  const wholeHouseStartLongitude = ascendantSignIndex >= 0 ? ascendantSignIndex * 30 : 0;
  const center = 300;
  const radius = {
    outer: 284,
    signInner: 240,
    planet: 190,
    aspect: 150,
    house: 112,
    inner: 44
  };

  function point(angle: number, distance: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + Math.cos(rad) * distance,
      y: center + Math.sin(rad) * distance
    };
  }

  function arcPath(startAngle: number, endAngle: number, distance: number) {
    const delta = ((endAngle - startAngle + 540) % 360) - 180;
    const resolvedEndAngle = startAngle + delta;
    const start = point(startAngle, distance);
    const end = point(resolvedEndAngle, distance);
    const sweep = delta >= 0 ? 1 : 0;

    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${distance} ${distance} 0 0 ${sweep} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  function angleForLongitude(longitude: number) {
    if (isNatalWheel) {
      return 180 - normalizedAngle(longitude - ascendantLongitude);
    }

    return 225 + longitude;
  }

  function planetAngle(position: PlanetPosition) {
    return angleForLongitude(zodiacLongitude(position));
  }

  function aspectClass(type: string) {
    if (["trine", "sextile"].includes(type)) {
      return "soft";
    }

    if (["square", "opposition"].includes(type)) {
      return "hard";
    }

    return "neutral";
  }

  function houseNumberForSign(sign: string) {
    const signIndex = signs.indexOf(sign);
    const ascendantIndex = ascendant ? signs.indexOf(ascendant) : -1;

    if (!showHouses || signIndex < 0 || ascendantIndex < 0) {
      return null;
    }

    return ((signIndex - ascendantIndex + 12) % 12) + 1;
  }

  const aspectPairs = aspects
    .map((aspect) => {
      const from = positions.find((position) => position.planet === aspect.from);
      const to = positions.find((position) => position.planet === aspect.to);

      if (!from || !to) {
        return null;
      }

      return {
        ...aspect,
        from,
        to,
        className: aspectClass(aspect.type)
      };
    })
    .filter(
      (
        aspect
      ): aspect is {
        from: PlanetPosition;
        to: PlanetPosition;
        type: string;
        orb: number;
        meaning: string;
        className: string;
      } => Boolean(aspect)
    );
  const signLabelRadius = (radius.outer + radius.signInner) / 2 + 2;
  const signDividerInnerRadius = radius.signInner - 2;
  const signDividerOuterRadius = radius.outer + 2;
  const tooltipWidth = 214;
  const tooltipLineHeight = 18;
  const tooltipPaddingY = 12;
  const [activeTooltipPlanet, setActiveTooltipPlanet] = useState<string | null>(null);
  const signLabelPaths = signs.map((sign, index) => {
    const isLong = sign.length >= 9;
    const inset = isLong ? 0.3 : 3.8;
    const startAngle = angleForLongitude(index * 30 + inset);
    const endAngle = angleForLongitude(index * 30 + 30 - inset);
    const labelAngle = angleForLongitude(index * 30 + 15);
    const labelIsAboveCenter = Math.sin((labelAngle * Math.PI) / 180) < -0.05;
    const shouldReversePath = isNatalWheel && labelIsAboveCenter;

    return {
      sign,
      isLong,
      id: `sign-label-path-${showHouses ? "houses" : "sky"}-${sign.toLowerCase()}`,
      path: shouldReversePath
        ? arcPath(endAngle, startAngle, signLabelRadius)
        : arcPath(startAngle, endAngle, signLabelRadius)
    };
  });
  const activeTooltipPosition = activeTooltipPlanet
    ? positions.find((position) => position.planet === activeTooltipPlanet)
    : null;

  function tooltipDetails(position: PlanetPosition) {
    const marker = point(planetAngle(position), radius.planet);
    const placementLine = `${position.planet} in ${position.sign} ${formatPlanetDegree(position)}`;
    const lines = [placementLine, ...aspectTooltipLines(position, aspects)];
    const height = tooltipPaddingY * 2 + lines.length * tooltipLineHeight;
    const x = marker.x > center ? marker.x - tooltipWidth - 18 : marker.x + 18;
    const y = Math.min(Math.max(marker.y - height / 2, 18), 600 - height - 18);

    return { lines, height, x, y };
  }

  return (
    <svg className="sky-wheel" viewBox="0 0 600 600" role="img" aria-label="Planet positions">
      <defs>
        {signLabelPaths.map(({ id, path }) => (
          <path id={id} key={id} d={path} />
        ))}
      </defs>
      <g className="wheel-rings">
        <circle cx={center} cy={center} r={radius.outer} />
        <circle cx={center} cy={center} r={radius.signInner} />
        <circle cx={center} cy={center} r={radius.aspect} className="faint" />
        <circle cx={center} cy={center} r={radius.inner} />
      </g>

      <circle
        className="sign-band"
        cx={center}
        cy={center}
        r={(radius.outer + radius.signInner) / 2}
      />

      <g className="wheel-sectors">
        {signs.map((sign, index) => {
          const a = isNatalWheel ? angleForLongitude(wholeHouseStartLongitude + index * 30) : 225 + index * 30;
          const outer = point(a, radius.signInner);
          const inner = point(a, radius.inner);
          return <line key={sign} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
        })}
      </g>

      <g className="sign-band-dividers">
        {signs.map((sign, index) => {
          const a = angleForLongitude(index * 30);
          const outer = point(a, signDividerOuterRadius);
          const inner = point(a, signDividerInnerRadius);
          return <line key={sign} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
        })}
      </g>

      <g className="sign-labels">
        {signLabelPaths.map(({ sign, id, isLong }) => {
          const className = isLong ? "sign-label-long" : undefined;
          return (
            <g key={sign} className={className}>
              <text className="sign-label-halo">
                <textPath href={`#${id}`} startOffset="50%">
                  {sign}
                </textPath>
              </text>
              <text>
                <textPath href={`#${id}`} startOffset="50%">
                  {sign}
                </textPath>
              </text>
            </g>
          );
        })}
      </g>

      <g className="aspect-lines">
        {aspectPairs.map(({ from, to, type, orb, className }) => {
          const a = point(planetAngle(from), radius.aspect);
          const b = point(planetAngle(to), radius.aspect);

          return (
            <g key={`${from.planet}-${to.planet}`} className={`${className} ${type}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
            </g>
          );
        })}
      </g>

      {isNatalWheel && (
        <g className="natal-angle-lines" aria-label="Ascendant axis">
          {(() => {
            const asc = point(angleForLongitude(ascendantLongitude), radius.signInner - 12);
            const dsc = point(angleForLongitude(ascendantLongitude + 180), radius.signInner - 12);

            return (
              <line
                className="ascendant-axis"
                x1={asc.x}
                y1={asc.y}
                x2={dsc.x}
                y2={dsc.y}
              />
            );
          })()}
        </g>
      )}

      {showHouses && ascendant && (
        <g className="house-labels" aria-label="Whole sign houses">
          {Array.from({ length: 12 }, (_, index) => {
            const house = index + 1;
            const p = isNatalWheel
              ? point(angleForLongitude(wholeHouseStartLongitude + index * 30 + 15), radius.house)
              : point(angleForLongitude((signs.indexOf(ascendant) + index) * 30 + 15), radius.house);

            return (
              <text key={house} x={p.x} y={p.y}>
                {house}
              </text>
            );
          })}
        </g>
      )}

      {isNatalWheel && (
        <g className="angular-labels" aria-label="Chart angles">
          {[
            ["ASC", ascendantLongitude],
            ["DSC", ascendantLongitude + 180]
          ].map(([label, longitude]) => {
            if (typeof longitude !== "number") {
              return null;
            }

            const p = point(angleForLongitude(longitude), radius.signInner - 38);

            return (
              <text key={label} x={p.x} y={p.y}>
                {label}
              </text>
            );
          })}
        </g>
      )}

      <g className="planet-labels">
        {positions.map((position) => {
          const marker = point(planetAngle(position), radius.planet);
          const tickOuter = point(planetAngle(position), radius.signInner - 4);
          const tickInner = point(planetAngle(position), radius.signInner - 18);
          const label = point(planetAngle(position), radius.planet - 22);
          const { lines: tooltipLines } = tooltipDetails(position);

          return (
            <g
              key={position.planet}
              className="planet-marker"
              tabIndex={0}
              role="img"
              aria-label={tooltipLines.join(". ")}
              onBlur={() => setActiveTooltipPlanet((current) => (current === position.planet ? null : current))}
              onFocus={() => setActiveTooltipPlanet(position.planet)}
              onPointerEnter={() => setActiveTooltipPlanet(position.planet)}
              onPointerLeave={() => setActiveTooltipPlanet((current) => (current === position.planet ? null : current))}
            >
              <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} className="planet-tick" />
              <circle cx={marker.x} cy={marker.y} r="18" className="planet-hit-area" />
              <text x={marker.x} y={marker.y + 5} className="planet-glyph">
                {position.glyph}
              </text>
              <text x={label.x} y={label.y} className="planet-degree">
                {Math.floor(position.degree)}°
              </text>
            </g>
          );
        })}
      </g>

      {activeTooltipPosition && (
        <g className="planet-tooltips" aria-hidden="true">
          {(() => {
            const { lines, height, x, y } = tooltipDetails(activeTooltipPosition);

            return (
              <g className="planet-tooltip planet-tooltip-active" transform={`translate(${x} ${y})`}>
                <rect width={tooltipWidth} height={height} rx="12" />
                {lines.map((line, index) => (
                  <text
                    key={`${activeTooltipPosition.planet}-tooltip-${line}`}
                    x="14"
                    y={tooltipPaddingY + 13 + index * tooltipLineHeight}
                    className={index === 0 ? "planet-tooltip-title" : undefined}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

function MoonPhaseArt({ phase }: { phase: string }) {
  const phaseEmojis: Record<string, string> = {
    "New Moon": "🌑",
    "Waxing Crescent": "🌒",
    "First Quarter": "🌓",
    "Waxing Gibbous": "🌔",
    "Full Moon": "🌕",
    "Waning Gibbous": "🌖",
    "Last Quarter": "🌗",
    "Waning Crescent": "🌘"
  };

  return <span className="moon-phase-art" aria-hidden="true">{phaseEmojis[phase] ?? "🌙"}</span>;
}

function moonPhaseTldr(phase: string) {
  const summaries: Record<string, string> = {
    "New Moon": "A reset is opening. Keep the signal simple and choose what gets your first real yes.",
    "Waxing Crescent": "Momentum is still tender. Feed the thing that wants to grow before asking it to prove itself.",
    "First Quarter": "The day asks for action. A small decision now can clear more space than a perfect plan.",
    "Waxing Gibbous": "The story is filling in. Refine the details, but do not lose the thread that started it.",
    "Full Moon": "Feelings reach a peak and something hidden comes to light - a clear, honest day to say the real thing.",
    "Waning Gibbous": "The lesson is visible now. Share what you know, and let the extra noise fall away.",
    "Last Quarter": "A choice wants closure. Release the part of the plan that no longer matches the truth.",
    "Waning Crescent": "Energy turns inward. Rest, integrate, and let the next beginning arrive without force."
  };

  return summaries[phase] ?? "The Moon is setting the emotional weather. Notice what rises, softens, and asks for care.";
}

type RetrogradeWindow = {
  planet: string;
  preShadowStart?: string;
  retrogradeStart: string;
  retrogradeEnd: string;
  postShadowEnd?: string;
  shadows?: "standard" | "not-applicable";
};

const retrogradeWindows: RetrogradeWindow[] = [
  {
    planet: "Jupiter",
    preShadowStart: "2025-08-17",
    retrogradeStart: "2025-11-11",
    retrogradeEnd: "2026-03-11",
    postShadowEnd: "2026-06-06"
  },
  {
    planet: "Pluto",
    preShadowStart: "2026-01-12",
    retrogradeStart: "2026-05-06",
    retrogradeEnd: "2026-10-16",
    postShadowEnd: "2027-02-07"
  },
  {
    planet: "True Node",
    retrogradeStart: "2026-05-11",
    retrogradeEnd: "2026-06-07",
    shadows: "not-applicable"
  },
  {
    planet: "True Node",
    retrogradeStart: "2026-06-08",
    retrogradeEnd: "2026-06-19",
    shadows: "not-applicable"
  },
  {
    planet: "Saturn",
    preShadowStart: "2026-04-20",
    retrogradeStart: "2026-07-26",
    retrogradeEnd: "2026-12-10",
    postShadowEnd: "2027-03-15"
  },
  {
    planet: "Uranus",
    preShadowStart: "2026-05-25",
    retrogradeStart: "2026-09-10",
    retrogradeEnd: "2027-02-08",
    postShadowEnd: "2027-05-26"
  },
  {
    planet: "Neptune",
    preShadowStart: "2026-03-16",
    retrogradeStart: "2026-07-07",
    retrogradeEnd: "2026-12-12",
    postShadowEnd: "2027-04-02"
  },
  {
    planet: "Jupiter",
    preShadowStart: "2026-09-17",
    retrogradeStart: "2026-12-13",
    retrogradeEnd: "2027-04-13",
    postShadowEnd: "2027-07-11"
  }
];

function dateOnly(value: string | Date) {
  const date = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatRetrogradeDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatRetrogradeDateRange(start: string, end: string) {
  return `${formatRetrogradeDate(start)} - ${formatRetrogradeDate(end)}`;
}

function retrogradeWindowFor(position: PlanetPosition, generatedAt: string) {
  const currentDay = dateOnly(generatedAt);

  return retrogradeWindows.find((window) => {
    if (window.planet !== position.planet) {
      return false;
    }

    return currentDay >= dateOnly(window.retrogradeStart) && currentDay <= dateOnly(window.retrogradeEnd);
  }) ?? retrogradeWindows.find((window) => window.planet === position.planet);
}

function retrogradeTimelineLines(window?: RetrogradeWindow) {
  if (!window) {
    return ["Retrograde dates are being calculated for this cycle."];
  }

  if (window.shadows === "not-applicable") {
    return [
      `Retrograde: ${formatRetrogradeDateRange(window.retrogradeStart, window.retrogradeEnd)}`,
      "Pre-shadow: not used for lunar nodes",
      "Post-shadow: not used for lunar nodes"
    ];
  }

  return [
    `Pre-shadow: ${window.preShadowStart ? formatRetrogradeDate(window.preShadowStart) : "not available"}`,
    `Retrograde: ${formatRetrogradeDateRange(window.retrogradeStart, window.retrogradeEnd)}`,
    `Post-shadow: ${window.postShadowEnd ? formatRetrogradeDate(window.postShadowEnd) : "not available"}`
  ];
}

function retrogradeCardRange(window?: RetrogradeWindow) {
  if (!window) {
    return "Dates calculating";
  }

  return `Retrograde ${formatRetrogradeDateRange(window.retrogradeStart, window.retrogradeEnd)}`;
}

function SkyCards({ sky }: { sky: SkySnapshot }) {
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");

  return (
    <section className="sky-lunar-brief" aria-label="Sky highlights">
      <div className="sky-lunar-pills" aria-label="Current Sun, Moon, and phase">
        <span className="sky-lunar-pill">
          <span className="sky-lunar-pill-icon" aria-hidden="true">☉</span>
          <span className="sky-lunar-pill-copy">
            <em>Sun</em>
            <h3>{sun?.sign ?? "Current"} {formatBriefPlacementDegree(sun)}</h3>
          </span>
        </span>
        <span className="sky-lunar-pill">
          <span className="sky-lunar-pill-icon" aria-hidden="true">☽</span>
          <span className="sky-lunar-pill-copy">
            <em>Moon</em>
            <h3>{moon?.sign ?? "Current"} {formatBriefPlacementDegree(moon)}</h3>
          </span>
        </span>
        <span className="sky-lunar-pill">
          <span className="sky-lunar-pill-icon sky-lunar-pill-phase" aria-hidden="true">
            <MoonPhaseArt phase={sky.moonPhase} />
          </span>
          <span className="sky-lunar-pill-copy">
            <em>Phase</em>
            <h3>{sky.moonPhase}</h3>
          </span>
        </span>
      </div>
      <div className="sky-lunar-tldr">
        <span>TLDR</span>
        <p>{moonPhaseTldr(sky.moonPhase)}</p>
      </div>
    </section>
  );
}

function RetrogradeCallout({
  positions,
  generatedAt,
  onOpenDetail
}: {
  positions: PlanetPosition[];
  generatedAt: string;
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  const retrogrades = positions.filter((position) => position.motion === "retrograde");

  if (retrogrades.length === 0) {
    return null;
  }

  return (
    <section className="retrograde-section" aria-label="Retrograde planets">
      <span className="section-label">Retrograde</span>
      <div className="retro-list">
        {retrogrades.map((position) => {
          const title = `${position.planet} retrograde`;
          const content = approvedVoiceOrKnowledgeFallback(placementContentId(position.planet, position.sign, "sky"), "sky");
          const retrogradeWindow = retrogradeWindowFor(position, generatedAt);
          const timelineLines = retrogradeTimelineLines(retrogradeWindow);
          const detailParagraphs = [
            ...timelineLines.map((line) => <span className="retrograde-detail-line" key={line}>{line}</span>),
            ...retrogradeDetailBody(position)
          ];

          return (
            <button
              key={position.planet}
              className="retro"
              type="button"
              onClick={() => onOpenDetail({
                glyph: position.glyph,
                kicker: "Retrograde",
                title,
                meta: `${formatPlacementPosition(position).toUpperCase()} · CURRENT SKY`,
                body: detailParagraphs,
                content: content.bundle
              })}
            >
              <span className="retro-badge" aria-hidden="true">
                {position.glyph}
                <span className="rx">℞</span>
              </span>
              <span className="retro-main">
                <span className="retro-top">
                  <strong>{title}</strong>
                  <em>now</em>
                </span>
                <span className="retro-sub">{formatPlacementPosition(position)}</span>
                <span className="retro-dates">{retrogradeCardRange(retrogradeWindow)}</span>
                <span className="retro-shadow-lines">
                  {timelineLines.filter((line) => line.startsWith("Pre-shadow") || line.startsWith("Post-shadow")).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
                <span className="retro-copy">Review, refine, revisit. This planet is asking for a second look.</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CitySearchField({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  optional = false,
  optionalLabel = "Optional",
  icon,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: CitySuggestion) => void;
  placeholder: string;
  optional?: boolean;
  optionalLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const query = value.trim();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;

      if (!target || fieldRef.current?.contains(target)) {
        return;
      }

      setIsActive(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActive(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive]);

  useEffect(() => {
    let cancelled = false;

    if (!isActive || !hasMapboxToken() || query.length < 2) {
      setSuggestions([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const searchTimer = window.setTimeout(() => {
      searchCities(query)
        .then((nextSuggestions) => {
          if (cancelled) {
            return;
          }

          setSuggestions(nextSuggestions);
          setStatus(nextSuggestions.length > 0 ? "ready" : "empty");
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setSuggestions([]);
          setStatus("error");
        });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(searchTimer);
    };
  }, [isActive, query]);

  function chooseSuggestion(suggestion: CitySuggestion) {
    if (onSelect) {
      onSelect(suggestion);
    } else {
      onChange(suggestion.label);
    }
    setSuggestions([]);
    setStatus("idle");
    setIsActive(false);
  }

  const input = (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
        setIsActive(true);
      }}
      onFocus={() => setIsActive(true)}
      placeholder={placeholder}
    />
  );

  return (
    <div ref={fieldRef} className={`field-line city-search-field ${className}`}>
      <label>
        <span>
          {label}
          {optional && <em>{optionalLabel}</em>}
        </span>
        {icon ? (
          <div className="city-search-control">
            {icon}
            {input}
          </div>
        ) : input}
      </label>

      {isActive && (
        <CitySuggestions
          suggestions={suggestions}
          status={status}
          mapboxEnabled={hasMapboxToken()}
          onSelect={chooseSuggestion}
        />
      )}
    </div>
  );
}

function TodayView({
  positions,
  aspects,
  onOpenDetail
}: {
  positions: PlanetPosition[];
  aspects: SkySnapshot["aspects"];
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  return (
    <>
      <PlacementView positions={positions} aspects={aspects} onOpenDetail={onOpenDetail} />
      <ActiveAspects aspects={aspects} positions={positions} onOpenDetail={onOpenDetail} />
    </>
  );
}

function PlacementView({
  positions,
  aspects,
  onOpenDetail
}: {
  positions: PlanetPosition[];
  aspects: SkySnapshot["aspects"];
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  const [placementMode, setPlacementMode] = useState<PlacementMode>("table");

  return (
    <>
      <div className="placements-heading">
        <p>Placements</p>
        <h2>Today, simple.</h2>
        <span>What is up there today, and what it actually means down here.</span>
      </div>

      <div className="app-tabs placement-tabs" role="tablist" aria-label="Placement view">
        <button
          className={placementMode === "table" ? "active" : ""}
          onClick={() => setPlacementMode("table")}
          role="tab"
          aria-selected={placementMode === "table"}
        >
          List
        </button>
        <button
          className={placementMode === "paragraph" ? "active" : ""}
          onClick={() => setPlacementMode("paragraph")}
          role="tab"
          aria-selected={placementMode === "paragraph"}
        >
          Paragraph
        </button>
      </div>

      {placementMode === "table" ? (
        <PlacementTable positions={positions} aspects={aspects} onOpenDetail={onOpenDetail} />
      ) : (
        <PlacementParagraph positions={positions} />
      )}
    </>
  );
}

function aspectTone(type: string) {
  if (["trine", "sextile"].includes(type)) {
    return "Flow";
  }

  if (["square", "opposition"].includes(type)) {
    return "Friction";
  }

  return "Contact";
}

const aspectApplication: Record<string, string> = {
  conjunction: "naming the pattern that is asking for attention",
  opposition: "comparison, conversation, and decisions that require balance",
  square: "adjusting habits, expectations, or plans that have become too tight",
  trine: "creative work, repair, planning, and choices that benefit from cooperation",
  sextile: "low-pressure conversations, practical experiments, and small next steps"
};

const sunSeasonOpenings: Record<string, string> = {
  Aries: "Aries season begins the zodiac year by bringing attention back to action, appetite, courage, and the places where waiting has become its own kind of answer.",
  Taurus: "Taurus season slows the pace enough to notice what is stable, what is pleasurable, and what actually has enough value to keep receiving your time.",
  Gemini: "Gemini season brings attention to questions, conversations, movement, and the information passing between people, places, and choices.",
  Cancer: "Cancer season turns attention toward home, memory, protection, and the emotional roots beneath what people say they need.",
  Leo: "Leo season brings attention to visibility, creative courage, joy, and the places where being seen asks for more honesty than performance.",
  Virgo: "Virgo season brings attention to repair, discernment, daily rhythms, and the small details that decide whether something can actually work.",
  Libra: "Libra season brings attention to relationship, balance, fairness, and the constant recalibration required when more than one person matters.",
  Scorpio: "Scorpio season brings attention to trust, power, intimacy, and the truths that become harder to avoid once the surface story stops working.",
  Sagittarius: "Sagittarius season brings attention to belief, movement, honesty, and the larger horizon that starts calling when the current frame feels too small.",
  Capricorn: "Capricorn season brings attention to time, responsibility, structure, and the long-term shape of what is being built.",
  Aquarius: "Aquarius season brings attention to systems, community, distance, and the future that becomes possible when old patterns are questioned.",
  Pisces: "Pisces season brings attention to imagination, compassion, surrender, and the places where feeling moves beyond clean edges."
};

function currentSkyAspectWriteup(aspect: SkySnapshot["aspects"][number], positions: PlanetPosition[], _fallback: ReactNode[]) {
  const from = positions.find((position) => position.planet === aspect.from);
  const to = positions.find((position) => position.planet === aspect.to);
  return currentSkyAspectAdvice(aspect, from, to);
}

function isAspectPair(aspect: SkySnapshot["aspects"][number], planetA: string, planetB: string, type?: string) {
  const matchesPair = (aspect.from === planetA && aspect.to === planetB) || (aspect.from === planetB && aspect.to === planetA);
  return matchesPair && (!type || aspect.type === type);
}

function timedAspectLine(aspect: SkySnapshot["aspects"][number]) {
  if (aspect.orb <= 1) {
    return "It is strongest today and should start easing over the next day or so.";
  }

  return "It is active now, with the exact feeling strongest while the planets stay close by degree.";
}

function currentSkyAspectAdvice(aspect: SkySnapshot["aspects"][number], from?: PlanetPosition, to?: PlanetPosition) {
  const mercury = [from, to].find((position) => position?.planet === "Mercury");
  const neptune = [from, to].find((position) => position?.planet === "Neptune");
  const sun = [from, to].find((position) => position?.planet === "Sun");
  const saturn = [from, to].find((position) => position?.planet === "Saturn");

  if (isAspectPair(aspect, "Mercury", "Neptune", "square") && mercury && neptune) {
    return [
      `Conversations blur today. You may think you said one thing while someone else heard another, or read a message in the worst possible tone. Plans made on a wave of feeling can sound brilliant now and vague by tomorrow.`,
      `Mercury in ${mercury.sign} describes thinking and communication filtered through ${signCurrentStyles[mercury.sign] ?? mercury.sign.toLowerCase()}. Neptune in ${neptune.sign} dissolves edges, blurring fact into impression and sincerity into projection. The square is the friction between them: what you think you know and what is actually true can slip out of alignment.`,
      `Get it in writing, ask the clarifying question, and let any big decision wait until this aspect clears. ${timedAspectLine(aspect)}`
    ];
  }

  if (isAspectPair(aspect, "Sun", "Saturn", "sextile") && sun && saturn) {
    return [
      `The ${sun.sign} Sun is in a supportive sextile with Saturn in ${saturn.sign}, making it easier to turn scattered ideas into something usable. If your attention has been split across too many conversations, plans, or choices, narrow the field.`,
      `The Sun in ${sun.sign} shows where the day’s attention is moving: ${signCurrentStyles[sun.sign] ?? sun.sign.toLowerCase()}. Saturn brings structure, discipline, and the part that builds something lasting. A sextile is an easy, supportive angle, an open door rather than a push.`,
      `Pick the one idea with a clear next step and act on it. Make the call, send the draft, schedule the meeting, or put the plan on a timeline. ${timedAspectLine(aspect)}`
    ];
  }

  const fromSign = from?.sign ?? "";
  const toSign = to?.sign ?? "";
  const fromRole = planetPlainRoles[aspect.from] ?? placementThemes[aspect.from] ?? `${aspect.from.toLowerCase()} themes`;
  const toRole = planetPlainRoles[aspect.to] ?? placementThemes[aspect.to] ?? `${aspect.to.toLowerCase()} themes`;
  const fromStyle = from ? signPlainRoles[from.sign] ?? from.sign.toLowerCase() : "its current sign";
  const toStyle = to ? signPlainRoles[to.sign] ?? to.sign.toLowerCase() : "its current sign";
  const aspectRole = aspectPlainRoles[aspect.type] ?? `a ${aspect.type}`;

  return [
    `${aspect.from}${fromSign ? ` in ${fromSign}` : ""} is ${aspect.type} ${aspect.to}${toSign ? ` in ${toSign}` : ""} today. You may notice ${fromRole} running into ${toRole}, especially in situations that already feel active, personal, or unresolved.`,
    `${aspect.from} is moving through ${fromSign || "its current sign"}, which makes its expression more ${fromStyle}. ${aspect.to} is moving through ${toSign || "its current sign"}, bringing in something more ${toStyle}. A ${aspect.type} is ${aspectRole}.`,
    `${aspectApplication[aspect.type] ? `Use this for ${aspectApplication[aspect.type]}.` : "Use this to slow down and name what is actually happening."} Before you act, separate the feeling from the fact and choose the next step that still makes sense tomorrow. ${timedAspectLine(aspect)}`
  ];
}

function aspectsForPlacement(position: PlanetPosition, aspects: SkySnapshot["aspects"]) {
  return aspects
    .filter((aspect) => aspect.from === position.planet || aspect.to === position.planet)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 2);
}

function placementDetailKicker(position: PlanetPosition, activeAspects: SkySnapshot["aspects"]) {
  if (position.planet === "Sun") {
    return "Seasonal weather";
  }

  if (position.planet === "Moon") {
    return "Lunar weather";
  }

  if (activeAspects.length > 0) {
    return "Active placement";
  }

  return "Placement";
}

function placementDetailTitle(position: PlanetPosition, activeAspects: SkySnapshot["aspects"]) {
  if (position.planet === "Sun") {
    return `${position.sign} Season`;
  }

  const primaryAspect = activeAspects[0];
  if (primaryAspect) {
    const otherPlanet = primaryAspect.from === position.planet ? primaryAspect.to : primaryAspect.from;
    return `${position.planet} in ${position.sign} ${primaryAspect.type} ${otherPlanet}`;
  }

  return `${position.planet} in ${position.sign}`;
}

function placementOpeningParagraph(position: PlanetPosition) {
  if (position.planet === "Sun") {
    return sunSeasonOpenings[position.sign] ?? `The Sun in ${position.sign} sets the tone for ${position.sign} season, bringing attention to the priorities moving through the collective weather right now.`;
  }

  if (position.planet === "Moon") {
    return `The Moon in ${position.sign} describes the emotional weather of the day, shaping what feels immediate, reactive, protective, or hard to ignore.`;
  }

  return `${position.planet} is moving through ${position.sign}, so ${placementThemes[position.planet] ?? position.theme.toLowerCase()} is being expressed through ${position.sign}'s style.`;
}

function placementRetrogradeNote(position: PlanetPosition) {
  if (position.motion !== "retrograde") {
    return "";
  }

  const planetTheme = planetMotives[position.planet] ?? placementThemes[position.planet] ?? position.theme.toLowerCase();
  const signStyle = signCurrentStyles[position.sign] ?? `${position.sign}'s style`;

  return `${position.planet} is retrograde in ${position.sign}, pulling ${planetTheme} back through ${signStyle}. The movement is less about pushing the topic forward and more about noticing what needs review before the next step can hold.`;
}

function retrogradeDetailBody(position: PlanetPosition) {
  const planetTheme = planetMotives[position.planet] ?? placementThemes[position.planet] ?? position.theme.toLowerCase();
  const signStyle = signCurrentStyles[position.sign] ?? `${position.sign}'s style`;

  return [
    `Something connected to ${planetTheme} may keep circling back instead of moving cleanly forward. It may feel like a delay, a repeated thought, an old pattern, or a situation that needs another look before it can resolve.`,
    `${position.planet} is retrograde in ${position.sign}, so this review is moving through ${signStyle}. The issue is not necessarily new. Retrogrades often make older material visible again so you can see what has changed and what still has weight.`,
    `Do not force a final answer too quickly. Revisit the conversation, check the timeline, edit the plan, or name what still feels unfinished. The useful move is revision, not acceleration.`
  ];
}

function placementDetailBody(position: PlanetPosition, positions: PlanetPosition[], aspects: SkySnapshot["aspects"], _fallback: ReactNode[]) {
  const activeAspects = aspectsForPlacement(position, aspects);
  const retrogradeNote = placementRetrogradeNote(position);

  if (activeAspects.length > 0) {
    const primaryAspect = activeAspects[0];
    const from = positions.find((candidate) => candidate.planet === primaryAspect.from);
    const to = positions.find((candidate) => candidate.planet === primaryAspect.to);
    const body = currentSkyAspectAdvice(primaryAspect, from, to);

    return [
      ...body,
      ...(retrogradeNote ? [retrogradeNote] : [])
    ];
  }

  if (position.planet === "Sun" || position.planet === "Moon") {
    return [
      placementOpeningParagraph(position),
      ...(retrogradeNote ? [retrogradeNote] : [])
    ];
  }

  return [
    placementOpeningParagraph(position),
    ...(retrogradeNote ? [retrogradeNote] : [])
  ];
}

function ActiveAspects({
  aspects,
  positions,
  onOpenDetail
}: {
  aspects: SkySnapshot["aspects"];
  positions: PlanetPosition[];
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  return (
    <section className="aspect-section" aria-label="Aspects">
      <span className="eyebrow section-label aspect-section-label">Aspects</span>
      <div className="aspects-card aspect-row-card">
        <div className="aspect-row-list">
          {aspects.map((aspect) => {
            const title = `${aspect.from} ${aspect.type} ${aspect.to}`;
            const content = approvedVoiceOrKnowledgeFallback(currentSkyAspectContentId(aspect.from, aspect.type, aspect.to), "sky");
            const rowSummary = content.summary ?? aspect.meaning;
            const detailParagraphs = content.detailParagraphs.length > 0 ? content.detailParagraphs : [aspect.meaning];
            const body = currentSkyAspectWriteup(aspect, positions, detailParagraphs);

            return (
              <button
                type="button"
                className="aspect-row aspect-row-button"
                key={`${aspect.from}-${aspect.to}`}
                aria-label={`Read more about ${title}`}
                onClick={() => onOpenDetail({
                  glyph: aspectGlyph(aspect.type),
                  kicker: "Today's aspect",
                  title,
                  meta: `${aspectTone(aspect.type).toUpperCase()} · ${aspect.orb.toFixed(1)}° orb`,
                  content: content.bundle,
                  body
                })}
              >
                <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
                <div className="aspect-row-copy">
                  <h3>{title}</h3>
                  <p>{rowSummary}</p>
                </div>
                <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
                  <span className="aspect-row-dot" aria-hidden="true" />
                  <span>{wholeDegreeOrb(aspect.orb)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlacementParagraph({ positions }: { positions: PlanetPosition[] }) {
  return (
    <div className="placement-prose">
      {positions.map((position, index) => {
        const content = approvedVoiceOrKnowledgeFallback(placementContentId(position.planet, position.sign, "sky"), "sky");
        const summary = content.summary ?? placementMeanings[position.planet] ?? "marks one of the live notes in today's sky.";

        return (
          <p key={position.planet}>
            {index === 0 ? "Today’s " : ""}
            <strong>{position.planet}</strong>
            {" at "}
            <span>{formatPlacementPosition(position).toUpperCase()}</span>
            {" "}
            {summary}
          </p>
        );
      })}
    </div>
  );
}

function PlacementTable({
  positions,
  aspects,
  onOpenDetail
}: {
  positions: PlanetPosition[];
  aspects: SkySnapshot["aspects"];
  onOpenDetail: (detail: SkyDetail) => void;
}) {
  const orderedPositions = placementPlanetOrder
    .map((planet) => positions.find((position) => position.planet === planet))
    .filter((position): position is PlanetPosition => Boolean(position));

  return (
    <div className="placement-table-wrap" role="list" aria-label="Daily planetary placements">
      <div className="placement-table">
        {orderedPositions.map((position) => {
          const activeAspects = aspectsForPlacement(position, aspects);
          const title = placementDetailTitle(position, activeAspects);
          const dignity = placementDignity(position);
          const statuses = placementStatuses(position);
          const content = approvedVoiceOrKnowledgeFallback(placementContentId(position.planet, position.sign, "sky"), "sky");
          const detailParagraphs = content.detailParagraphs.length > 0
            ? content.detailParagraphs
            : [
                <>
                  <strong>{position.planet}</strong> is moving through <strong>{formatPlacementPosition(position)}</strong> in the current sky.
                </>,
                placementMeanings[position.planet] ?? "This placement marks one of the live notes in today's sky.",
                `${position.sign} gives this planet its style: the sign tells you how the planet is expressing itself, while the degree shows where it is inside that sign.`
              ];
          const body = placementDetailBody(position, positions, aspects, detailParagraphs);
          const openDetail = () => onOpenDetail({
            glyph: position.glyph,
            kicker: placementDetailKicker(position, activeAspects),
            title,
            meta: `${formatPlacementPosition(position).toUpperCase()} · TODAY`,
            body,
            content: content.bundle
          });

          return (
            <div className="sky-pl-item" role="listitem" key={position.planet}>
            <button
              className={`sky-pl ${position.motion === "retrograde" ? "is-retrograde" : ""}`}
              type="button"
              aria-label={`Read more about ${title}`}
              onClick={openDetail}
            >
              <span className="sky-pl-glyph" aria-hidden="true">{position.glyph}</span>
              <span className="sky-pl-body">
                <span className="sky-pl-main">
                  <span className="sky-pl-title">{title}</span>
                  <span className="sky-pl-degree">{formatDegree(position.degree)}°</span>
                  {position.motion === "retrograde" ? <span className="sky-pl-rx" aria-label="Retrograde">℞</span> : null}
                  {dignity ? (
                    <span className={`spl-dig spl-dig-${dignity.tone}`}>
                      {dignity.label}
                    </span>
                  ) : null}
                </span>
                <span className="sky-pl-range">{placementRangeLabel(position)}</span>
                {statuses.length > 0 ? (
                  <span className="sky-pl-status" aria-label={`${position.planet} status`}>
                    {statuses.map((status) => (
                      <span className={`spl-status-item spl-status-${status.tone}`} key={status.label}>
                        {status.label}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="sky-pl-chevron" aria-hidden="true" />
            </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateChartFlow({
  form,
  setForm,
  profile,
  step,
  setStep,
  onSave
}: {
  form: TransitForm;
  setForm: (form: TransitForm) => void;
  profile: UserProfile | null;
  step: "overview" | "birth" | "city";
  setStep: (step: "overview" | "birth" | "city") => void;
  onSave: (options?: { closeModal?: boolean; nextStep?: "overview" | "birth" | "city" }) => void | Promise<void>;
}) {
  function updateField<Key extends keyof TransitForm>(key: Key, value: TransitForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateNumberField<Key extends keyof TransitForm>(key: Key, value: string, maxLength = 2) {
    updateField(key, value.replace(/\D/g, "").slice(0, maxLength) as TransitForm[Key]);
  }

  function submitBirthForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave({ closeModal: false, nextStep: "overview" });
  }

  function submitCityForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave();
  }

  const primaryChart = profile?.charts[0];
  const accountComplete = Boolean(profile);
  const birthDate = formatSignupBirthDate({
    month: form.birthMonth,
    day: form.birthDay,
    year: form.birthYear
  }) || (primaryChart?.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(primaryChart.birthDate) ? primaryChart.birthDate : "");
  const birthComplete = Boolean(
    birthDate &&
    form.birthPlace.trim() &&
    (form.unknownBirthTime || formatSignupBirthTime({
      hour: form.birthHour,
      minute: form.birthMinute,
      meridiem: form.birthMeridiem
    }))
  );
  const currentCityComplete = Boolean(form.currentLocation.trim() || profile?.currentLocation?.trim());
  const flowSteps = [
    { id: "account", label: "Create account", status: accountComplete ? "complete" : "step 1", complete: accountComplete, icon: <User size={21} aria-hidden="true" />, onClick: null },
    { id: "birth", label: "Add birth information", status: birthComplete ? "complete" : accountComplete ? "next step" : "step 2", complete: birthComplete, icon: <CalendarDays size={21} aria-hidden="true" />, onClick: () => setStep("birth") },
    { id: "city", label: "Enter current city", status: currentCityComplete ? "complete" : birthComplete ? "next step" : "step 3", complete: currentCityComplete, icon: <MapPin size={21} aria-hidden="true" />, onClick: () => setStep("city") }
  ];

  if (step === "overview") {
    return (
      <div className="create-chart-flow create-chart-overview">
        <div className="chart-modal-heading">
          <h3 id="chart-modal-title">Create your chart</h3>
          <p>Three quick steps to unlock your personalized sky.</p>
        </div>

        <div className="create-chart-steps" aria-label="Create your chart steps">
          {flowSteps.map((flowStep, index) => (
            <div
              className={`create-chart-step-row ${flowStep.complete ? "complete" : ""} ${!flowStep.complete && flowSteps.findIndex((candidate) => !candidate.complete) === index ? "active" : ""}`}
              key={flowStep.id}
            >
              <span className="create-chart-rail" aria-hidden="true"><span /></span>
              <button
                className="create-chart-step"
                type="button"
                disabled={!flowStep.onClick}
                onClick={() => flowStep.onClick?.()}
              >
                <span className="create-chart-step-icon">{flowStep.icon}</span>
                <span className="create-chart-step-copy">
                  <span>{flowStep.status}</span>
                  <strong>{flowStep.label}</strong>
                </span>
                {flowStep.onClick && <ChevronRight size={20} aria-hidden="true" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === "city") {
    return (
      <form className="create-chart-flow create-chart-detail" onSubmit={submitCityForm}>
        <div className="chart-modal-heading">
          <h3 id="chart-modal-title">Where are you now?</h3>
          <p>Your current city sets the sky for today's readings.</p>
        </div>

        <CitySearchField
          label="Current city"
          value={form.currentLocation}
          onChange={(value) => {
            setForm({ ...form, currentLocation: value, currentLocationData: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, currentLocation: suggestion.label, currentLocationData: suggestion });
          }}
          placeholder="New York City, NY"
          className="signup-city-search create-chart-city-search"
        />

        <button className="signup-submit create-chart-save" type="submit">Save location</button>
      </form>
    );
  }

  return (
    <form className="create-chart-flow create-chart-detail" onSubmit={submitBirthForm}>
      <div className="chart-modal-heading">
        <h3 id="chart-modal-title">Your birth information</h3>
        <p>This pinpoints the exact sky at your first breath.</p>
      </div>

      <div className="signup-fields create-chart-fields">
        <label className="signup-field">
          <span>Full name</span>
          <div>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Your name" />
          </div>
        </label>

        <div className="signup-grid">
          <label className="signup-field">
            <span>Date of birth</span>
            <div className="signup-date-control">
              <input
                aria-label="Birth month"
                inputMode="numeric"
                placeholder="MM"
                value={form.birthMonth}
                onChange={(event) => updateNumberField("birthMonth", event.target.value)}
              />
              <span aria-hidden="true">/</span>
              <input
                aria-label="Birth day"
                inputMode="numeric"
                placeholder="DD"
                value={form.birthDay}
                onChange={(event) => updateNumberField("birthDay", event.target.value)}
              />
              <span aria-hidden="true">/</span>
              <input
                aria-label="Birth year"
                inputMode="numeric"
                placeholder="YYYY"
                value={form.birthYear}
                onChange={(event) => updateNumberField("birthYear", event.target.value, 4)}
              />
            </div>
          </label>

          <label className="signup-field">
            <span>Time of birth</span>
            <div className="signup-time-control">
              <input
                aria-label="Birth hour"
                inputMode="numeric"
                placeholder="HH"
                value={form.birthHour}
                disabled={form.unknownBirthTime}
                onChange={(event) => updateNumberField("birthHour", event.target.value)}
              />
              <span className="time-separator" aria-hidden="true">:</span>
              <input
                aria-label="Birth minute"
                inputMode="numeric"
                placeholder="MM"
                value={form.birthMinute}
                disabled={form.unknownBirthTime}
                onChange={(event) => updateNumberField("birthMinute", event.target.value)}
              />
              <div className="signup-meridiem" aria-label="AM or PM">
                {(["AM", "PM"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={form.birthMeridiem === period ? "active" : ""}
                    disabled={form.unknownBirthTime}
                    aria-pressed={form.birthMeridiem === period}
                    onClick={() => updateField("birthMeridiem", period)}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </label>
        </div>

        <label className="unknown-time">
          <input
            type="checkbox"
            checked={form.unknownBirthTime}
            onChange={(event) => {
              setForm({
                ...form,
                unknownBirthTime: event.target.checked,
                birthHour: event.target.checked ? "12" : form.birthHour,
                birthMinute: event.target.checked ? "00" : form.birthMinute,
                birthMeridiem: event.target.checked ? "PM" : form.birthMeridiem
              });
            }}
          />
          <span>I don't know my birth time.</span>
        </label>

        <CitySearchField
          label="Birth place"
          value={form.birthPlace}
          onChange={(value) => {
            setForm({ ...form, birthPlace: value, birthLocation: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, birthPlace: suggestion.label, birthLocation: suggestion });
          }}
          placeholder="Manhattan, NY"
          className="signup-city-search create-chart-city-search"
        />
      </div>

      <button className="signup-submit create-chart-save" type="submit">Save birth details</button>
    </form>
  );
}

function TransitResults({
  form,
  transits,
  selectedTransit,
  selectedTransitId,
  setSelectedTransitId
}: {
  form: TransitForm;
  transits: TransitItem[];
  selectedTransit: TransitItem;
  selectedTransitId: string;
  setSelectedTransitId: (id: string) => void;
}) {
  const shortTransits = transits.filter((transit) => transit.term === "short");
  const longTransits = transits.filter((transit) => transit.term === "long");
  const chartDate = new Date(`${form.chartDate}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="transit-results" aria-label="Daily transits">
      <div className="transit-summary">
        <div>
          <span>Birth chart details</span>
          <strong>{form.name || "Unnamed chart"}</strong>
          <p>{form.birthMonth} {form.birthDay}, {form.birthYear} · {form.unknownBirthTime ? "Time unknown" : `${form.birthHour}:${form.birthMinute.padStart(2, "0")} ${form.birthMeridiem}`}</p>
          <p>{form.birthPlace}</p>
        </div>
        <div>
          <span>Chart of day</span>
          <strong>{chartDate}</strong>
          {form.currentLocation && <p>{form.currentLocation}</p>}
        </div>
      </div>

      <div className="transit-heading-row">
        <div>
          <span>Daily transits</span>
          <strong>{new Date(`${form.chartDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</strong>
        </div>
      </div>

      <div className="transit-lists">
        <TransitList title="Short term transits" transits={shortTransits} selectedTransitId={selectedTransitId} setSelectedTransitId={setSelectedTransitId} />
        <TransitList title="Long term transits" transits={longTransits} selectedTransitId={selectedTransitId} setSelectedTransitId={setSelectedTransitId} />
      </div>

      <TransitDetail transit={selectedTransit} form={form} />
    </section>
  );
}

function TransitList({
  title,
  transits,
  selectedTransitId,
  setSelectedTransitId
}: {
  title: string;
  transits: TransitItem[];
  selectedTransitId: string;
  setSelectedTransitId: (id: string) => void;
}) {
  return (
    <section className="transit-list" aria-label={title}>
      <h3>{title}</h3>
      {transits.map((transit) => (
        <button
          key={transit.id}
          className={selectedTransitId === transit.id ? "transit-row active" : "transit-row"}
          type="button"
          onClick={() => setSelectedTransitId(transit.id)}
        >
          <span className="aspect-glyph">{transit.glyph}</span>
          <span className="transit-name">
            <strong>{transit.transitPlanet}</strong>
            <em>{transit.aspect}</em>
            <strong>{transit.natalPoint}</strong>
          </span>
          <span className="orb">{transit.orb}</span>
          {transit.direction === "applying" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
        </button>
      ))}
    </section>
  );
}

function TransitDetail({ transit, form }: { transit: TransitItem; form: TransitForm }) {
  const maxOrb = Math.max(1, ...transit.arc);
  const chartDate = new Date(`${form.chartDate}T12:00:00`);
  const arcStartDate = new Date(chartDate);
  const arcMiddleDate = new Date(chartDate);
  const arcEndDate = new Date(chartDate);
  arcStartDate.setDate(chartDate.getDate() - 3);
  arcEndDate.setDate(chartDate.getDate() + 3);
  const arcDateLabel = (date: Date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const points = transit.arc.map((value, index) => {
    const x = 24 + index * 56;
    const y = 104 - (value / maxOrb) * 72;
    return `${x},${y}`;
  }).join(" ");

  return (
    <section className="transit-detail" aria-label="Transit in detail">
      <div>
        <span>Transit in detail</span>
        <h3>{transit.transitPlanet} <em>{transit.aspect}</em> {transit.natalPoint}</h3>
        <ul>
          <li>{transit.transitPlanet} in today's sky</li>
          <li>is {transit.aspect} to</li>
          <li>your natal {transit.natalPoint} in {transit.natalSign}</li>
        </ul>
      </div>
      <div className="orb-card">
        <h4>Orb change over {arcDateLabel(chartDate)}</h4>
        <svg viewBox="0 0 330 130" role="img" aria-label="Orb change chart">
          <g className="orb-grid">
            <line x1="24" y1="24" x2="304" y2="24" />
            <line x1="24" y1="64" x2="304" y2="64" />
            <line x1="24" y1="104" x2="304" y2="104" />
          </g>
          <polyline points={points} />
          <text x="24" y="123">{arcDateLabel(arcStartDate)}</text>
          <text x="142" y="123">{arcDateLabel(arcMiddleDate)}</text>
          <text x="274" y="123">{arcDateLabel(arcEndDate)}</text>
        </svg>
      </div>
      <article className="read-closely">
        <span>Read it closely</span>
        <h3>{transit.note}</h3>
        <p>This contact compares today’s Swiss Ephemeris sky with the saved natal chart details.</p>
      </article>
    </section>
  );
}

function SignupView({ initialMode = "create", onClose, onCreateProfile }: { initialMode?: AuthMode; onClose: () => void; onCreateProfile: (profile: UserProfile) => void }) {
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);
  const [form, setForm] = useState<SignupForm>(defaultSignupForm);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authStatus, setAuthStatus] = useState<"idle" | "loading">("idle");
  const [authMessage, setAuthMessage] = useState("");
  const [birthDateParts, setBirthDateParts] = useState<SignupDateParts>(() => splitSignupBirthDate(defaultSignupForm.birthDate));
  const birthTimeParts = splitSignupBirthTime(form.birthTime);
  const isLogin = authMode === "login";

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  function updateField<Key extends keyof SignupForm>(key: Key, value: SignupForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateBirthTime(part: keyof SignupTimeParts, value: string) {
    const nextParts = {
      ...birthTimeParts,
      [part]: part === "meridiem" ? value as SignupTimeParts["meridiem"] : value.replace(/\D/g, "").slice(0, 2)
    };

    updateField("birthTime", formatSignupBirthTime(nextParts));
  }

  function updateBirthDate(part: keyof SignupDateParts, value: string) {
    const maxLength = part === "year" ? 4 : 2;
    const nextParts = {
      ...birthDateParts,
      [part]: value.replace(/\D/g, "").slice(0, maxLength)
    };

    setBirthDateParts(nextParts);
    updateField("birthDate", formatSignupBirthDate(nextParts));
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthConfigured) {
      setAuthMessage(`Add Supabase environment variables to enable real email ${isLogin ? "login" : "signup"}.`);
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setAuthMessage(`Add an email and password to ${isLogin ? "log in" : "create your account"}.`);
      return;
    }

    setAuthStatus("loading");
    setAuthMessage("");
    if (!isLogin) {
      savePendingSignupForm(form);
    }

    try {
      const account = isLogin
        ? await signInWithEmail({
            email: form.email.trim(),
            password: form.password
          })
        : await signUpWithEmail({
            email: form.email.trim(),
            password: form.password,
            fullName: form.fullName.trim()
          });

      if (account) {
        onCreateProfile(createUserProfile(form, "email", account));
        clearPendingSignupForm();
      } else {
        setAuthMessage("Check your email to confirm your account.");
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Email signup failed.");
    } finally {
      setAuthStatus("idle");
    }
  }

  async function socialSignup(provider: "google") {
    if (!isAuthConfigured) {
      setAuthMessage("Add Supabase environment variables to enable real social sign-on.");
      return;
    }

    setAuthStatus("loading");
    setAuthMessage("");
    if (authMode === "create") {
      savePendingSignupForm(form);
    } else {
      clearPendingSignupForm();
    }

    try {
      await signInWithProvider(provider);
    } catch (error) {
      setAuthStatus("idle");
      setAuthMessage(error instanceof Error ? error.message : `${providerLabel(provider)} sign-on failed.`);
    }
  }

  return (
    <section className="signup-split" aria-label={isLogin ? "Log in" : "Create account"}>
      <button className="auth-close-button" type="button" aria-label="Close" onClick={onClose}>
        <X size={20} aria-hidden="true" />
      </button>
      <aside className="signup-story">
        <h2>
          {isLogin ? "Welcome back." : "Know what the sky is doing."}
          <em>{isLogin ? "Your chart is waiting." : "Know what to do about it."}</em>
        </h2>
        <div className="signup-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </aside>

      <form className="signup-form" onSubmit={submitSignup}>
        <div className="signup-heading">
          <p>{isLogin ? "Log in" : "Create profile"}</p>
          {isLogin && <h3>Return to your sky.</h3>}
        </div>

        {!isAuthConfigured && (
          <p className="auth-message">
            Add VITE_SUPABASE_URL and a Supabase publishable key to enable live sign-on.
          </p>
        )}

        <div className="social-signons" aria-label="Social sign on">
          <button type="button" disabled={authStatus === "loading"} onClick={() => socialSignup("google")}>
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        {authMessage && <p className="auth-message">{authMessage}</p>}

        <div className="email-divider"><span>or with email</span></div>

        <div className="signup-fields">
          {!isLogin && (
            <label className="signup-field">
              <span>Full name</span>
              <div>
                <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Jules Okafor" />
              </div>
            </label>
          )}

          <label className="signup-field">
            <span>Email</span>
            <div>
              <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@somewhere.com" />
            </div>
          </label>

          <label className="signup-field">
            <span>Password</span>
            <div className="password-control">
              <input
                type={passwordVisible ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="at least 8 characters"
              />
              <button
                type="button"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                title={passwordVisible ? "Hide password" : "Show password"}
                onClick={() => setPasswordVisible((isVisible) => !isVisible)}
              >
                {passwordVisible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
          </label>

          {!isLogin && (
            <>
              <CitySearchField
                label="Birth city"
                value={form.birthCity}
                onChange={(value) => setForm({ ...form, birthCity: value, birthLocation: null })}
                onSelect={(suggestion) => setForm({ ...form, birthCity: suggestion.label, birthLocation: suggestion })}
                placeholder="Start typing the city where you were born."
                className="signup-city-search"
              />

              <div className="signup-grid">
                <label className="signup-field">
                  <span>Birth date</span>
                  <div className="signup-date-control">
                    <input
                      aria-label="Birth month"
                      inputMode="numeric"
                      placeholder="MM"
                      value={birthDateParts.month}
                      onChange={(event) => updateBirthDate("month", event.target.value)}
                    />
                    <span aria-hidden="true">/</span>
                    <input
                      aria-label="Birth day"
                      inputMode="numeric"
                      placeholder="DD"
                      value={birthDateParts.day}
                      onChange={(event) => updateBirthDate("day", event.target.value)}
                    />
                    <span aria-hidden="true">/</span>
                    <input
                      aria-label="Birth year"
                      inputMode="numeric"
                      placeholder="YYYY"
                      value={birthDateParts.year}
                      onChange={(event) => updateBirthDate("year", event.target.value)}
                    />
                  </div>
                </label>

                <label className="signup-field">
                  <span>Birth time</span>
                  <div className="signup-time-control">
                    <input
                      aria-label="Birth hour"
                      inputMode="numeric"
                      placeholder="HH"
                      value={birthTimeParts.hour}
                      disabled={form.unknownBirthTime}
                      onChange={(event) => updateBirthTime("hour", event.target.value)}
                    />
                    <span className="time-separator" aria-hidden="true">:</span>
                    <input
                      aria-label="Birth minute"
                      inputMode="numeric"
                      placeholder="MM"
                      value={birthTimeParts.minute}
                      disabled={form.unknownBirthTime}
                      onChange={(event) => updateBirthTime("minute", event.target.value)}
                    />
                    <div className="signup-meridiem" aria-label="AM or PM">
                      {(["AM", "PM"] as const).map((period) => (
                        <button
                          key={period}
                          type="button"
                          className={birthTimeParts.meridiem === period ? "active" : ""}
                          disabled={form.unknownBirthTime}
                          aria-pressed={birthTimeParts.meridiem === period}
                          onClick={() => updateBirthTime("meridiem", period)}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>
              </div>

              <label className="unknown-time">
                <input
                  type="checkbox"
                  checked={form.unknownBirthTime}
                  onChange={(event) => {
                    setForm({ ...form, unknownBirthTime: event.target.checked, birthTime: event.target.checked ? "12:00 PM" : form.birthTime });
                  }}
                />
                <span>I don't know my birth time.</span>
              </label>
            </>
          )}
        </div>

        <button className="signup-submit" type="submit" disabled={authStatus === "loading"}>
          {authStatus === "loading" ? "Working..." : isLogin ? "Log in →" : "Create Account →"}
        </button>
        <p className="signin-note">
          {isLogin ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setAuthMessage("");
              setAuthMode(isLogin ? "create" : "login");
            }}
          >
            {isLogin ? "Create an account" : "Login"}
          </button>
        </p>
      </form>
    </section>
  );
}

function SettingsView({
  profile,
  onUpdateProfile,
  theme,
  sunriseOrbEnabled,
  dyslexiaFriendlyFont,
  onThemeChange,
  onSunriseOrbChange,
  onDyslexiaFontChange,
  onSignOut
}: {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  theme: UiTheme;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  onThemeChange: (theme: UiTheme) => void;
  onSunriseOrbChange: (enabled: boolean) => void;
  onDyslexiaFontChange: (enabled: boolean) => void;
  onSignOut: () => void | Promise<void>;
}) {
  const primaryChart = profile.charts[0];
  const savedBirthDate = primaryChart?.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(primaryChart.birthDate) ? primaryChart.birthDate : "";
  const savedBirthTime = primaryChart?.birthTime && primaryChart.birthTime !== "Birth time needed" ? primaryChart.birthTime : "";
  const [profileName, setProfileName] = useState(profile.name);
  const [profileEmail, setProfileEmail] = useState(profile.email);
  const [birthCity, setBirthCity] = useState(primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "");
  const [birthLocation, setBirthLocation] = useState<LocationInput | null>(primaryChart?.birthLocation ?? null);
  const [birthDateParts, setBirthDateParts] = useState<SignupDateParts>(() => splitSignupBirthDate(savedBirthDate));
  const [birthTime, setBirthTime] = useState(savedBirthTime === "Time unknown" ? "12:00 PM" : savedBirthTime);
  const [unknownBirthTime, setUnknownBirthTime] = useState(savedBirthTime === "Time unknown");
  const [currentCity, setCurrentCity] = useState(profile.currentLocation ?? "");
  const [currentLocationData, setCurrentLocationData] = useState<LocationInput | null>(profile.currentLocationData ?? null);
  const [settings, setSettings] = useState<ChartSettings>(() => normalizeChartSettings(profile.settings));
  const [activeSettingsTab, setActiveSettingsTab] = useState<"account" | "chart" | "preferences">("account");
  const [settingsEditing, setSettingsEditing] = useState(false);
  const [currentLocationEditing, setCurrentLocationEditing] = useState(false);
  const birthTimeParts = splitSignupBirthTime(birthTime);
  const birthDateDisplay = savedBirthDate ? formatProfileBirthDate(savedBirthDate) : "Not set";
  const birthTimeDisplay = savedBirthTime || "Not set";
  const birthCityDisplay = primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "Not set";
  const currentCityDisplay = profile.currentLocation || defaultLocation.label;

  function resetSettingsDraft() {
    setProfileName(profile.name);
    setProfileEmail(profile.email);
    setBirthCity(primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "");
    setBirthLocation(primaryChart?.birthLocation ?? null);
    setBirthDateParts(splitSignupBirthDate(savedBirthDate));
    setBirthTime(savedBirthTime === "Time unknown" ? "12:00 PM" : savedBirthTime);
    setUnknownBirthTime(savedBirthTime === "Time unknown");
    setCurrentCity(profile.currentLocation ?? "");
    setCurrentLocationData(profile.currentLocationData ?? null);
    setSettings(normalizeChartSettings(profile.settings));
    setCurrentLocationEditing(false);
  }

  function updateBirthDate(part: keyof SignupDateParts, value: string) {
    const maxLength = part === "year" ? 4 : 2;
    setBirthDateParts({
      ...birthDateParts,
      [part]: value.replace(/\D/g, "").slice(0, maxLength)
    });
  }

  function updateBirthTime(part: keyof SignupTimeParts, value: string) {
    const nextParts = {
      ...birthTimeParts,
      [part]: part === "meridiem" ? value as SignupTimeParts["meridiem"] : value.replace(/\D/g, "").slice(0, 2)
    };

    setBirthTime(formatSignupBirthTime(nextParts));
  }

  async function saveSettings() {
    const nextName = profileName.trim() || profile.name;
    const nextEmail = profileEmail.trim() || profile.email;
    const nextBirthDate = formatSignupBirthDate(birthDateParts);
    const nextBirthTime = unknownBirthTime ? "Time unknown" : birthTime || "Birth time needed";
    let chart: UserChart = {
      id: primaryChart?.id ?? `chart-${Date.now()}`,
      name: primaryChart?.name && primaryChart.name !== chartNameFromProfile(profile.name)
        ? primaryChart.name
        : chartNameFromProfile(nextName),
      type: "Birth chart",
      birthDate: nextBirthDate || "Birth date needed",
      birthTime: nextBirthTime,
      birthCity: birthCity.trim() || "Birth city needed",
      birthLocation
    };
    let nextSun = nextBirthDate ? zodiacFromBirthDate(nextBirthDate) : profile.sun;
    let nextMoon = profile.moon;
    let nextRising = unknownBirthTime || nextBirthTime === "Birth time needed" ? "Rising pending" : profile.rising;
    const nextBirthCity = birthCity.trim();
    const resolvedBirthLocation = nextBirthCity
      ? birthLocation?.label === nextBirthCity
        ? withTimeZone(birthLocation)
        : locationFromLabel(nextBirthCity)
      : null;

    if (nextBirthDate && resolvedBirthLocation && nextBirthTime !== "Birth time needed") {
      const birthDateTime = zonedDateTimeToUtc(nextBirthDate, unknownBirthTime ? "12:00 PM" : nextBirthTime, resolvedBirthLocation.timeZone);
      const natalSky = await getAstrodienstSky(resolvedBirthLocation, birthDateTime);
      const natalBigThree = natalBigThreeFromSky(natalSky, unknownBirthTime);

      nextSun = natalBigThree.sun;
      nextMoon = natalBigThree.moon;
      nextRising = natalBigThree.rising;
      chart = { ...chart, birthLocation: resolvedBirthLocation };
    }

    onUpdateProfile({
      ...profile,
      name: nextName,
      email: nextEmail,
      sun: nextSun,
      moon: nextMoon,
      rising: nextRising,
      currentLocation: currentCity.trim(),
      currentLocationData,
      settings: normalizeChartSettings(settings),
      charts: [chart, ...profile.charts.slice(1)]
    });
    setSettingsEditing(false);
  }

  function handleSettingsAction() {
    if (settingsEditing) {
      onUpdateProfile({
        ...profile,
        settings: normalizeChartSettings(settings)
      });
      setSettingsEditing(false);
      return;
    }

    resetSettingsDraft();
    setSettingsEditing(true);
  }

  function startCurrentLocationEdit() {
    setCurrentCity(profile.currentLocation || defaultLocation.label);
    setCurrentLocationData(profile.currentLocationData ?? withTimeZone(defaultLocation));
    setCurrentLocationEditing(true);
  }

  function cancelCurrentLocationEdit() {
    setCurrentCity(profile.currentLocation ?? "");
    setCurrentLocationData(profile.currentLocationData ?? null);
    setCurrentLocationEditing(false);
  }

  function saveCurrentLocation() {
    const trimmed = currentCity.trim();
    const nextLocation = trimmed
      ? currentLocationData?.label === trimmed
        ? withTimeZone(currentLocationData)
        : locationFromLabel(trimmed)
      : withTimeZone(defaultLocation);

    onUpdateProfile({
      ...profile,
      currentLocation: nextLocation.label,
      currentLocationData: nextLocation
    });
    setCurrentCity(nextLocation.label);
    setCurrentLocationData(nextLocation);
    setCurrentLocationEditing(false);
  }

  return (
    <section className="settings-page" aria-label="Settings">
      <div className="settings-header">
        <h2>settings.</h2>
        <button className="settings-save" type="button" onClick={handleSettingsAction}>
          {settingsEditing ? "Save changes" : "Edit settings"}
        </button>
      </div>

      <div className="settings-panel">
        <section className="settings-group" aria-label="Personalization settings">
          <span className="settings-group-label">Personalize</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Personalization settings">
              {currentLocationEditing ? (
                <div className="settings-row settings-location-editor">
                  <CitySearchField
                    label="Current location"
                    value={currentCity}
                    onChange={(value) => {
                      setCurrentCity(value);
                      setCurrentLocationData(null);
                    }}
                    onSelect={(suggestion) => {
                      setCurrentCity(suggestion.label);
                      setCurrentLocationData(suggestion);
                    }}
                    placeholder={defaultLocation.label}
                    className="settings-city-search"
                  />
                  <div className="settings-location-actions">
                    <button className="settings-location-save" type="button" onClick={saveCurrentLocation}>
                      Save location
                    </button>
                    <button className="settings-location-cancel" type="button" onClick={cancelCurrentLocationEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button className="settings-row settings-row-button" type="button" onClick={startCurrentLocationEdit}>
                  <span>Current location</span>
                  <strong>{currentCityDisplay}</strong>
                </button>
              )}
              <div className="settings-row settings-row-control">
                <span>Theme</span>
                <AppearanceToggle theme={theme} onThemeChange={onThemeChange} />
              </div>
              <div className="settings-row settings-row-control">
                <div>
                  <span>Sunrise orb</span>
                </div>
                <SwitchControl
                  checked={sunriseOrbEnabled}
                  label="Toggle sunrise orb"
                  onChange={onSunriseOrbChange}
                />
              </div>
              <div className="settings-row settings-row-control">
                <div>
                  <span>Dyslexia-friendly font</span>
                </div>
                <SwitchControl
                  checked={dyslexiaFriendlyFont}
                  label="Toggle dyslexia-friendly font"
                  onChange={onDyslexiaFontChange}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Chart defaults">
          <span className="settings-group-label">Chart defaults</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Chart defaults">
              <div className="settings-row">
                <span>House system</span>
                <strong>Whole House</strong>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function GuestSettingsView({
  theme,
  location,
  sunriseOrbEnabled,
  dyslexiaFriendlyFont,
  onThemeChange,
  onSunriseOrbChange,
  onDyslexiaFontChange
}: {
  theme: UiTheme;
  location: LocationInput;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  onThemeChange: (theme: UiTheme) => void;
  onSunriseOrbChange: (enabled: boolean) => void;
  onDyslexiaFontChange: (enabled: boolean) => void;
}) {
  return (
    <section className="settings-page guest-settings-page" aria-label="Settings">
      <div className="settings-header">
        <h2>settings.</h2>
      </div>

      <div className="settings-panel">
        <section className="settings-group" aria-label="Personal settings">
          <span className="settings-group-label">Personalize</span>
          <div className="settings-card">
            <div className="settings-list">
              <div className="settings-row">
                <span>Current location</span>
                <strong>{location.label}</strong>
              </div>
              <div className="settings-row settings-row-control">
                <span>Theme</span>
                <AppearanceToggle theme={theme} onThemeChange={onThemeChange} />
              </div>
              <div className="settings-row settings-row-control">
                <div>
                  <span>Sunrise orb</span>
                </div>
                <SwitchControl
                  checked={sunriseOrbEnabled}
                  label="Toggle sunrise orb"
                  onChange={onSunriseOrbChange}
                />
              </div>
              <div className="settings-row settings-row-control">
                <div>
                  <span>Dyslexia-friendly font</span>
                </div>
                <SwitchControl
                  checked={dyslexiaFriendlyFont}
                  label="Toggle dyslexia-friendly font"
                  onChange={onDyslexiaFontChange}
                />
              </div>
            </div>
          </div>
        </section>

      </div>
    </section>
  );
}

function AppearanceToggle({
  theme,
  onThemeChange
}: {
  theme: UiTheme;
  onThemeChange: (theme: UiTheme) => void;
}) {
  return (
    <div className="settings-theme-control" aria-label="Theme">
      {(["light", "dark"] as const).map((themeOption) => (
        <button
          key={themeOption}
          type="button"
          className={theme === themeOption ? "active" : ""}
          aria-pressed={theme === themeOption}
          onClick={() => onThemeChange(themeOption)}
        >
          {themeOption}
        </button>
      ))}
    </div>
  );
}

function SwitchControl({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`settings-switch ${checked ? "is-on" : ""}`}
      aria-label={label}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span aria-hidden="true" />
    </button>
  );
}

function AccountView({
  profile,
  onSignOut,
  onUpdateProfile
}: {
  profile: UserProfile;
  onSignOut: () => void | Promise<void>;
  onUpdateProfile: (profile: UserProfile) => void;
}) {
  const primaryChart = profile.charts[0];
  const savedBirthDate = validChartBirthDate(primaryChart);
  const savedBirthTime = validChartBirthTime(primaryChart);
  const savedBirthCity = validChartBirthCity(primaryChart);
  const [draftBirthDate, setDraftBirthDate] = useState(savedBirthDate);
  const [draftBirthTime, setDraftBirthTime] = useState(savedBirthTime);
  const [draftBirthCity, setDraftBirthCity] = useState(savedBirthCity);

  useEffect(() => {
    setDraftBirthDate(savedBirthDate);
    setDraftBirthTime(savedBirthTime);
    setDraftBirthCity(savedBirthCity);
  }, [savedBirthDate, savedBirthTime, savedBirthCity]);

  const birthDraftDirty =
    draftBirthDate !== savedBirthDate ||
    draftBirthTime !== savedBirthTime ||
    draftBirthCity !== savedBirthCity;

  const saveBirthChartDetails = () => {
    const nextBirthDate = draftBirthDate.trim();
    const nextBirthTime = draftBirthTime.trim();
    const nextBirthCity = draftBirthCity.trim();
    const baseChart: UserChart = primaryChart ?? {
      id: `chart-${Date.now()}`,
      name: chartNameFromProfile(profile.name),
      type: "Birth chart",
      birthDate: "Birth date needed",
      birthTime: "Birth time needed",
      birthCity: "Birth city needed",
      birthLocation: null
    };
    const nextChart: UserChart = {
      ...baseChart,
      name: baseChart.name || chartNameFromProfile(profile.name),
      birthDate: nextBirthDate || "Birth date needed",
      birthTime: nextBirthTime || "Birth time needed",
      birthCity: nextBirthCity || "Birth city needed",
      birthLocation: baseChart.birthLocation ?? null
    };

    onUpdateProfile({
      ...profile,
      sun: nextBirthDate ? zodiacFromBirthDate(nextBirthDate) : profile.sun,
      charts: primaryChart
        ? profile.charts.map((chart, index) => (index === 0 ? nextChart : chart))
        : [nextChart]
    });
  };

  return (
    <section className="account-page" aria-label="Account">
      <div className="account-page-heading">
        <h2>account.</h2>
      </div>

      <section className="settings-card settings-account-card" aria-label="Account details">
        <div className="settings-profile-row">
          <ProfileAvatar profile={profile} size="large" />
          <div>
            <h3>{profile.name}</h3>
            <span>{profile.email}</span>
          </div>
        </div>

        <div className="settings-list">
          <div className="settings-row">
            <span>Name</span>
            <strong>{profile.name}</strong>
          </div>
          <div className="settings-row">
            <span>Email</span>
            <strong>{profile.email}</strong>
          </div>
          <div className="settings-row">
            <span>Signed in with</span>
            <strong>{profile.provider === "google" ? "Google" : "Email"}</strong>
          </div>
          <button type="button" className="settings-row settings-signout-row" onClick={onSignOut}>
            <span>Sign out</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className="settings-group account-chart-group" aria-label="Birth chart">
        <span className="settings-group-label">Birth chart</span>
        <div className="settings-card">
          <div className="settings-list">
            <label className="settings-row account-editable-row">
              <span>Date</span>
              <input
                className="account-row-input"
                type="date"
                value={draftBirthDate}
                onChange={(event) => setDraftBirthDate(event.target.value)}
                aria-label="Birth date"
              />
            </label>
            <label className="settings-row account-editable-row">
              <span>Time</span>
              <input
                className="account-row-input"
                type="text"
                inputMode="text"
                value={draftBirthTime}
                onChange={(event) => setDraftBirthTime(event.target.value)}
                placeholder="Not set"
                aria-label="Birth time"
              />
            </label>
            <label className="settings-row account-editable-row">
              <span>Place</span>
              <input
                className="account-row-input"
                type="text"
                value={draftBirthCity}
                onChange={(event) => setDraftBirthCity(event.target.value)}
                placeholder="Not set"
                aria-label="Birth place"
              />
            </label>
            <div className="settings-row">
              <span>House system</span>
              <strong>Whole House</strong>
            </div>
            {birthDraftDirty && (
              <div className="settings-row account-birth-save-row">
                <span>Birth details</span>
                <button
                  className="account-birth-save-button"
                  type="button"
                  onClick={saveBirthChartDetails}
                >
                  Save changes
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

function ProfileView({
  profile,
  transitItems,
  natalSky,
  transitsDrawn,
  setSelectedTransitId,
  onCreateChart
}: {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  transitForm: TransitForm;
  transitItems: TransitItem[];
  natalSky: SkySnapshot | null;
  transitsDrawn: boolean;
  selectedTransit: TransitItem;
  selectedTransitId: string;
  setSelectedTransitId: (id: string) => void;
  onCreateChart: () => void;
}) {
  const primaryChart = profile.charts[0];
  const savedBirthDate = validChartBirthDate(primaryChart);
  const savedBirthTime = primaryChart?.birthTime && primaryChart.birthTime !== "Birth time needed"
    ? primaryChart.birthTime
    : "";
  const savedBirthCity = primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "";
  const hasSavedBirthDetails = Boolean(savedBirthDate && savedBirthTime && savedBirthCity);
  const hasSavedCurrentCity = Boolean(profile.currentLocation?.trim());
  const [profileTab, setProfileTab] = useState<"transits" | "chart">("chart");
  const setupStepsLeft = chartFlowStepsLeft(profile);
  const summaryBirthDateDisplay = savedBirthDate ? formatProfileBirthDateLong(savedBirthDate) : "";
  const birthCityDisplay = savedBirthCity ? compactCityLabel(savedBirthCity) : "Birth city needed";
  const unknownBirthTime = savedBirthTime === "Time unknown";
  const calculatedBigThree = natalSky ? natalBigThreeFromSky(natalSky, unknownBirthTime) : null;
  const profileSun = profile.sun && profile.sun !== "Sun pending" ? profile.sun : "";
  const profileMoon = profile.moon && profile.moon !== "Moon pending" ? profile.moon : "";
  const profileRising = profile.rising && profile.rising !== "Rising pending" ? profile.rising : "";
  const displaySun = calculatedBigThree?.sun ?? profileSun;
  const displayMoon = calculatedBigThree?.moon ?? profileMoon;
  const displayRising = calculatedBigThree?.rising ?? (unknownBirthTime ? "Rising pending" : profileRising);
  const signaturesReady = Boolean(displaySun && displayMoon && (unknownBirthTime || displayRising));
  const safeSun = displaySun || "your Sun";
  const safeMoon = displayMoon || "your Moon";
  const safeRising = displayRising || "your rising sign";
  const natalPositions = natalSky?.positions ?? [];
  const natalSun = natalPositions.find((position) => position.planet === "Sun");
  const natalMoon = natalPositions.find((position) => position.planet === "Moon");
  const planetRows = natalPositions.filter((position) => !["Sun", "Moon", "True Node"].includes(position.planet));
  const natalAspectRows = (natalSky?.aspects ?? []).slice(0, 8);
  const aspectRows = transitItems.slice(0, 8);
  const elementalBalance = natalElementBalance(natalPositions);
  const leadingElements = elementalBalance
    .filter((item) => item.count === Math.max(...elementalBalance.map((element) => element.count)) && item.count > 0)
    .map((item) => item.element);
  const elementalSummary = leadingElements.length > 0 ? `${leadingElements.join(" & ")} led` : "Balance pending";
  const plutoSignature = natalPositions.find((position) => position.planet === "Pluto");
  const signatureTitle = plutoSignature?.house === 7 ? "Relationships remake you" : `${safeSun} shapes your center`;
  const signatureBody = plutoSignature?.house === 7
    ? "Pluto sits angular in your 7th house - partnership is where your deepest growth and power play out. Nothing about love stays surface-level."
    : `${natalSun ? natalPlacementTitle(natalSun) : `Sun in ${safeSun}`} sets the center of gravity, while ${safeMoon} and ${safeRising} shape how the chart meets the world.`;

  if (!hasSavedBirthDetails) {
    return (
      <section className="you-empty-state" aria-label="Create your chart">
        <h2>Your chart is waiting.</h2>
        <p>
          Add your birth details, and we'll map the exact sky you were born under - then show how today's planets are activating your chart.
        </p>
        <button type="button" className="you-empty-cta" onClick={onCreateChart}>
          <span className="you-empty-cta-icon" aria-hidden="true">
            <Sparkles size={22} />
          </span>
          <span className="you-empty-cta-copy">
            <strong>Create your chart</strong>
            <em>{setupStepsLeft} steps left</em>
          </span>
        </button>
        <div className="you-empty-features" aria-label="Chart unlocks">
          <span>☉ Placements</span>
          <span>△ Aspects</span>
          <span>↗ Daily transits</span>
        </div>
      </section>
    );
  }

  return (
    <section className="you-page" aria-label="You">
      <div className="you-profile-card" aria-label="Profile summary">
        <span className="you-profile-monogram" aria-hidden="true">
          {profileInitials(profile.name, profile.email)}
        </span>
        <div className="you-profile-copy">
          <h2>{profile.name}</h2>
          {signaturesReady ? (
            <div className="you-signature-row" aria-label="Big three">
              <span><span aria-hidden="true">☉</span>{displaySun}</span>
              <span><span aria-hidden="true">☽</span>{displayMoon}</span>
              <span><span aria-hidden="true">↑</span>{displayRising}</span>
            </div>
          ) : (
            <p className="you-profile-status">Calculating chart signatures...</p>
          )}
        </div>
      </div>

      <div className="app-tabs profile-tabs" id="you-subtabs" role="tablist" aria-label="Profile sections">
        <button
          type="button"
          role="tab"
          aria-selected={profileTab === "transits"}
          className={profileTab === "transits" ? "on active" : ""}
          onClick={() => setProfileTab("transits")}
        >
          Transits
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={profileTab === "chart"}
          className={profileTab === "chart" ? "on active" : ""}
          onClick={() => setProfileTab("chart")}
        >
          Natal Chart
        </button>
      </div>

      {profileTab === "chart" && (
        <div className="subpane" id="sub-chart">
          {natalSky && (
            <div className="wheel natal-wheel" id="wheel-natal" aria-label="Natal chart wheel">
              <SkyWheel
                positions={natalSky.positions}
                aspects={natalSky.aspects}
                ascendant={natalSky.ascendant}
                ascendantLongitude={natalSky.ascendantLongitude}
                midheavenLongitude={natalSky.midheavenLongitude}
                showHouses
              />
            </div>
          )}
          {!natalSky && (
            <section className="you-empty-card you-calculating-card" aria-label="Chart calculation">
              <span>Chart</span>
              <h3>Calculating your chart.</h3>
              <p>We have the birth details. Your chart wheel and signatures will appear as soon as the calculation finishes.</p>
            </section>
          )}

          <span className="eyebrow section-label">Your signatures</span>
          <section className="you-signatures-card" aria-label="Your signatures">
            <div className="you-signatures-main">
              <h3>{signatureTitle}</h3>
              <p>{signatureBody}</p>
            </div>
            <div className="elemental-balance" aria-label="Elemental balance">
              <div className="elemental-balance-head">
                <span className="eyebrow section-label">Elemental balance</span>
                <span>{elementalSummary}</span>
              </div>
              <div className="element-bars" aria-hidden="true">
                {elementalBalance.map((item) => (
                  <span
                    key={item.element}
                    className={`element-bar element-${item.element.toLowerCase()}`}
                    style={{ flexGrow: Math.max(item.count, 1) }}
                  />
                ))}
              </div>
              <div className="element-legend">
                {elementalBalance.map((item) => (
                  <span key={item.element} className={`element-legend-item element-${item.element.toLowerCase()}`}>
                    <i aria-hidden="true" />
                    {item.element} <b>{item.count}</b>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <span className="eyebrow section-label">Big Three</span>
          <div className="list you-list-card" aria-label="Big three">
            <div className="chart-row chart-row-static">
              <span className="crg" aria-hidden="true">↑</span>
              <span className="crb">
                <span className="crt">
                  {displayRising && displayRising !== "Rising pending" ? `${displayRising} Rising` : displayRising || "Rising calculating"}
                </span>
                <span className="crs">{natalSignatureDescriptions.Ascendant}</span>
              </span>
            </div>
            <div className="chart-row chart-row-static">
              <span className="crg" aria-hidden="true">☉</span>
              <span className="crb">
                <span className="crt">{natalSun ? natalPlacementTitle(natalSun) : displaySun ? `Sun in ${displaySun}` : "Sun calculating"}</span>
                <span className="crs">{natalSignatureDescriptions.Sun}</span>
              </span>
            </div>
            <div className="chart-row chart-row-static">
              <span className="crg" aria-hidden="true">☽</span>
              <span className="crb">
                <span className="crt">{natalMoon ? natalPlacementTitle(natalMoon) : displayMoon ? `Moon in ${displayMoon}` : "Moon calculating"}</span>
                <span className="crs">{natalSignatureDescriptions.Moon}</span>
              </span>
            </div>
          </div>

          {planetRows.length > 0 && (
            <>
              <span className="eyebrow section-label">Your planets</span>
              <div className="list you-list-card" aria-label="Your planets">
                {planetRows.map((position) => (
                  <div className="chart-row chart-row-static" key={position.planet}>
                    <span className="crg" aria-hidden="true">{position.glyph}</span>
                    <span className="crb">
                      <span className="crt">{natalPlacementTitle(position)}</span>
                      <span className="crs">{natalPlacementDescription(position.planet)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {natalAspectRows.length > 0 && (
            <>
              <span className="eyebrow section-label">Aspects in your chart</span>
              <div className="list you-aspects-list aspect-row-list natal-aspects-list" aria-label="Aspects in your chart">
                {natalAspectRows.map((aspect) => {
                  const content = approvedVoiceOrKnowledgeFallback(aspectContentId(aspect.from, aspect.type, aspect.to));
                  const rowSummary = content.summary ?? aspect.meaning;

                  return (
                    <div
                      className="aspect-row aspect-row-static"
                      key={`${aspect.from}-${aspect.type}-${aspect.to}`}
                    >
                      <AspectGlyphs from={aspect.from} aspect={aspect.type} to={aspect.to} />
                      <span className="aspect-row-copy">
                        <h3>{aspect.from} {aspect.type} {aspect.to}</h3>
                        <p>{rowSummary}</p>
                      </span>
                      <span className="aspect-row-meta" aria-label={`${wholeDegreeOrb(aspect.orb)} orb`}>
                        <span className="aspect-row-dot" aria-hidden="true" />
                        <span>{wholeDegreeOrb(aspect.orb)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {profileTab === "transits" && (
        <div className="subpane" id="sub-transits">
          <span className="eyebrow section-label">Today’s aspects to your chart</span>
          {!hasSavedCurrentCity && (
            <section className="you-empty-card" aria-label="Current city needed">
              <span>Daily transits</span>
              <h3>Add your current city.</h3>
              <p>We need your current city to localize today’s sky against your chart.</p>
              <button type="button" onClick={onCreateChart}>Add current city →</button>
            </section>
          )}
          {hasSavedCurrentCity && aspectRows.length > 0 && transitsDrawn && (
            <div className="list you-aspects-list aspect-row-list" aria-label="Today’s aspects to your chart">
              {aspectRows.map((transit) => {
                const content = approvedVoiceOrKnowledgeFallback(aspectContentId(transit.transitPlanet, transit.aspect, transit.natalPoint));
                const rowSummary = content.summary ?? transit.note;

                return (
                  <button
                    type="button"
                    className="aspect-row aspect-row-button"
                    key={transit.id}
                    onClick={() => setSelectedTransitId(transit.id)}
                  >
                    <AspectGlyphs from={transit.transitPlanet} aspect={transit.aspect} to={transit.natalPoint} />
                    <span className="aspect-row-copy">
                      <h3>{transit.transitPlanet} {transit.aspect} {transit.natalPoint}</h3>
                      <p>{rowSummary}</p>
                    </span>
                    <span className="aspect-row-meta" aria-label={`${transit.orb} orb`}>
                      <span className="aspect-row-dot" aria-hidden="true" />
                      <span>{transit.orb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {hasSavedCurrentCity && (!transitsDrawn || aspectRows.length === 0) && (
            <section className="you-empty-card" aria-label="Transit setup">
              <span>Daily transits</span>
              <h3>Your transit view is ready.</h3>
              <p>Open Create Chart any time to update your birth chart or current city.</p>
              <button type="button" onClick={onCreateChart}>Edit details →</button>
            </section>
          )}
        </div>
      )}
    </section>
  );
}

function ManualChartsPanel({
  profile,
  currentSky,
  profileNatalSky,
  profileTransits
}: {
  profile: UserProfile;
  currentSky: SkySnapshot;
  profileNatalSky: SkySnapshot | null;
  profileTransits: TransitItem[];
}) {
  const [charts, setCharts] = useState<ManualChart[]>([]);
  const [form, setForm] = useState<ManualChartForm>(defaultManualChartForm);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [selectedChartId, setSelectedChartId] = useState<string | null>(null);
  const [friendProfileTab, setFriendProfileTab] = useState<FriendProfileTab>("updates");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "deleting">("loading");
  const [message, setMessage] = useState("");
  const editingChart = charts.find((chart) => chart.id === editingChartId) ?? null;
  const selectedChart = charts.find((chart) => chart.id === selectedChartId) ?? charts[0] ?? null;
  const selectedFriendTransits = selectedChart ? rankedFriendTransits(currentSky, selectedChart) : [];
  const selectedFriendTopTransit = selectedFriendTransits[0];
  const selectedFriendBigThree = selectedChart ? manualChartBigThree(selectedChart) : null;
  const selectedFriendTiming = selectedChart ? friendTimingContext(selectedChart, currentSky) : null;
  const selectedFriendHouseActivations = selectedChart ? currentSkyHouseActivations(currentSky, selectedChart).slice(0, 4) : [];
  const selectedFriendCompatibility = selectedChart ? compatibilityHighlights(profileNatalSky, selectedChart) : [];
  const selectedRelationshipWeather = selectedChart ? relationshipWeather(profileTransits, selectedFriendTransits, selectedChart) : [];
  const circleCards = useMemo(() => circleFeedPreviewCards(currentSky, charts), [currentSky, charts]);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    listManualCharts(profile.id)
      .then((nextCharts) => {
        if (!cancelled) {
          setCharts(nextCharts);
          setSelectedChartId((currentId) => (
            currentId && nextCharts.some((chart) => chart.id === currentId)
              ? currentId
              : nextCharts[0]?.id ?? null
          ));
          setMessage("");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Could not load manual charts.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStatus("idle");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  function resetForm(nextMessage = "") {
    setForm(defaultManualChartForm);
    setEditingChartId(null);
    setMessage(nextMessage);
  }

  function editChart(chart: ManualChart) {
    setEditingChartId(chart.id);
    setForm(manualChartFormFromChart(chart));
    setMessage("");
  }

  function updateField<Key extends keyof ManualChartForm>(key: Key, value: ManualChartForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  async function saveManualChart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const displayName = form.displayName.trim();
    const birthDate = form.birthDate;
    const birthPlace = form.birthPlace.trim();
    const birthLocation = birthPlace
      ? form.birthLocation?.label === birthPlace
        ? withTimeZone(form.birthLocation)
        : locationFromLabel(birthPlace)
      : null;

    if (!displayName || !birthDate || !birthPlace || !birthLocation) {
      setMessage("Add a name, birth date, and birth place.");
      return;
    }

    if (!form.birthTimeUnknown && !form.birthTime) {
      setMessage("Add a birth time, or mark it unknown.");
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const birthTimeForChart = form.birthTimeUnknown
        ? "12:00 PM"
        : twentyFourHourTimeToDisplay(form.birthTime);
      const natalChart = await getAstrodienstSky(
        birthLocation,
        zonedDateTimeToUtc(birthDate, birthTimeForChart, birthLocation.timeZone)
      );
      const [firstName = "", ...lastNameParts] = displayName.split(/\s+/);
      const input: ManualChartInput = {
        displayName,
        firstName,
        lastName: lastNameParts.join(" ") || null,
        relationshipType: form.relationshipType || "friend",
        birthDate,
        birthTime: form.birthTimeUnknown ? null : form.birthTime,
        birthTimeUnknown: form.birthTimeUnknown,
        birthPlace: birthLocation.label,
        birthLocation,
        natalChart,
        notes: form.notes.trim() || null
      };
      const savedChart = editingChartId
        ? await updateManualChart(profile.id, editingChartId, input)
        : await createManualChart(profile.id, input);

      setCharts((currentCharts) => {
        const nextCharts = editingChartId
          ? currentCharts.map((chart) => chart.id === savedChart.id ? savedChart : chart)
          : [...currentCharts, savedChart];

        return nextCharts.sort((first, second) => first.displayName.localeCompare(second.displayName));
      });
      setSelectedChartId(savedChart.id);
      resetForm(editingChartId ? "Manual chart updated." : "Manual chart created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save manual chart.");
    } finally {
      setStatus("idle");
    }
  }

  async function removeChart(chart: ManualChart) {
    setStatus("deleting");
    setMessage("");

    try {
      await deleteManualChart(profile.id, chart.id);
      setCharts((currentCharts) => currentCharts.filter((candidate) => candidate.id !== chart.id));
      setSelectedChartId((currentId) => currentId === chart.id ? null : currentId);
      if (editingChartId === chart.id) {
        resetForm();
      }
      setMessage("Manual chart deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete manual chart.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="friends-page manual-charts-pane" aria-label="Friends">
      <div className="friends-page-heading">
        <h2>friends.</h2>
      </div>
      <span className="eyebrow section-label">Circle feed logic</span>
      <section className="friends-feed-preview" aria-label="Circle feed preview">
        <div className="friends-feed-preview-heading">
          <span>Circle Feed</span>
          <strong>{charts.length} saved {charts.length === 1 ? "chart" : "charts"}</strong>
        </div>
        <p className="friends-feed-preview-copy">
          Same sky, different chart, different room. This feed ranks friend updates, circle repetition, and relationship weather from the charts saved below.
        </p>
        <div className="friends-circle-strip" aria-label="Circle activations">
          {circleCards.map((card) => (
            <article className="friends-logic-card" key={card.title}>
              <span>{card.label}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="manual-chart-workspace" aria-label="Manual natal chart CRUD">
        <form className="manual-chart-form" onSubmit={saveManualChart}>
          <div className="manual-chart-form-heading">
            <div>
              <h3>{editingChart ? "Edit chart" : "Add a chart"}</h3>
              <p>{editingChart ? editingChart.displayName : "Create a natal chart from birth details."}</p>
            </div>
            {editingChart && (
              <button type="button" onClick={() => resetForm()}>
                Cancel
              </button>
            )}
          </div>

          <label className="signup-field">
            <span>Name</span>
            <div>
              <input
                value={form.displayName}
                onChange={(event) => updateField("displayName", event.target.value)}
                placeholder="Their name"
              />
            </div>
          </label>

          <label className="signup-field">
            <span>Relationship</span>
            <div>
              <select
                value={form.relationshipType}
                onChange={(event) => updateField("relationshipType", event.target.value)}
                aria-label="Relationship type"
              >
                <option value="friend">Friend</option>
                <option value="family">Family</option>
                <option value="partner">Partner</option>
                <option value="work">Work</option>
                <option value="event">Event</option>
                <option value="other">Other</option>
              </select>
            </div>
          </label>

          <div className="manual-chart-grid">
            <label className="signup-field">
              <span>Birth date</span>
              <div>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => updateField("birthDate", event.target.value)}
                />
              </div>
            </label>

            <label className="signup-field">
              <span>Birth time</span>
              <div>
                <input
                  type="time"
                  value={form.birthTime}
                  disabled={form.birthTimeUnknown}
                  onChange={(event) => updateField("birthTime", event.target.value)}
                />
              </div>
            </label>
          </div>

          <label className="unknown-time manual-chart-unknown-time">
            <input
              type="checkbox"
              checked={form.birthTimeUnknown}
              onChange={(event) => updateField("birthTimeUnknown", event.target.checked)}
            />
            <span>I don't know their birth time.</span>
          </label>

          <CitySearchField
            label="Birth place"
            value={form.birthPlace}
            onChange={(value) => {
              setForm({ ...form, birthPlace: value, birthLocation: null });
            }}
            onSelect={(suggestion) => {
              setForm({ ...form, birthPlace: suggestion.label, birthLocation: suggestion });
            }}
            placeholder="Manhattan, NY"
            className="signup-city-search manual-chart-city-search"
          />

          <label className="signup-field">
            <span>Notes</span>
            <div>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Optional context"
                rows={3}
              />
            </div>
          </label>

          {message && <p className="manual-chart-message">{message}</p>}

          <button className="manual-chart-save" type="submit" disabled={status === "saving" || status === "deleting"}>
            <Plus size={18} aria-hidden="true" />
            {status === "saving" ? "Saving..." : editingChart ? "Save chart" : "Add chart"}
          </button>
        </form>

        <section className="manual-chart-list" aria-label="Saved manual charts">
          <div className="manual-chart-list-heading">
            <span>Saved charts</span>
            <strong>{charts.length}</strong>
          </div>
          {status === "loading" && (
            <section className="you-empty-card manual-chart-empty" aria-label="Loading charts">
              <span>Charts</span>
              <h3>Loading manual charts.</h3>
              <p>Saved friends and charts will appear here.</p>
            </section>
          )}
          {status !== "loading" && charts.length === 0 && (
            <section className="you-empty-card manual-chart-empty" aria-label="No manual charts">
              <span>Charts</span>
              <h3>No manual charts yet.</h3>
              <p>Add someone's birth details to compare transits, chart signatures, and future compatibility.</p>
            </section>
          )}
          {charts.length > 0 && (
            <div className="list you-list-card manual-chart-cards" aria-label="Manual chart list">
              {charts.map((chart) => {
                const bigThree = manualChartBigThree(chart);

                return (
                  <div className="manual-chart-row chart-row" key={chart.id}>
                    <button
                      type="button"
                      className={`manual-chart-select ${selectedChart?.id === chart.id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedChartId(chart.id);
                        setFriendProfileTab("updates");
                      }}
                      aria-label={`Open ${chart.displayName}`}
                    >
                      <span className="manual-chart-avatar" aria-hidden="true">
                      {profileInitials(chart.displayName, chart.displayName)}
                      </span>
                      <span className="crb">
                        <span className="crt">{chart.displayName}</span>
                        <span className="crs">{manualChartSubtitle(chart)}</span>
                        <span className="manual-chart-signatures">
                          <span>☉ {bigThree.sun}</span>
                          <span>☽ {bigThree.moon}</span>
                          <span>↑ {bigThree.rising}</span>
                        </span>
                      </span>
                    </button>
                    <span className="manual-chart-actions">
                      <button type="button" onClick={() => editChart(chart)}>
                        <Pencil size={17} aria-hidden="true" />
                        <span>Edit</span>
                      </button>
                      <button type="button" className="manual-chart-delete" onClick={() => removeChart(chart)}>
                        <Trash2 size={17} aria-hidden="true" />
                        <span>Delete</span>
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
      {selectedChart && (
        <section className="friend-profile-panel" aria-label={`${selectedChart.displayName} friend profile`}>
          <div className="friend-profile-header">
            <span className="manual-chart-avatar" aria-hidden="true">
              {profileInitials(selectedChart.displayName, selectedChart.displayName)}
            </span>
            <div>
              <span className="eyebrow section-label">{selectedChart.relationshipType || "friend"}</span>
              <h3>{selectedChart.displayName}</h3>
              {selectedFriendBigThree && (
                <div className="you-signature-row" aria-label={`${selectedChart.displayName} big three`}>
                  <span><span aria-hidden="true">☉</span>{selectedFriendBigThree.sun}</span>
                  <span><span aria-hidden="true">☽</span>{selectedFriendBigThree.moon}</span>
                  <span><span aria-hidden="true">↑</span>{selectedFriendBigThree.rising}</span>
                </div>
              )}
            </div>
          </div>

          <div className="app-tabs profile-tabs friend-tabs" role="tablist" aria-label="Friend profile sections">
            {([
              ["compatibility", "Compatibility"],
              ["updates", "Updates"],
              ["between", "Between Us"],
              ["chart", "Chart"],
              ["settings", "Settings"]
            ] as Array<[FriendProfileTab, string]>).map(([tab, label]) => (
              <button
                type="button"
                role="tab"
                aria-selected={friendProfileTab === tab}
                className={friendProfileTab === tab ? "on active" : ""}
                key={tab}
                onClick={() => setFriendProfileTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>

          {friendProfileTab === "compatibility" && (
            <div className="friend-tab-pane" aria-label="Compatibility">
              {selectedFriendCompatibility.map((item) => (
                <article className="friends-logic-card" key={item.title}>
                  <span>Static pattern</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          )}

          {friendProfileTab === "updates" && (
            <div className="friend-tab-pane" aria-label="Updates">
              <article className="friends-logic-card friends-primary-update">
                <span>Top update</span>
                <h3>{selectedFriendTopTransit ? `${selectedFriendTopTransit.transitPlanet} ${selectedFriendTopTransit.aspect} ${selectedFriendTopTransit.natalPoint}` : "No exact hits yet"}</h3>
                <p>{friendUpdateSummary(selectedChart, selectedFriendTopTransit)}</p>
              </article>
              {selectedFriendTiming && (
                <article className="friends-logic-card friend-timing-card">
                  <span>Timing layer</span>
                  <h3>{selectedFriendTiming.profectedHouse ? `${ordinalHouse(selectedFriendTiming.profectedHouse)} house year` : "Annual timing pending"}</h3>
                  <p>{timingSummary(selectedChart, selectedFriendTiming)}</p>
                </article>
              )}
              {selectedFriendHouseActivations.length > 0 && (
                <div className="friend-house-activation-grid" aria-label={`${selectedChart.displayName} house activations`}>
                  {selectedFriendHouseActivations.map((activation) => (
                    <article className="friends-mini-card" key={`${activation.planet}-${activation.house}`}>
                      <span>{activation.planet}</span>
                      <strong>{ordinalHouse(activation.house)} house</strong>
                      <em>{houseLifeAreas[activation.house]}</em>
                    </article>
                  ))}
                </div>
              )}
              <div className="list you-aspects-list aspect-row-list friend-transit-list" aria-label={`${selectedChart.displayName} active transits`}>
                {selectedFriendTransits.slice(0, 6).map((transit) => (
                  <div className="aspect-row aspect-row-static" key={transit.id}>
                    <AspectGlyphs from={transit.transitPlanet} aspect={transit.aspect} to={transit.natalPoint} />
                    <span className="aspect-row-copy">
                      <h3>{transit.transitPlanet} {transit.aspect} {transit.natalPoint}</h3>
                      <p>{transitLifeArea(transit, selectedChart)} · {transit.note.replace("your natal", `${selectedChart.displayName}'s natal`)}</p>
                    </span>
                    <span className="aspect-row-meta" aria-label={`${transit.orb} orb`}>
                      <span className="aspect-row-dot" aria-hidden="true" />
                      <span>{transit.orb}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {friendProfileTab === "between" && (
            <div className="friend-tab-pane" aria-label="Between us">
              {selectedRelationshipWeather.length > 0 ? selectedRelationshipWeather.map((item) => (
                <article className="friends-logic-card" key={item.title + item.body}>
                  <span>Relationship weather</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              )) : (
                <article className="friends-logic-card">
                  <span>Relationship weather</span>
                  <h3>Dynamic timing pending.</h3>
                  <p>Once both charts have active hits, this space compares what today is doing to you, to them, and between you.</p>
                </article>
              )}
            </div>
          )}

          {friendProfileTab === "chart" && (
            <div className="friend-tab-pane" aria-label="Friend chart">
              {selectedChart.natalChart ? (
                <>
                  <div className="wheel natal-wheel friend-wheel" aria-label={`${selectedChart.displayName} natal chart wheel`}>
                    <SkyWheel
                      positions={selectedChart.natalChart.positions}
                      aspects={selectedChart.natalChart.aspects}
                      ascendant={selectedChart.natalChart.ascendant}
                      ascendantLongitude={selectedChart.natalChart.ascendantLongitude}
                      midheavenLongitude={selectedChart.natalChart.midheavenLongitude}
                      showHouses
                    />
                  </div>
                  <div className="list you-list-card friend-chart-list" aria-label={`${selectedChart.displayName} chart placements`}>
                    {selectedChart.natalChart.positions.slice(0, 8).map((position) => (
                      <div className="chart-row chart-row-static" key={position.planet}>
                        <span className="crg" aria-hidden="true">{position.glyph}</span>
                        <span className="crb">
                          <span className="crt">{natalPlacementTitle(position)}</span>
                          <span className="crs">{natalPlacementDescription(position.planet)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <article className="friends-logic-card">
                  <span>Chart</span>
                  <h3>Chart calculation pending.</h3>
                  <p>Edit and save this friend again to calculate their natal wheel from birth details.</p>
                </article>
              )}
            </div>
          )}

          {friendProfileTab === "settings" && (
            <div className="friend-tab-pane" aria-label="Friend settings">
              <article className="friends-logic-card">
                <span>Privacy</span>
                <h3>Private circle chart</h3>
                <p>This chart is saved in your private circle. Raw chart data stays inside this profile unless you intentionally share an insight.</p>
              </article>
              {selectedChart.notes && (
                <article className="friends-logic-card">
                  <span>Notes</span>
                  <h3>Context</h3>
                  <p>{selectedChart.notes}</p>
                </article>
              )}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
