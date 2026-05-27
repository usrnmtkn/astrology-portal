import {
  CalendarDays,
  Compass,
  LocateFixed,
  LogIn,
  Moon,
  Sparkles,
  UserRound
} from "lucide-react";
import { useMemo, useState } from "react";
import { defaultLocation, getCurrentSky } from "./services/ephemeris";
import { getHoroscope } from "./services/horoscopes";
import { getDemoProfile, getInitialAccountMode } from "./services/session";
import type { AccountMode, HoroscopePeriod, LocationInput, PlanetPosition } from "./types";

const periods: HoroscopePeriod[] = ["daily", "weekly", "monthly"];

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

          <SkyWheel positions={sky.positions} />

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

function SkyWheel({ positions }: { positions: PlanetPosition[] }) {
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
        {Array.from({ length: 12 }, (_, index) => {
          const p = point(240 + index * 30, 58);
          return (
            <text key={index + 1} x={p.x} y={p.y}>
              {index + 1}
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
          const label = point(planetAngle(position), radius.planet - 26);

          return (
            <g key={position.planet}>
              <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} className="planet-tick" />
              <circle cx={marker.x} cy={marker.y} r={12} className="planet-dot" />
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

      <text x={center} y={center - 4} className="center-date">
        NOW
      </text>
      <text x={center} y={center + 14} className="center-date small">
        CURRENT SKY
      </text>
      <Sparkles className="wheel-spark" x={center - 9} y={center + 24} size={18} />
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
  return (
    <>
      <div className="member-header">
        <div>
          <p>Guest view</p>
          <h2>Today’s planetary placements</h2>
        </div>
        <LogIn size={20} />
      </div>
      <div className="placement-list">
        {positions.slice(0, 7).map((position) => (
          <article key={position.planet}>
            <span className="glyph">{position.glyph}</span>
            <div>
              <strong>{position.planet} in {position.signGlyph} {position.sign}</strong>
              <p>House {position.house} · {position.degree}° · {position.motion}</p>
            </div>
          </article>
        ))}
      </div>
    </>
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
