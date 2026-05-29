import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { defaultLocation, getAstrodienstSky, getCurrentSky } from "./services/ephemeris";
import {
  getAuthAccount,
  isAuthConfigured,
  onAuthAccountChange,
  signInWithEmail,
  signInWithProvider,
  signOutAuth,
  signUpWithEmail
} from "./services/auth";
import type { AuthAccount } from "./services/auth";
import { hasMapboxToken, reverseGeocodeCity, searchCities } from "./services/mapbox";
import { getInitialAccountMode } from "./services/session";
import { browserTimeZone, timeZoneForLocation, withTimeZone, zonedDateTimeToUtc } from "./services/timezones";
import type { AccountMode, LocationInput, PlanetPosition, SkySnapshot } from "./types";

type PlacementMode = "paragraph" | "table";
type PortalMode = AccountMode | "profile" | "settings";
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

const selectedLocationStorageKey = "tldrastro:selectedLocation";
const selectedThemeStorageKey = "tldrastro:theme";
const userProfileStorageKey = "tldrastro:userProfile";
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

function formatMoonEventDate(date: Date, timeZone?: string) {
  return date.toLocaleDateString(undefined, {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatMoonEventTime(date: Date, timeZone?: string) {
  return date.toLocaleTimeString(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });
}

function formatMoonEventLine(event: ReturnType<typeof nextMoonEvent>, timeZone?: string) {
  if (event.days <= 3) {
    return `${event.name} in ${event.sign} in ${formatMoonCountdown(event.days)}, ${formatMoonEventDate(event.occursAt, timeZone)} at ${formatMoonEventTime(event.occursAt, timeZone)}.`;
  }

  return `${event.name} in ${formatMoonCountdown(event.days)}`;
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
  const [, monthValue, dayValue] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? [];
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

export function App() {
  const initialLocationState = useMemo(getInitialLocation, []);
  const [theme, setTheme] = useState<UiTheme>(getInitialTheme);
  const [skyDate, setSkyDate] = useState(dateInputValue);
  const [mode, setMode] = useState<PortalMode>(getInitialAccountMode);
  const [location, setLocation] = useState<LocationInput>(initialLocationState.location);
  const [manualLocation, setManualLocation] = useState(initialLocationState.location.label);
  const [hasLocationPreference, setHasLocationPreference] = useState(initialLocationState.hasSavedLocation);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [citySearchStatus, setCitySearchStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [transitForm, setTransitForm] = useState<TransitForm>(createBlankTransitForm);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getInitialUserProfile);
  const [accountIntent, setAccountIntent] = useState<AuthMode>("create");
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [transitsDrawn, setTransitsDrawn] = useState(false);
  const [profileTransits, setProfileTransits] = useState<TransitItem[]>([]);
  const [selectedTransitId, setSelectedTransitId] = useState(sampleTransits[0].id);
  const [skyRefreshKey, setSkyRefreshKey] = useState(() => Date.now());
  const [sky, setSky] = useState<SkySnapshot>(() => getCurrentSky(initialLocationState.location, dateFromInput(dateInputValue())));
  const activeTransits = profileTransits.length > 0 ? profileTransits : sampleTransits;
  const selectedTransit = activeTransits.find((transit) => transit.id === selectedTransitId) ?? activeTransits[0] ?? sampleTransits[0];
  const isSignupMode = mode === "profile" && !userProfile;
  const isProfileMode = mode === "profile" || mode === "settings";
  useEffect(() => {
    let cancelled = false;
    const selectedDate = dateFromInput(skyDate);

    setSky(getCurrentSky(location, selectedDate));
    getAstrodienstSky(location, selectedDate)
      .then((nextSky) => {
        if (!cancelled) {
          setSky(nextSky);
        }
      })
      .catch((error) => {
        console.warn("Swiss Ephemeris sky calculation failed; using fallback sky.", error);
        if (!cancelled) {
          setSky(getCurrentSky(location, selectedDate));
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
    let cancelled = false;

    getAuthAccount()
      .then((account) => {
        if (cancelled || !account) {
          return;
        }

        const pendingForm = readPendingSignupForm();

        setUserProfile((currentProfile) => currentProfile ?? createUserProfile(pendingForm, "email", account));
        clearPendingSignupForm();
        setMode("profile");
      })
      .catch(() => {
        return;
      });

    const unsubscribe = onAuthAccountChange((account) => {
      if (!account) {
        return;
      }

      const pendingForm = readPendingSignupForm();

      setUserProfile((currentProfile) => currentProfile ?? createUserProfile(pendingForm, "email", account));
      clearPendingSignupForm();
      setMode("profile");
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

  function openCreateChartModal({ prefill = false }: { prefill?: boolean } = {}) {
    if (!prefill) {
      setTransitForm(createBlankTransitForm());
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

  async function drawTransitChart() {
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
      const nextChart: UserChart = {
        id: primaryChart?.id ?? `chart-${Date.now()}`,
        name: chartNameFromProfile(nextProfileName),
        type: "Birth chart",
        birthDate: nextBirthDate || "Birth date needed",
        birthTime: nextBirthTime,
        birthCity: birthCity || "Birth city needed",
        birthLocation
      };

      setUserProfile({
        ...userProfile,
        name: nextProfileName,
        sun: nextBirthDate ? zodiacFromBirthDate(nextBirthDate) : userProfile.sun,
        rising: transitForm.unknownBirthTime || nextBirthTime === "Birth time needed" ? "Rising pending" : userProfile.rising,
        currentLocation: currentCity || userProfile.currentLocation,
        currentLocationData: resolvedCurrentLocationData ?? userProfile.currentLocationData,
        settings: normalizeChartSettings(userProfile.settings),
        charts: [nextChart, ...userProfile.charts.slice(1)]
      });

      if (nextBirthDate && birthLocation) {
        const birthDateTime = zonedDateTimeToUtc(
          nextBirthDate,
          transitForm.unknownBirthTime ? "12:00 PM" : nextBirthTime,
          birthLocation.timeZone
        );
        const natalSky = await getAstrodienstSky(birthLocation, birthDateTime);
        const nextTransits = buildNatalTransitItems(sky.positions, natalSky.positions);

        setProfileTransits(nextTransits);
        setSelectedTransitId(nextTransits[0]?.id ?? sampleTransits[0].id);
      }
    }

    setTransitsDrawn(true);
    setChartModalOpen(false);
    setMode(userProfile ? "profile" : "guest");
  }

  return (
    <main className={`app-shell theme-${theme}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Moon size={28} />
          </div>
          <div className="brand-wordmark" aria-label="tldrastro">
            <span>tldr</span>
            <em>astro</em>
          </div>
        </div>

        <nav className="site-nav" aria-label="Primary navigation">
          <button className={mode === "guest" || mode === "member" ? "active" : ""} onClick={() => setMode(userProfile ? "member" : "guest")}>
            Today
          </button>
          {userProfile ? (
            <>
              <button
                className={`account-nav ${mode === "profile" ? "active" : ""}`}
                type="button"
                onClick={() => setMode("profile")}
              >
                <ProfileAvatar profile={userProfile} />
                <span>{profileFirstName(userProfile.name, userProfile.email)}</span>
              </button>
              <button
                className={mode === "settings" ? "active" : ""}
                type="button"
                onClick={() => setMode("settings")}
              >
                Settings
              </button>
              <button className="chart-cta" type="button" onClick={() => openCreateChartModal()}>
                Create chart →
              </button>
            </>
          ) : (
            <>
              <button
                className={`account-nav ${mode === "profile" && accountIntent === "login" ? "active" : ""}`}
                type="button"
                onClick={() => {
                  setAccountIntent("login");
                  setMode("profile");
                }}
              >
                Sign in
              </button>
              <button
                className={`chart-cta ${mode === "profile" && accountIntent === "create" ? "active-outline" : ""}`}
                type="button"
                onClick={() => {
                  setAccountIntent("create");
                  setMode("profile");
                }}
              >
                Create account
              </button>
            </>
          )}
        </nav>

        <button
          type="button"
          className="theme-toggle"
          aria-pressed={theme === "dark"}
          aria-label="Toggle theme"
          title="Toggle theme"
          onClick={() => setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? <span aria-hidden="true">☾</span> : <Sun size={20} aria-hidden="true" />}
        </button>
      </header>

      <section className={isSignupMode ? "portal-grid signup-layout" : isProfileMode ? "portal-grid profile-layout" : "portal-grid"}>
        {!isSignupMode && !isProfileMode && (
          <section className="sky-panel" aria-label="Current sky">
          <div className="panel-heading">
            <div>
              <button
                className="date-link"
                type="button"
                aria-expanded={datePickerOpen}
                aria-controls="sky-date-picker"
                onClick={() => setDatePickerOpen((isOpen) => !isOpen)}
              >
                <CalendarDays size={16} aria-hidden="true" />
                <span>{formatSkyDate(skyDate)}</span>
              </button>
              <h1>
                Current sky over{" "}
                <button
                  className="city-link"
                  type="button"
                  aria-expanded={cityPickerOpen}
                  aria-controls="city-picker"
                  onClick={() => setCityPickerOpen((isOpen) => !isOpen)}
                >
                  {sky.location.label}
                </button>
              </h1>
            </div>
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
              className="city-picker"
              id="city-picker"
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

          <SkyWheel positions={sky.positions} aspects={sky.aspects} />

          <SkyCards sky={sky} />
          </section>
        )}

        <section className="detail-panel" aria-label="Portal details">
          {mode === "guest" && <TodayView positions={sky.positions} aspects={sky.aspects} />}
          {mode === "member" && (
            <TodayView positions={sky.positions} aspects={sky.aspects} />
          )}
          {mode === "profile" && (
            userProfile ? (
              <ProfileView
                profile={userProfile}
                onUpdateProfile={setUserProfile}
                transitForm={transitForm}
                transitItems={activeTransits}
                transitsDrawn={transitsDrawn}
                selectedTransit={selectedTransit}
                selectedTransitId={selectedTransitId}
                setSelectedTransitId={setSelectedTransitId}
                onCreateChart={() => openCreateChartModal()}
                onSettings={() => setMode("settings")}
              />
            ) : (
              <SignupView
                initialMode={accountIntent}
                onCreateProfile={(nextProfile) => {
                  setUserProfile(nextProfile);
                  setMode("profile");
                }}
              />
            )
          )}
          {mode === "settings" && userProfile && (
            <SettingsView
              profile={userProfile}
              onUpdateProfile={setUserProfile}
              onSignOut={async () => {
                await signOutAuth();
                setUserProfile(null);
                setMode("profile");
              }}
            />
          )}
        </section>
      </section>

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
            <TransitSetup
              form={transitForm}
              setForm={setTransitForm}
              onDraw={drawTransitChart}
            />
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

function formatDegree(degree: number) {
  return degree.toFixed(2);
}

function formatPlacementPosition(position: PlanetPosition) {
  return `${position.sign}${position.motion === "retrograde" ? " ℞" : ""} ${formatDegree(position.degree)}°`;
}

function SkyWheel({ positions, aspects }: { positions: PlanetPosition[]; aspects: SkySnapshot["aspects"] }) {
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
  const labelAngles = signs.map((_, index) => 240 + index * 30);
  const center = 300;
  const radius = {
    outer: 284,
    signInner: 226,
    planet: 190,
    aspect: 150,
    inner: 44
  };

  function point(angle: number, distance: number) {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + Math.cos(rad) * distance,
      y: center + Math.sin(rad) * distance
    };
  }

  function planetAngle(position: PlanetPosition) {
    const signIndex = signs.indexOf(position.sign);
    const zodiacDegrees = signIndex * 30 + position.degree;
    return 225 + zodiacDegrees;
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

  return (
    <svg className="sky-wheel" viewBox="0 0 600 600" role="img" aria-label="Planet positions">
      <title>Current zodiac wheel</title>
      <g className="wheel-rings">
        <circle cx={center} cy={center} r={radius.outer} />
        <circle cx={center} cy={center} r={radius.signInner} />
        <circle cx={center} cy={center} r={radius.aspect} className="faint" />
        <circle cx={center} cy={center} r={radius.inner} />
      </g>

      <g className="wheel-sectors">
        {signs.map((sign, index) => {
          const a = 225 + index * 30;
          const outer = point(a, radius.outer);
          const inner = point(a, radius.inner);
          return <line key={sign} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
        })}
      </g>

      <g className="sign-labels">
        {signs.map((sign, index) => {
          const p = point(labelAngles[index], 254);
          return (
            <g key={sign} transform={`rotate(${labelAngles[index] + 90} ${p.x} ${p.y})`}>
              <text className="sign-label-halo" x={p.x} y={p.y}>
                {sign}
              </text>
              <text x={p.x} y={p.y}>
                {sign}
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
              <title>{from.planet} {type} {to.planet}, {orb.toFixed(1)}° orb</title>
            </g>
          );
        })}
      </g>

      <g className="planet-labels">
        {positions.map((position) => {
          const marker = point(planetAngle(position), radius.planet);
          const tickOuter = point(planetAngle(position), radius.signInner - 4);
          const tickInner = point(planetAngle(position), radius.signInner - 18);
          const label = point(planetAngle(position), radius.planet - 14);

          return (
            <g key={position.planet}>
              <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} className="planet-tick" />
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

function SkyGlyph({ type }: { type: "sun" | "moon" | "phase" }) {
  return (
    <span className={`sky-card-glyph ${type}`} aria-hidden="true">
      {type === "sun" && <span />}
      {type === "moon" && "☾"}
      {type === "phase" && (
        <>
          <i />
          <i />
          <i />
        </>
      )}
    </span>
  );
}

function SkyCards({ sky }: { sky: SkySnapshot }) {
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const moonEvent = nextMoonEvent(sky);
  const skyTimeZone = sky.location.timeZone ?? browserTimeZone();

  return (
    <div className="sky-cards" aria-label="Sky highlights">
      <article className="sky-card">
        <span className="eyebrow">The Sun</span>
        <SkyGlyph type="sun" />
        <strong>{sun?.sign ?? "Current Sun"}</strong>
        <p className="sky-card-degree">{formatPlacementDegree(sun)}</p>
        <p>Stay curious, change your mind.</p>
      </article>

      <article className="sky-card">
        <span className="eyebrow">The Moon</span>
        <SkyGlyph type="moon" />
        <strong>{moon?.sign ?? "Current Moon"}</strong>
        <p className="sky-card-degree">{formatPlacementDegree(moon)}</p>
        <p>Feelings run deep. Let them tell the truth.</p>
      </article>

      <article className="sky-card">
        <span className="eyebrow">Moon Phase</span>
        <MoonPhaseArt phase={sky.moonPhase} />
        <strong>{sky.moonPhase}</strong>
        <p className="sky-card-degree">
          {formatMoonEventLine(moonEvent, skyTimeZone)}
        </p>
        <p>The lunar pull is moving toward its next turning point.</p>
      </article>
    </div>
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
  const [isActive, setIsActive] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const query = value.trim();

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
      onBlur={() => window.setTimeout(() => setIsActive(false), 160)}
      placeholder={placeholder}
    />
  );

  return (
    <div className={`field-line city-search-field ${className}`}>
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

function TodayView({ positions, aspects }: { positions: PlanetPosition[]; aspects: SkySnapshot["aspects"] }) {
  return (
    <>
      <PlacementView positions={positions} />
      <ActiveAspects aspects={aspects} />
    </>
  );
}

function PlacementView({ positions }: { positions: PlanetPosition[] }) {
  const [placementMode, setPlacementMode] = useState<PlacementMode>("paragraph");

  return (
    <>
      <div className="placements-heading">
        <p>Placements</p>
        <h2>Today, simple.</h2>
        <span>What is up there today, and what it actually means down here.</span>
      </div>

      <div className="placement-toggle" role="tablist" aria-label="Placement view">
        <button
          className={placementMode === "paragraph" ? "active" : ""}
          onClick={() => setPlacementMode("paragraph")}
          role="tab"
          aria-selected={placementMode === "paragraph"}
        >
          Paragraph
        </button>
        <button
          className={placementMode === "table" ? "active" : ""}
          onClick={() => setPlacementMode("table")}
          role="tab"
          aria-selected={placementMode === "table"}
        >
          Table
        </button>
      </div>

      {placementMode === "paragraph" ? (
        <PlacementParagraph positions={positions} />
      ) : (
        <PlacementTable positions={positions} />
      )}
    </>
  );
}

function ActiveAspects({ aspects }: { aspects: SkySnapshot["aspects"] }) {
  return (
    <section className="aspects-card" aria-label="Active aspects">
      <div className="aspects-heading">
        <span>Active aspects</span>
      </div>
      <div className="aspect-list">
        {aspects.map((aspect) => (
          <article key={`${aspect.from}-${aspect.to}`}>
            <div className="glyph aspect-symbol" aria-hidden="true">{aspectGlyph(aspect.type)}</div>
            <div className="aspect-copy">
              <span>{aspect.type}</span>
              <strong>{aspect.from} {aspect.type} {aspect.to}</strong>
              <p>{aspect.meaning}</p>
            </div>
            <div className="aspect-orb">{aspect.orb.toFixed(1)}°</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlacementParagraph({ positions }: { positions: PlanetPosition[] }) {
  return (
    <div className="placement-prose">
      {positions.map((position, index) => (
        <p key={position.planet}>
          {index === 0 ? "Today’s " : ""}
          <strong>{position.planet}</strong>
          {" at "}
          <span>{formatPlacementPosition(position).toUpperCase()}</span>
          {" "}
          {placementMeanings[position.planet]}
        </p>
      ))}
    </div>
  );
}

function PlacementTable({ positions }: { positions: PlanetPosition[] }) {
  return (
    <div className="placement-table-wrap">
      <table className="placement-table">
        <thead>
          <tr>
            <th>Planet</th>
            <th>Position</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position.planet} className={position.motion === "retrograde" ? "retrograde-row" : undefined}>
              <td>
                <span className="table-glyph">{position.glyph}</span>
                <strong>{position.planet}</strong>
              </td>
              <td className="position-cell">
                <span className="position-sign">{position.sign}</span>
                {" "}
                {position.motion === "retrograde" ? <span className="retrograde-badge" aria-label="Retrograde">℞</span> : null}
                {" "}
                <span className="position-degree">{formatDegree(position.degree)}°</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransitSetup({
  form,
  setForm,
  onDraw
}: {
  form: TransitForm;
  setForm: (form: TransitForm) => void;
  onDraw: () => void | Promise<void>;
}) {
  function updateField<Key extends keyof TransitForm>(key: Key, value: TransitForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateNumberField<Key extends keyof TransitForm>(key: Key, value: string, maxLength = 2) {
    updateField(key, value.replace(/\D/g, "").slice(0, maxLength) as TransitForm[Key]);
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onDraw();
  }

  return (
    <form className="transit-form signup-form chart-create-form" onSubmit={submitForm}>
      <div className="signup-heading">
        <p>Create Chart</p>
        <h3 id="chart-modal-title">Birth date. Birth time. Birth city. Current city.</h3>
        <span>We'll take it from there.</span>
      </div>

      <div className="signup-fields">
        <label className="signup-field">
          <span>Name</span>
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
          label="Place of birth"
          value={form.birthPlace}
          onChange={(value) => {
            setForm({ ...form, birthPlace: value, birthLocation: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, birthPlace: suggestion.label, birthLocation: suggestion });
          }}
          placeholder="Start typing the city where you were born."
          className="signup-city-search"
        />

        <CitySearchField
          label="Current city"
          value={form.currentLocation}
          onChange={(value) => {
            setForm({ ...form, currentLocation: value, currentLocationData: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, currentLocation: suggestion.label, currentLocationData: suggestion });
          }}
          placeholder="Start typing where you are now."
          className="signup-city-search"
          optional
          optionalLabel="(For Daily Transits)"
        />
      </div>

      <button className="signup-submit" type="submit">Create chart →</button>
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

function SignupView({ initialMode = "create", onCreateProfile }: { initialMode?: AuthMode; onCreateProfile: (profile: UserProfile) => void }) {
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
    <section className="signup-split" aria-label="Create account">
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
  onSignOut
}: {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
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
  const birthTimeParts = splitSignupBirthTime(birthTime);
  const birthDateDisplay = savedBirthDate ? formatProfileBirthDate(savedBirthDate) : "Not set";
  const birthTimeDisplay = savedBirthTime || "Not set";
  const birthCityDisplay = primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "Not set";
  const currentCityDisplay = profile.currentLocation || "Not set";

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

  function saveSettings() {
    const nextName = profileName.trim() || profile.name;
    const nextEmail = profileEmail.trim() || profile.email;
    const nextBirthDate = formatSignupBirthDate(birthDateParts);
    const nextBirthTime = unknownBirthTime ? "Time unknown" : birthTime || "Birth time needed";
    const chart: UserChart = {
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

    onUpdateProfile({
      ...profile,
      name: nextName,
      email: nextEmail,
      sun: nextBirthDate ? zodiacFromBirthDate(nextBirthDate) : profile.sun,
      rising: unknownBirthTime || nextBirthTime === "Birth time needed" ? "Rising pending" : profile.rising,
      currentLocation: currentCity.trim(),
      currentLocationData,
      settings: normalizeChartSettings(settings),
      charts: [chart, ...profile.charts.slice(1)]
    });
    setSettingsEditing(false);
  }

  function handleSettingsAction() {
    if (settingsEditing) {
      saveSettings();
      return;
    }

    resetSettingsDraft();
    setSettingsEditing(true);
  }

  return (
    <section className="settings-page" aria-label="Settings">
      <div className="settings-header">
        <div>
          <p>Settings</p>
          <h2>Manage your account</h2>
        </div>
        <button className="settings-save" type="button" onClick={handleSettingsAction}>
          {settingsEditing ? "Save changes" : "Edit info"}
        </button>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        {[
          ["account", "Account"],
          ["chart", "Chart"],
          ["preferences", "Preferences"]
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeSettingsTab === id}
            className={activeSettingsTab === id ? "active" : ""}
            onClick={() => setActiveSettingsTab(id as typeof activeSettingsTab)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="settings-panel">
        {activeSettingsTab === "account" && (
          <section className="settings-card" aria-label="Account profile">
            <div className="settings-profile-row">
              <ProfileAvatar profile={profile} size="large" />
              <div>
                <p>{profile.provider === "google" ? "Google account" : "Email account"}</p>
                <h3>{profile.name}</h3>
                <span>{profile.email}</span>
              </div>
            </div>

            {settingsEditing ? (
              <div className="settings-fields">
                <label className="signup-field">
                  <span>Name</span>
                  <div>
                    <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
                  </div>
                </label>
                <label className="signup-field">
                  <span>Email</span>
                  <div>
                    <input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} />
                  </div>
                </label>
              </div>
            ) : (
              <div className="settings-list" aria-label="Account details">
                <div className="settings-row">
                  <span>Name</span>
                  <strong>{profile.name}</strong>
                </div>
                <div className="settings-row">
                  <span>Email</span>
                  <strong>{profile.email}</strong>
                </div>
                <div className="settings-row">
                  <span>Sign in</span>
                  <strong>{profile.provider === "google" ? "Google" : "Email"}</strong>
                </div>
              </div>
            )}

            <div className="settings-actions">
              <button type="button" className="settings-secondary-action" onClick={onSignOut}>Sign out</button>
            </div>
          </section>
        )}

        {activeSettingsTab === "chart" && (
          <section className="settings-card" aria-label="Birth and transit information">
            <div className="settings-card-heading">
              <div>
                <span>Chart information</span>
                <p>Birth details create your natal chart. Current city powers daily transits.</p>
              </div>
            </div>

            {settingsEditing ? (
              <div className="settings-fields">
                <div className="signup-grid">
                  <label className="signup-field">
                    <span>Birth date</span>
                    <div className="signup-date-control">
                      <input aria-label="Birth month" inputMode="numeric" placeholder="MM" value={birthDateParts.month} onChange={(event) => updateBirthDate("month", event.target.value)} />
                      <span aria-hidden="true">/</span>
                      <input aria-label="Birth day" inputMode="numeric" placeholder="DD" value={birthDateParts.day} onChange={(event) => updateBirthDate("day", event.target.value)} />
                      <span aria-hidden="true">/</span>
                      <input aria-label="Birth year" inputMode="numeric" placeholder="YYYY" value={birthDateParts.year} onChange={(event) => updateBirthDate("year", event.target.value)} />
                    </div>
                  </label>

                  <label className="signup-field">
                    <span>Birth time</span>
                    <div className="signup-time-control">
                      <input aria-label="Birth hour" inputMode="numeric" placeholder="HH" value={birthTimeParts.hour} disabled={unknownBirthTime} onChange={(event) => updateBirthTime("hour", event.target.value)} />
                      <span className="time-separator" aria-hidden="true">:</span>
                      <input aria-label="Birth minute" inputMode="numeric" placeholder="MM" value={birthTimeParts.minute} disabled={unknownBirthTime} onChange={(event) => updateBirthTime("minute", event.target.value)} />
                      <div className="signup-meridiem" aria-label="AM or PM">
                        {(["AM", "PM"] as const).map((period) => (
                          <button key={period} type="button" className={birthTimeParts.meridiem === period ? "active" : ""} disabled={unknownBirthTime} aria-pressed={birthTimeParts.meridiem === period} onClick={() => updateBirthTime("meridiem", period)}>
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
                    checked={unknownBirthTime}
                    onChange={(event) => {
                      setUnknownBirthTime(event.target.checked);
                      setBirthTime(event.target.checked ? "12:00 PM" : birthTime);
                    }}
                  />
                  <span>I don't know my birth time.</span>
                </label>

                <CitySearchField
                  label="Birth city"
                  value={birthCity}
                  onChange={(value) => {
                    setBirthCity(value);
                    setBirthLocation(null);
                  }}
                  onSelect={(suggestion) => {
                    setBirthCity(suggestion.label);
                    setBirthLocation(suggestion);
                  }}
                  placeholder="Start typing the city where you were born."
                  className="signup-city-search settings-city-search"
                />

                <CitySearchField
                  label="Current city"
                  value={currentCity}
                  onChange={(value) => {
                    setCurrentCity(value);
                    setCurrentLocationData(null);
                  }}
                  onSelect={(suggestion) => {
                    setCurrentCity(suggestion.label);
                    setCurrentLocationData(suggestion);
                  }}
                  placeholder="Start typing where you are now."
                  className="signup-city-search settings-city-search"
                  optional
                  optionalLabel="(For Daily Transits)"
                />
              </div>
            ) : (
              <div className="settings-list" aria-label="Chart details">
                <div className="settings-row">
                  <span>Birth date</span>
                  <strong>{birthDateDisplay}</strong>
                </div>
                <div className="settings-row">
                  <span>Birth time</span>
                  <strong>{birthTimeDisplay}</strong>
                </div>
                <div className="settings-row">
                  <span>Birth city</span>
                  <strong>{birthCityDisplay}</strong>
                </div>
                <div className="settings-row">
                  <span>Current city</span>
                  <strong>{currentCityDisplay}</strong>
                </div>
              </div>
            )}

          </section>
        )}

        {activeSettingsTab === "preferences" && (
          <section className="settings-card" aria-label="Chart preferences">
            <div className="settings-card-heading">
              <div>
                <span>Chart settings</span>
              </div>
            </div>
            <div className="settings-list">
              <div className="settings-row">
                <span>House system</span>
                <strong>Whole House</strong>
              </div>
              <div className="settings-row">
                <span>Zodiac</span>
                <strong>Tropical</strong>
              </div>
              <div className="settings-row">
                <span>Aspect orbs</span>
                {settingsEditing ? (
                  <select value={settings.aspects} onChange={(event) => setSettings({ ...settings, aspects: event.target.value as ChartSettings["aspects"] })}>
                    <option>Standard</option>
                    <option>Tight</option>
                  </select>
                ) : (
                  <strong>{settings.aspects}</strong>
                )}
              </div>
            </div>
          </section>
        )}
        </div>
    </section>
  );
}

function ProfileView({
  profile,
  onUpdateProfile,
  transitForm,
  transitItems,
  transitsDrawn,
  selectedTransit,
  selectedTransitId,
  setSelectedTransitId,
  onCreateChart,
  onSettings
}: {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  transitForm: TransitForm;
  transitItems: TransitItem[];
  transitsDrawn: boolean;
  selectedTransit: TransitItem;
  selectedTransitId: string;
  setSelectedTransitId: (id: string) => void;
  onCreateChart: () => void;
  onSettings: () => void;
}) {
  const primaryChart = profile.charts[0];
  const savedBirthDate = primaryChart?.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(primaryChart.birthDate) ? primaryChart.birthDate : "";
  const savedBirthTime = primaryChart?.birthTime && primaryChart.birthTime !== "Time unknown" && primaryChart.birthTime !== "Birth time needed"
    ? primaryChart.birthTime
    : "";
  const hasSavedBirthDetails = Boolean(
    savedBirthDate &&
    savedBirthTime &&
    primaryChart?.birthCity &&
    primaryChart.birthCity !== "Birth city needed"
  );
  const hasSavedCurrentCity = Boolean(profile.currentLocation?.trim());
  const [profileEditorOpen, setProfileEditorOpen] = useState(!hasSavedBirthDetails || !hasSavedCurrentCity);
  const [profileName, setProfileName] = useState(profile.name);
  const [profileEmail, setProfileEmail] = useState(profile.email);
  const [birthCity, setBirthCity] = useState(primaryChart?.birthCity && primaryChart.birthCity !== "Birth city needed" ? primaryChart.birthCity : "");
  const [birthLocation, setBirthLocation] = useState<LocationInput | null>(primaryChart?.birthLocation ?? null);
  const [birthDateParts, setBirthDateParts] = useState<SignupDateParts>(() => splitSignupBirthDate(savedBirthDate));
  const [birthTime, setBirthTime] = useState(savedBirthTime);
  const [unknownBirthTime, setUnknownBirthTime] = useState(primaryChart?.birthTime === "Time unknown");
  const [currentCity, setCurrentCity] = useState(profile.currentLocation ?? "");
  const [currentLocationData, setCurrentLocationData] = useState<LocationInput | null>(profile.currentLocationData ?? null);
  const birthTimeParts = splitSignupBirthTime(birthTime);

  function updateProfileBirthDate(part: keyof SignupDateParts, value: string) {
    const maxLength = part === "year" ? 4 : 2;
    setBirthDateParts({
      ...birthDateParts,
      [part]: value.replace(/\D/g, "").slice(0, maxLength)
    });
  }

  function updateProfileBirthTime(part: keyof SignupTimeParts, value: string) {
    const nextParts = {
      ...birthTimeParts,
      [part]: part === "meridiem" ? value as SignupTimeParts["meridiem"] : value.replace(/\D/g, "").slice(0, 2)
    };

    setBirthTime(formatSignupBirthTime(nextParts));
  }

  function saveBirthDetails() {
    const nextBirthDate = formatSignupBirthDate(birthDateParts);
    const chart: UserChart = {
      id: primaryChart?.id ?? `chart-${Date.now()}`,
      name: primaryChart?.name ?? chartNameFromProfile(profile.name),
      type: "Birth chart",
      birthDate: nextBirthDate || "Birth date needed",
      birthTime: unknownBirthTime ? "Time unknown" : birthTime || "Birth time needed",
      birthCity: birthCity.trim() || "Birth city needed",
      birthLocation
    };

    onUpdateProfile({
      ...profile,
      name: profileName.trim() || profile.name,
      email: profileEmail.trim() || profile.email,
      sun: nextBirthDate ? zodiacFromBirthDate(nextBirthDate) : profile.sun,
      rising: unknownBirthTime || !birthTime ? "Rising pending" : profile.rising,
      charts: [chart, ...profile.charts.slice(1)]
    });
  }

  function saveCurrentLocation() {
    onUpdateProfile({
      ...profile,
      name: profileName.trim() || profile.name,
      email: profileEmail.trim() || profile.email,
      currentLocation: currentCity.trim(),
      currentLocationData
    });
  }

  function saveProfileInfo() {
    const nextName = profileName.trim() || profile.name;
    const nextEmail = profileEmail.trim() || profile.email;

    onUpdateProfile({
      ...profile,
      name: nextName,
      email: nextEmail,
      charts: profile.charts.map((chart, index) => (
        index === 0 && chart.name === chartNameFromProfile(profile.name)
          ? { ...chart, name: chartNameFromProfile(nextName) }
          : chart
      ))
    });
  }

  return (
    <>
      <div className="member-header profile-hero">
        <ProfileAvatar profile={profile} size="large" />
        <div className="profile-hero-copy">
          <p>{profile.provider === "google" ? "Google account" : "Email account"}</p>
          <h2>Hello, {profile.name}</h2>
          <span>{profile.email}</span>
        </div>
        <div className="profile-actions">
          <button className="edit-profile-button" type="button" onClick={onSettings}>
            Settings
          </button>
        </div>
      </div>

      {profileEditorOpen && (
      <section className="profile-setup" aria-label="Profile setup">
        <p className="profile-setup-copy">
          We’ve got your name and email. The last details we need are your <strong>birth date, exact birth time, and birth city</strong> for your natal chart, plus your <strong>current city</strong> so we can map today’s planetary transits and see how they interact with your chart.
        </p>

        <div className="profile-setup-grid">
          <section className="setup-card" aria-label="Profile information">
            <div className="setup-card-heading">
              <span>Profile information</span>
            </div>
            <h3>Your account details</h3>

            <label className="signup-field">
              <span>Name</span>
              <div>
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
              </div>
            </label>

            <label className="signup-field">
              <span>Email</span>
              <div>
                <input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} />
              </div>
            </label>

            <button className="setup-submit" type="button" onClick={saveProfileInfo}>Save profile →</button>
          </section>

          <section className="setup-card setup-card-dark" aria-label="Natal chart setup">
            <div className="setup-card-heading">
              <span>Natal chart</span>
            </div>
            <h3>Where and when were you born?</h3>
            <p>A snapshot of the sky the exact moment of your first breath.</p>

            <CitySearchField
              label="Birth city"
              value={birthCity}
              onChange={(value) => {
                setBirthCity(value);
                setBirthLocation(null);
              }}
              onSelect={(suggestion) => {
                setBirthCity(suggestion.label);
                setBirthLocation(suggestion);
              }}
              placeholder="Start typing the city where you were born."
              className="profile-city-search"
            />

            <div className="signup-grid">
              <label className="signup-field">
                <span>Birth date</span>
                <div className="signup-date-control">
                  <input aria-label="Birth month" inputMode="numeric" placeholder="MM" value={birthDateParts.month} onChange={(event) => updateProfileBirthDate("month", event.target.value)} />
                  <span aria-hidden="true">/</span>
                  <input aria-label="Birth day" inputMode="numeric" placeholder="DD" value={birthDateParts.day} onChange={(event) => updateProfileBirthDate("day", event.target.value)} />
                  <span aria-hidden="true">/</span>
                  <input aria-label="Birth year" inputMode="numeric" placeholder="YYYY" value={birthDateParts.year} onChange={(event) => updateProfileBirthDate("year", event.target.value)} />
                </div>
              </label>

              <label className="signup-field">
                <span>Birth time</span>
                <div className="signup-time-control">
                  <input aria-label="Birth hour" inputMode="numeric" placeholder="HH" value={birthTimeParts.hour} disabled={unknownBirthTime} onChange={(event) => updateProfileBirthTime("hour", event.target.value)} />
                  <span className="time-separator" aria-hidden="true">:</span>
                  <input aria-label="Birth minute" inputMode="numeric" placeholder="MM" value={birthTimeParts.minute} disabled={unknownBirthTime} onChange={(event) => updateProfileBirthTime("minute", event.target.value)} />
                  <div className="signup-meridiem" aria-label="AM or PM">
                    {(["AM", "PM"] as const).map((period) => (
                      <button key={period} type="button" className={birthTimeParts.meridiem === period ? "active" : ""} disabled={unknownBirthTime} aria-pressed={birthTimeParts.meridiem === period} onClick={() => updateProfileBirthTime("meridiem", period)}>
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
                checked={unknownBirthTime}
                onChange={(event) => {
                  setUnknownBirthTime(event.target.checked);
                  setBirthTime(event.target.checked ? "12:00 PM" : birthTime);
                }}
              />
              <span>I don't know my birth time.</span>
            </label>

            <button className="setup-submit setup-submit-light" type="button" onClick={saveBirthDetails}>Save birth details →</button>
          </section>

          <section className="setup-card" aria-label="Current location setup">
            <div className="setup-card-heading">
              <span>Daily Transits</span>
            </div>
            <h3>What city are you in now?</h3>

            <CitySearchField
              label="Current city"
              value={currentCity}
              onChange={(value) => {
                setCurrentCity(value);
                setCurrentLocationData(null);
              }}
              onSelect={(suggestion) => {
                setCurrentCity(suggestion.label);
                setCurrentLocationData(suggestion);
              }}
              placeholder="New York City, New York"
              className="profile-city-search"
            />

            <button className="setup-submit" type="button" onClick={saveCurrentLocation}>Save location →</button>
          </section>
        </div>
      </section>
      )}

      <section className="profile-charts" aria-label="Saved charts">
        <span>Saved charts</span>
        {hasSavedBirthDetails ? (
          profile.charts.map((chart) => (
            <article key={chart.id}>
              <strong>{chart.name}</strong>
              <p>{chart.type} · {chart.birthDate} · {chart.birthTime}</p>
              <p>{chart.birthCity}</p>
            </article>
          ))
        ) : (
          <article className="profile-chart-empty">
            <strong>No charts yet.</strong>
            <button type="button" onClick={onCreateChart}>Create Chart →</button>
          </article>
        )}
      </section>

      {transitsDrawn && (
        <section className="profile-transits" aria-label="Profile transits">
          <TransitResults
            form={transitForm}
            transits={transitItems}
            selectedTransit={selectedTransit}
            selectedTransitId={selectedTransitId}
            setSelectedTransitId={setSelectedTransitId}
          />
        </section>
      )}
    </>
  );
}
