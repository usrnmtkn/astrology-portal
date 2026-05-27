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
  return (
    <div className="sky-wheel" aria-label="Planet positions">
      <div className="wheel-core">
        <Sparkles size={28} />
        <span>Now</span>
      </div>
      {positions.map((position, index) => {
        const angle = (index / positions.length) * 360 - 90;
        const style = {
          "--angle": `${angle}deg`
        } as React.CSSProperties;

        return (
          <div className="planet-mark" style={style} key={position.planet} title={`${position.planet} in ${position.sign}`}>
            <span>{position.glyph}</span>
          </div>
        );
      })}
    </div>
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
