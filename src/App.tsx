import {
  CalendarDays,
  Compass,
  LocateFixed,
  Moon,
  UserRound
} from "lucide-react";
import { useMemo, useState } from "react";
import { defaultLocation, getCurrentSky } from "./services/ephemeris";
import { getHoroscope } from "./services/horoscopes";
import { getDemoProfile, getInitialAccountMode } from "./services/session";
import type { AccountMode, HoroscopePeriod, LocationInput, PlanetPosition } from "./types";

const periods: HoroscopePeriod[] = ["daily", "weekly", "monthly"];

type PlacementMode = "paragraph" | "table";

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
  Pluto: "depth and transformation"
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
  Pluto: "draws attention to pressure, power, endings, and deep internal change."
};

export function App() {
  const [mode, setMode] = useState<AccountMode>(getInitialAccountMode);
  const [period, setPeriod] = useState<HoroscopePeriod>("daily");
  const [location, setLocation] = useState<LocationInput>(defaultLocation);
  const [manualLocation, setManualLocation] = useState(defaultLocation.label);
  const sky = useMemo(() => getCurrentSky(location), [location]);
  const horoscope = useMemo(() => getHoroscope(period, sky), [period, sky]);
  const profile = getDemoProfile();

  function useBrowserLocation() {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const nextLocation = {
          label: "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setLocation(nextLocation);
        setManualLocation(nextLocation.label);
      },
      () => {
        setManualLocation(location.label);
      }
    );
  }

  function applyManualLocation() {
    const seed = manualLocation.trim() || defaultLocation.label;
    const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
    setLocation({
      label: seed,
      latitude: ((hash % 1400) / 10) - 70,
      longitude: ((hash % 3000) / 10) - 150
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Moon aria-hidden="true" />
          <div>
            <span>Current Sky</span>
            <strong>Astrology Portal</strong>
          </div>
        </div>

        <div className="account-switch" aria-label="Account mode">
          <button className={mode === "guest" ? "active" : ""} onClick={() => setMode("guest")}>
            <Compass size={16} />
            Guest
          </button>
          <button className={mode === "member" ? "active" : ""} onClick={() => setMode("member")}>
            <UserRound size={16} />
            Member
          </button>
        </div>
      </header>

      <section className="portal-grid">
        <section className="sky-panel" aria-label="Current sky">
          <div className="panel-heading">
            <div>
              <p>{new Date(sky.generatedAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
              <h1>Current sky over {sky.location.label}</h1>
            </div>
            <button className="icon-button" onClick={useBrowserLocation} aria-label="Use current location" title="Use current location">
              <LocateFixed size={20} />
            </button>
          </div>

          <div className="location-row">
            <input
              value={manualLocation}
              onChange={(event) => setManualLocation(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyManualLocation();
              }}
              aria-label="Location"
            />
            <button onClick={applyManualLocation}>Update</button>
          </div>

          <SkyWheel positions={sky.positions} ascendant={sky.ascendant} />

          <div className="sky-stats">
            <Stat label="Ascendant" value={sky.ascendant} />
            <Stat label="Midheaven" value={sky.midheaven} />
            <Stat label="Moon phase" value={sky.moonPhase} />
            <Stat label="Element" value={sky.dominantElement} />
          </div>
        </section>

        <section className="detail-panel" aria-label="Portal details">
          {mode === "guest" ? (
            <GuestView positions={sky.positions} />
          ) : (
            <MemberView profile={profile} period={period} setPeriod={setPeriod} horoscope={horoscope} />
          )}
        </section>
      </section>

      <section className="aspects-band" aria-label="Active aspects">
        {sky.aspects.map((aspect) => (
          <article key={`${aspect.from}-${aspect.to}`}>
            <span>{aspect.type}</span>
            <strong>{aspect.from} + {aspect.to}</strong>
            <p>{aspect.meaning}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function SkyWheel({ positions, ascendant }: { positions: PlanetPosition[]; ascendant: string }) {
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
    house: 38
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

  function houseNumberForSign(sign: string) {
    const signIndex = signs.indexOf(sign);
    const ascendantIndex = signs.indexOf(ascendant);

    if (signIndex < 0 || ascendantIndex < 0) {
      return 1;
    }

    return ((signIndex - ascendantIndex + 12) % 12) + 1;
  }

  const aspectPairs = positions.slice(0, 5).map((position, index) => ({
    from: position,
    to: positions[(index * 2 + 3) % positions.length],
    soft: index % 2 === 0
  }));

  return (
    <svg className="sky-wheel" viewBox="0 0 600 600" role="img" aria-label="Planet positions">
      <title>Current zodiac wheel</title>
      <g className="wheel-rings">
        <circle cx={center} cy={center} r={radius.outer} />
        <circle cx={center} cy={center} r={radius.signInner} />
        <circle cx={center} cy={center} r={radius.aspect} className="faint" />
        <circle cx={center} cy={center} r={radius.house} />
      </g>

      <g className="wheel-sectors">
        {signs.map((sign, index) => {
          const a = 225 + index * 30;
          const outer = point(a, radius.outer);
          const inner = point(a, radius.house);
          return <line key={sign} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
        })}
      </g>

      <g className="house-numbers">
        {signs.map((sign, index) => {
          const angle = 240 + index * 30;
          const p = point(angle, 58);
          return (
            <text key={sign} x={p.x} y={p.y} transform={`rotate(${angle + 90} ${p.x} ${p.y})`}>
              {houseNumberForSign(sign)}
            </text>
          );
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
        {aspectPairs.map(({ from, to, soft }) => {
          const a = point(planetAngle(from), radius.aspect);
          const b = point(planetAngle(to), radius.aspect);
          return (
            <line
              key={`${from.planet}-${to.planet}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={soft ? "soft" : "hard"}
            />
          );
        })}
      </g>

      <line className="asc-line" x1={72} y1={center} x2={528} y2={center} />
      <line className="asc-line" x1={center} y1={72} x2={center} y2={528} />

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
                {position.degree}°
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
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
          <span>{position.degree}° {position.sign.toUpperCase()} · HOUSE {position.house}</span>
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
            <th>House</th>
            <th>Theme</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={position.planet}>
              <td>
                <span className="table-glyph">{position.glyph}</span>
                <strong>{position.planet}</strong>
              </td>
              <td>{position.degree}° {position.sign}</td>
              <td>{position.house}</td>
              <td>{placementThemes[position.planet]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
