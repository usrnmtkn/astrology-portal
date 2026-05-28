import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
  Moon,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { defaultLocation, getAstrodienstSky, getCurrentSky } from "./services/ephemeris";
import { getHoroscope } from "./services/horoscopes";
import { hasMapboxToken, reverseGeocodeCity, searchCities } from "./services/mapbox";
import { getDemoProfile, getInitialAccountMode } from "./services/session";
import type { AccountMode, HoroscopePeriod, LocationInput, PlanetPosition, SkySnapshot } from "./types";

const periods: HoroscopePeriod[] = ["daily", "weekly", "monthly"];

type PlacementMode = "paragraph" | "table";
type PortalMode = AccountMode | "transits";
type TransitTerm = "short" | "long";
type TransitDirection = "applying" | "separating";

type TransitForm = {
  name: string;
  birthPlace: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  birthHour: string;
  birthMinute: string;
  birthMeridiem: "AM" | "PM";
  currentLocation: string;
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
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  birthHour: "",
  birthMinute: "",
  birthMeridiem: "AM",
  currentLocation: "",
  chartDate: new Date().toISOString().slice(0, 10)
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
  const [transitsDrawn, setTransitsDrawn] = useState(false);
  const [selectedTransitId, setSelectedTransitId] = useState(sampleTransits[0].id);
  const [skyRefreshKey, setSkyRefreshKey] = useState(() => Date.now());
  const [sky, setSky] = useState<SkySnapshot>(() => getCurrentSky(initialLocationState.location, dateFromInput(dateInputValue())));
  const skyDateInputRef = useRef<HTMLInputElement>(null);
  const horoscope = useMemo(() => getHoroscope(period, sky), [period, sky]);
  const profile = getDemoProfile();
  const selectedTransit = sampleTransits.find((transit) => transit.id === selectedTransitId) ?? sampleTransits[0];
  const sunPosition = sky.positions.find((position) => position.planet === "Sun");
  const moonPosition = sky.positions.find((position) => position.planet === "Moon");

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
    if (!datePickerOpen) {
      return;
    }

    const picker = skyDateInputRef.current;

    picker?.focus();
    picker?.showPicker?.();
  }, [datePickerOpen]);

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
    <main className="app-shell">
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
          <button className={mode === "guest" ? "active" : ""} onClick={() => setMode("guest")}>
            Today
          </button>
          <button type="button" onClick={() => setMode("member")}>Sign in</button>
          <button className="chart-cta" type="button" onClick={() => setMode("transits")}>
            Create my chart →
          </button>
        </nav>
      </header>

      <section className="portal-grid">
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
                {formatSkyDate(skyDate)}
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
            <form
              className="date-picker"
              id="sky-date-picker"
              onSubmit={(event) => {
                event.preventDefault();
                setDatePickerOpen(false);
              }}
            >
              <label>
                <span>Date</span>
                <input
                  ref={skyDateInputRef}
                  aria-label="Sky date"
                  type="date"
                  value={skyDate}
                  onChange={(event) => {
                    setSkyDate(event.target.value);
                    setDatePickerOpen(false);
                  }}
                />
              </label>
            </form>
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

          <SkyBriefing sky={sky} />

          <div className="sky-stats">
            <Stat label="Zodiac season" value={sunPosition ? `Sun in ${sunPosition.sign}` : "Current Sun"} />
            <Stat label="Moon sign" value={moonPosition?.sign ?? "Current Moon"} />
            <Stat label="Moon phase" value={sky.moonPhase} artwork={<MoonPhaseArt phase={sky.moonPhase} />} />
          </div>
        </section>

        <section className="detail-panel" aria-label="Portal details">
          {mode === "guest" && <GuestView positions={sky.positions} />}
          {mode === "transits" && (
            <TransitSetup
              form={transitForm}
              setForm={setTransitForm}
              onDraw={() => {
                const nextLocation = locationFromLabel(transitForm.currentLocation);

                setLocation(nextLocation);
                setManualLocation(nextLocation.label);
                setTransitForm((currentForm) => ({
                  ...currentForm,
                  currentLocation: nextLocation.label
                }));
                setHasLocationPreference(true);
                setTransitsDrawn(true);
              }}
            />
          )}
          {mode === "member" && (
            <MemberView profile={profile} period={period} setPeriod={setPeriod} horoscope={horoscope} />
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

      <section className="aspects-card" aria-label="Active aspects">
        <div className="aspects-heading">
          <span>Active aspects</span>
        </div>
        <div className="aspect-list">
          {sky.aspects.map((aspect) => (
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

function SkyBriefing({ sky }: { sky: SkySnapshot }) {
  const moon = sky.positions.find((position) => position.planet === "Moon");
  const sun = sky.positions.find((position) => position.planet === "Sun");
  const leadAspect = sky.aspects[0];

  return (
    <aside className="sky-briefing" aria-label="Sky briefing">
      <div>
        <span><Sparkles size={15} aria-hidden="true" /> Sky briefing</span>
        <p>
          {sun ? `The Sun in ${sun.sign} marks the current zodiac season.` : "The Sun sets the current zodiac season."}
          {" "}
          The {sky.moonPhase.toLowerCase()} Moon in {moon?.sign ?? "motion"} describes the day's emotional weather.
          {" "}
          {leadAspect ? ` Watch ${leadAspect.from} ${leadAspect.type} ${leadAspect.to}: ${leadAspect.meaning.toLowerCase()}` : ""}
        </p>
      </div>
    </aside>
  );
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

function Stat({ label, value, artwork }: { label: string; value: string; artwork?: ReactNode }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong className={artwork ? "stat-value with-art" : "stat-value"}>
        {artwork}
        <span>{value}</span>
      </strong>
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
        <p>Tool No. 04 · Transits</p>
        <h2>Your transits, plotted.</h2>
        <span>Where the sky is now, set against the sky of the day you were born.</span>
      </div>

      <div className="form-fields">
        <label className="field-line">
          <span>Name</span>
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label className="field-line">
          <span>Place of birth</span>
          <input value={form.birthPlace} onChange={(event) => updateField("birthPlace", event.target.value)} />
        </label>

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

        <label className="field-line">
          <span>Current city</span>
          <input aria-label="Current city" value={form.currentLocation} onChange={(event) => updateField("currentLocation", event.target.value)} />
        </label>
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
          <p>{form.currentLocation}</p>
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

function MemberView({
  profile,
  period,
  setPeriod,
  horoscope
}: {
  profile: ReturnType<typeof getDemoProfile>;
  period: HoroscopePeriod;
  setPeriod: (period: HoroscopePeriod) => void;
  horoscope: ReturnType<typeof getHoroscope>;
}) {
  return (
    <>
      <div className="member-header">
        <div>
          <p>{profile.sun} Sun · {profile.moon} Moon · {profile.rising} Rising</p>
          <h2>Hello, {profile.name}</h2>
        </div>
        <CalendarDays size={20} />
      </div>

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
