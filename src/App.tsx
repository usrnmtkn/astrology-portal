import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  EyeOff,
  Mail,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { defaultLocation, getAstrodienstSky, getCurrentSky } from "./services/ephemeris";
import { getHoroscope } from "./services/horoscopes";
import { hasMapboxToken, reverseGeocodeCity, searchCities } from "./services/mapbox";
import { getInitialAccountMode } from "./services/session";
import type { AccountMode, HoroscopePeriod, LocationInput, PlanetPosition, SkySnapshot } from "./types";

const periods: HoroscopePeriod[] = ["daily", "weekly", "monthly"];

type PlacementMode = "paragraph" | "table";
type PortalMode = AccountMode | "transits" | "profile";
type TransitTerm = "short" | "long";
type TransitDirection = "applying" | "separating";
type UiTheme = "light" | "dark";
type SignupProvider = "email" | "google" | "apple" | "magic-link";

type UserChart = {
  id: string;
  name: string;
  type: "Birth chart";
  birthDate: string;
  birthTime: string;
  birthCity: string;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  provider: SignupProvider;
  sun: string;
  moon: string;
  rising: string;
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

const selectedLocationStorageKey = "tldrastro:selectedLocation";
const selectedThemeStorageKey = "tldrastro:theme";
const userProfileStorageKey = "tldrastro:userProfile";
const synodicMonthDays = 29.530588;
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
  currentLocation: "",
  currentLocationData: null,
  chartDate: new Date().toISOString().slice(0, 10)
};

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

function nextMoonEvent(sky: SkySnapshot) {
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const phaseAngle = normalizedAngle(zodiacLongitude(moon) - zodiacLongitude(sun));
  const nextEvent = phaseAngle < 180 ? "Full Moon" : "New Moon";
  const degreesUntilEvent = nextEvent === "Full Moon" ? 180 - phaseAngle : 360 - phaseAngle;
  const daysUntilEvent = Math.max(0, (degreesUntilEvent / 360) * synodicMonthDays);

  return {
    name: nextEvent,
    days: daysUntilEvent
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
        location: parsedLocation,
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

function createUserProfile(form: SignupForm, provider: SignupProvider): UserProfile {
  const name = form.fullName.trim() || (provider === "email" ? "New stargazer" : `${providerLabel(provider)} account`);
  const email = form.email.trim() || `${provider}@tldrastro.local`;
  const sun = zodiacFromBirthDate(form.birthDate);
  const chart: UserChart = {
    id: `chart-${Date.now()}`,
    name: chartNameFromProfile(name),
    type: "Birth chart",
    birthDate: form.birthDate || "Birth date needed",
    birthTime: form.unknownBirthTime ? "Time unknown" : form.birthTime || "Birth time needed",
    birthCity: form.birthCity.trim() || "Birth city needed"
  };

  return {
    id: `user-${Date.now()}`,
    name,
    email,
    provider,
    sun,
    moon: "Moon pending",
    rising: form.unknownBirthTime || !form.birthTime ? "Rising pending" : "Rising pending",
    charts: [chart]
  };
}

function providerLabel(provider: SignupProvider) {
  const labels: Record<SignupProvider, string> = {
    email: "Email",
    google: "Google",
    apple: "Apple",
    "magic-link": "Magic link"
  };

  return labels[provider];
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

export function App() {
  const initialLocationState = useMemo(getInitialLocation, []);
  const [theme, setTheme] = useState<UiTheme>(getInitialTheme);
  const [skyDate, setSkyDate] = useState(dateInputValue);
  const [mode, setMode] = useState<PortalMode>(getInitialAccountMode);
  const [period, setPeriod] = useState<HoroscopePeriod>("daily");
  const [location, setLocation] = useState<LocationInput>(initialLocationState.location);
  const [manualLocation, setManualLocation] = useState(initialLocationState.location.label);
  const [hasLocationPreference, setHasLocationPreference] = useState(initialLocationState.hasSavedLocation);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [citySearchStatus, setCitySearchStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [transitForm, setTransitForm] = useState<TransitForm>(defaultTransitForm);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getInitialUserProfile);
  const [transitsDrawn, setTransitsDrawn] = useState(false);
  const [selectedTransitId, setSelectedTransitId] = useState(sampleTransits[0].id);
  const [skyRefreshKey, setSkyRefreshKey] = useState(() => Date.now());
  const [sky, setSky] = useState<SkySnapshot>(() => getCurrentSky(initialLocationState.location, dateFromInput(dateInputValue())));
  const horoscope = useMemo(() => getHoroscope(period, sky), [period, sky]);
  const selectedTransit = sampleTransits.find((transit) => transit.id === selectedTransitId) ?? sampleTransits[0];
  const isSignupMode = mode === "profile" && !userProfile;
  const isProfileMode = mode === "profile";
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

            const resolvedLocation = mappedLocation ?? nextLocation;

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
    setLocation({
      label: suggestion.label,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude
    });
    setManualLocation(suggestion.label);
    setHasLocationPreference(true);
    setCitySuggestions([]);
    setCitySearchStatus("idle");
    setCityPickerOpen(false);
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
          <button className={mode === "profile" ? "active" : ""} type="button" onClick={() => setMode("profile")}>
            {userProfile ? "Profile" : "Sign in"}
          </button>
          <button className="chart-cta" type="button" onClick={() => setMode("transits")}>
            Create my chart →
          </button>
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
          {mode === "guest" && <GuestView positions={sky.positions} />}
          {mode === "transits" && (
            <TransitSetup
              form={transitForm}
              setForm={setTransitForm}
              onDraw={() => {
                const currentCity = transitForm.currentLocation.trim();

                if (currentCity) {
                  const nextLocation = transitForm.currentLocationData?.label === currentCity
                    ? transitForm.currentLocationData
                    : locationFromLabel(currentCity);

                  setLocation(nextLocation);
                  setManualLocation(nextLocation.label);
                  setTransitForm((currentForm) => ({
                    ...currentForm,
                    currentLocation: nextLocation.label
                  }));
                  setHasLocationPreference(true);
                }

                setTransitsDrawn(true);
              }}
            />
          )}
          {mode === "member" && (
            <MemberHomeView positions={sky.positions} period={period} setPeriod={setPeriod} horoscope={horoscope} />
          )}
          {mode === "profile" && (
            userProfile ? (
              <ProfileView
                profile={userProfile}
                onSignOut={() => {
                  setUserProfile(null);
                  setMode("profile");
                }}
              />
            ) : (
              <SignupView
                onCreateProfile={(nextProfile) => {
                  setUserProfile(nextProfile);
                  setMode("member");
                }}
              />
            )
          )}
        </section>
      </section>

      {mode === "transits" && transitsDrawn && (
        <TransitResults
          form={transitForm}
          selectedTransit={selectedTransit}
          selectedTransitId={selectedTransitId}
          setSelectedTransitId={setSelectedTransitId}
        />
      )}

    </main>
  );
}

function locationFromLabel(label: string): LocationInput {
  const seed = label.trim();

  if (!seed) {
    return defaultLocation;
  }

  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);

  return {
    label: seed,
    latitude: ((hash % 1400) / 10) - 70,
    longitude: ((hash % 3000) / 10) - 150
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
          {moonEvent.name} in {formatMoonCountdown(moonEvent.days)}
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
  optional = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: CitySuggestion) => void;
  placeholder: string;
  optional?: boolean;
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

  return (
    <div className="field-line city-search-field">
      <label>
        <span>
          {label}
          {optional && <em>Optional</em>}
        </span>
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

function GuestView({ positions }: { positions: PlanetPosition[] }) {
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
            <th>Theme</th>
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
              <td>{placementThemes[position.planet]}</td>
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
  onDraw: () => void;
}) {
  function updateField<Key extends keyof TransitForm>(key: Key, value: TransitForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onDraw();
  }

  return (
    <form className="transit-form" onSubmit={submitForm}>
      <div className="placements-heading">
        <p>Create your Chart</p>
        <h2>Your transits, plotted.</h2>
        <span>Where the sky is now, set against the sky of the day you were born.</span>
      </div>

      <div className="form-fields">
        <label className="field-line">
          <span>Name</span>
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
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
          placeholder="City, state"
        />

        <div className="field-group">
          <span>Date of birth</span>
          <div className="date-grid">
            <input aria-label="Birth month" value={form.birthMonth} onChange={(event) => updateField("birthMonth", event.target.value)} />
            <input aria-label="Birth day" value={form.birthDay} onChange={(event) => updateField("birthDay", event.target.value)} />
            <input aria-label="Birth year" value={form.birthYear} onChange={(event) => updateField("birthYear", event.target.value)} />
          </div>
        </div>

        <div className="field-group">
          <span>Time of birth</span>
          <div className="time-grid">
            <input aria-label="Birth hour" value={form.birthHour} onChange={(event) => updateField("birthHour", event.target.value)} />
            <input aria-label="Birth minute" value={form.birthMinute} onChange={(event) => updateField("birthMinute", event.target.value)} />
            <select
              aria-label="AM or PM"
              value={form.birthMeridiem}
              onChange={(event) => updateField("birthMeridiem", event.target.value as TransitForm["birthMeridiem"])}
            >
              <option>AM</option>
              <option>PM</option>
            </select>
          </div>
        </div>

        <label className="field-line">
          <span>Chart of day</span>
          <input type="date" value={form.chartDate} onChange={(event) => updateField("chartDate", event.target.value)} />
        </label>

        <CitySearchField
          label="Current city"
          value={form.currentLocation}
          onChange={(value) => {
            setForm({ ...form, currentLocation: value, currentLocationData: null });
          }}
          onSelect={(suggestion) => {
            setForm({ ...form, currentLocation: suggestion.label, currentLocationData: suggestion });
          }}
          placeholder="City, state"
          optional
        />
      </div>

      <button className="draw-button" type="submit">Draw the transits</button>
    </form>
  );
}

function TransitResults({
  form,
  selectedTransit,
  selectedTransitId,
  setSelectedTransitId
}: {
  form: TransitForm;
  selectedTransit: TransitItem;
  selectedTransitId: string;
  setSelectedTransitId: (id: string) => void;
}) {
  const shortTransits = sampleTransits.filter((transit) => transit.term === "short");
  const longTransits = sampleTransits.filter((transit) => transit.term === "long");
  const chartDate = new Date(`${form.chartDate}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="transit-results" aria-label="Daily transits">
      <div className="transit-summary">
        <div>
          <span>Birth chart details</span>
          <strong>{form.name || "Unnamed chart"}</strong>
          <p>{form.birthMonth} {form.birthDay}, {form.birthYear} · {form.birthHour}:{form.birthMinute.padStart(2, "0")} {form.birthMeridiem}</p>
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
        <button className="help-button" type="button">
          <CircleHelp size={18} />
          What's this?
        </button>
      </div>

      <aside className="transit-explainer">
        <p>A transit is the angle between the sky right now and your birth chart. The arrow next to each orb marks whether the contact is applying toward exactness or separating after its peak.</p>
      </aside>

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
  const maxOrb = Math.max(...transit.arc);
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
        <h4>Orb change over {new Date(`${form.chartDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</h4>
        <svg viewBox="0 0 330 130" role="img" aria-label="Orb change chart">
          <g className="orb-grid">
            <line x1="24" y1="24" x2="304" y2="24" />
            <line x1="24" y1="64" x2="304" y2="64" />
            <line x1="24" y1="104" x2="304" y2="104" />
          </g>
          <polyline points={points} />
          <text x="24" y="123">May 25</text>
          <text x="142" y="123">May 28</text>
          <text x="274" y="123">May 31</text>
        </svg>
      </div>
      <article className="read-closely">
        <span>Read it closely</span>
        <h3>{transit.note}</h3>
        <p>Today's sky now uses Swiss Ephemeris positions; natal transit matching still needs the birth-chart calculation pass.</p>
      </article>
    </section>
  );
}

function SignupView({ onCreateProfile }: { onCreateProfile: (profile: UserProfile) => void }) {
  const [form, setForm] = useState<SignupForm>(defaultSignupForm);
  const [passwordVisible, setPasswordVisible] = useState(false);

  function updateField<Key extends keyof SignupForm>(key: Key, value: SignupForm[Key]) {
    setForm({ ...form, [key]: value });
  }

  function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateProfile(createUserProfile(form, "email"));
  }

  function socialSignup(provider: Exclude<SignupProvider, "email">) {
    onCreateProfile(createUserProfile(form, provider));
  }

  return (
    <section className="signup-split" aria-label="Create account">
      <aside className="signup-story">
        <span>tldrastro</span>
        <h2>
          Know what the sky is doing.
          <em>Know what to do about it.</em>
        </h2>
        <p>Save your birth data once, then build charts, transits, and daily readings around your actual sky.</p>
        <div className="signup-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </aside>

      <form className="signup-form" onSubmit={submitSignup}>
        <div className="signup-heading">
          <p>Create account</p>
          <h3>Your chart starts here.</h3>
          <span>Birth date, time, and city.</span>
        </div>

        <div className="social-signons" aria-label="Social sign on">
          <button type="button" onClick={() => socialSignup("google")}>
            <span className="google-mark" aria-hidden="true">G</span>
            Continue with Google
          </button>
          <button type="button" onClick={() => socialSignup("apple")}>
            <span aria-hidden="true"></span>
            Continue with Apple
          </button>
          <button type="button" onClick={() => socialSignup("magic-link")}>
            <Mail size={20} aria-hidden="true" />
            Email me a magic link
          </button>
        </div>

        <div className="email-divider"><span>or with email</span></div>

        <div className="signup-fields">
          <label className="signup-field">
            <span>Full name</span>
            <div>
              <UserRound size={20} aria-hidden="true" />
              <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Jules Okafor" />
            </div>
          </label>

          <label className="signup-field">
            <span>Email</span>
            <div>
              <Mail size={20} aria-hidden="true" />
              <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@somewhere.com" />
            </div>
          </label>

          <label className="signup-field">
            <span>Password</span>
            <div>
              <input
                type={passwordVisible ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="at least 8 characters"
              />
              <button type="button" aria-label="Show password" onClick={() => setPasswordVisible((isVisible) => !isVisible)}>
                <EyeOff size={20} aria-hidden="true" />
              </button>
            </div>
          </label>

          <div className="signup-grid">
            <label className="signup-field">
              <span>Birth date</span>
              <div>
                <input type="date" value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} />
                <CalendarDays size={20} aria-hidden="true" />
              </div>
            </label>

            <label className="signup-field">
              <span>Birth time</span>
              <div>
                <input
                  type="time"
                  value={form.birthTime}
                  disabled={form.unknownBirthTime}
                  onChange={(event) => updateField("birthTime", event.target.value)}
                />
                <Clock3 size={20} aria-hidden="true" />
              </div>
            </label>
          </div>

          <label className="unknown-time">
            <input
              type="checkbox"
              checked={form.unknownBirthTime}
              onChange={(event) => {
                setForm({ ...form, unknownBirthTime: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime });
              }}
            />
            <span>I don't know my birth time</span>
          </label>

          <CitySearchField
            label="Birth city"
            value={form.birthCity}
            onChange={(value) => setForm({ ...form, birthCity: value, birthLocation: null })}
            onSelect={(suggestion) => setForm({ ...form, birthCity: suggestion.label, birthLocation: suggestion })}
            placeholder="Start typing a city..."
          />
          <p className="signup-note">Nearest major city is fine. We only need the location, not the address.</p>
        </div>

        <button className="signup-submit" type="submit">Create my chart →</button>
        <p className="signin-note">Already have an account? <button type="button" onClick={() => socialSignup("magic-link")}>Sign in</button></p>
        <p className="privacy-note">We'll never post anything. Your data stays yours.</p>
      </form>
    </section>
  );
}

function MemberHomeView({
  positions,
  period,
  setPeriod,
  horoscope
}: {
  positions: PlanetPosition[];
  period: HoroscopePeriod;
  setPeriod: (period: HoroscopePeriod) => void;
  horoscope: ReturnType<typeof getHoroscope>;
}) {
  return (
    <>
      <GuestView positions={positions} />

      <div className="period-tabs" role="tablist" aria-label="Horoscope period">
        {periods.map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={period === item}
            className={period === item ? "active" : ""}
            onClick={() => setPeriod(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <article className="horoscope">
        <span>{horoscope.title}</span>
        <h3>{horoscope.summary}</h3>
        <div className="focus-grid">
          {horoscope.focus.map((focus) => (
            <p key={focus}>{focus}</p>
          ))}
        </div>
        <blockquote>{horoscope.reflection}</blockquote>
      </article>
    </>
  );
}

function ProfileView({
  profile,
  onSignOut
}: {
  profile: UserProfile;
  onSignOut: () => void;
}) {
  return (
    <>
      <div className="member-header">
        <div>
          <p>{profile.sun} Sun · {profile.moon} · {profile.rising}</p>
          <h2>Hello, {profile.name}</h2>
        </div>
        <button className="signout-button" type="button" onClick={onSignOut}>Sign out</button>
      </div>

      <section className="profile-charts" aria-label="Saved charts">
        <span>Saved charts</span>
        {profile.charts.map((chart) => (
          <article key={chart.id}>
            <strong>{chart.name}</strong>
            <p>{chart.type} · {chart.birthDate} · {chart.birthTime}</p>
            <p>{chart.birthCity}</p>
          </article>
        ))}
      </section>
    </>
  );
}
