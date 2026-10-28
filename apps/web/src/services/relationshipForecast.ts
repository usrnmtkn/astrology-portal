import { personalDayBounds, shiftPersonalDateKey } from "./personalDailyTransits.js";
import { buildAnnualTimingContext } from "@tldr/astro-knowledge/timing-engine";

// This is an app presentation policy, not a Hellenistic compatibility formula.
// Profections prioritize personal timing; relationship ratings additionally
// require overlapping direct transits to both ends of an actual synastry link.
export const relationshipForecastPolicy = {
  version: "natal-synastry-daily-v2", orb: 1, significance: 30, sampleMinutes: 15,
  baseUnits: { Sun: 100, Moon: 35, Mercury: 100, Venus: 100, Mars: 125, Jupiter: 150, Saturn: 200, Uranus: 200, Neptune: 200, Pluto: 200 }
} as const;
// Opposite axes use the measured Ascendant, MC and true North Node endpoints.
export const natalForecastTargets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron", "Lilith", "North Node", "Ascendant", "Midheaven"];
export type ForecastOwner = "reader" | "friend";
export type ForecastSynastry = { id: string; readerPoint: string; friendPoint: string; aspect: string; orb: number };
export type ForecastPerson = { owner: ForecastOwner; birthDate: string; ascendant: string; targets: Array<{ planet: string; longitude: number }> };
export type NatalForecastInput = { id: string; people: ForecastPerson[]; synastry: ForecastSynastry[] };
export type ForecastAnnualTiming = { owner: ForecastOwner; house: number; sign: string; lordOfYear: string };
export type ForecastContact = {
  id: string; planet: string; target: string; aspect: string; orb: number;
  units: number; channel: "flow" | "friction" | "unrated";
  exactAt: string[]; continuesFromPreviousDay: boolean; continuesIntoNextDay: boolean;
  owner: ForecastOwner; targetLongitude: number; peakAt: string; transitLongitude: number;
  activeIntervals: Array<[string, string]>; timeLord: boolean; retrograde: boolean;
  connections: Array<ForecastSynastry & { directContactId?: string }>;
};
export type RelationshipForecastDay = {
  date: string; start: string; end: string; contacts: ForecastContact[];
  rating: "easy" | "mixed" | "tense" | "active" | "quiet";
  drivers: string[]; flow: number; friction: number;
  mainThemes: string[]; annualTiming: ForecastAnnualTiming[];
};
const aspects = [["conjunction", 0], ["sextile", 60], ["square", 90], ["trine", 120], ["opposition", 180]] as const;
const signedAngle = (n: number) => ((n + 180) % 360 + 360) % 360 - 180;
const outer = new Set(["Saturn","Uranus","Neptune","Pluto"]);
const background = (c:ForecastContact)=>Number(outer.has(c.planet)&&outer.has(c.target));

export function rateRelationshipContacts(contacts: ForecastContact[]) {
  // A personal hard transit alone never becomes a claim of pair friction.
  // Count a moving planet once per channel, even if it reaches several links.
  const shared = contacts.filter(c => c.connections.some(link => link.directContactId));
  const sorted = (channel: ForecastContact["channel"]) => {
    const unique = new Map<string, ForecastContact>();
    for (const contact of [...shared].sort(compareForecastContacts)) {
      if (contact.channel === channel && !unique.has(contact.planet)) unique.set(contact.planet, contact);
    }
    return [...unique.values()];
  };
  const support = sorted("flow"), pressure = sorted("friction"), unknown = sorted("unrated");
  const sum = (rows: ForecastContact[]) => rows.reduce((n,c) => n+c.units,0);
  const flow = sum(support), friction = sum(pressure), strong = relationshipForecastPolicy.significance;
  let rating: RelationshipForecastDay["rating"];
  let drivers: ForecastContact[];
  // Conjunctions need an approved planet/target meaning rule. Until one exists,
  // a significant unknown cannot silently be discarded from a confident lean.
  if (unknown.some(c => c.units >= strong)) { rating = "active"; drivers = unknown.slice(0,1); }
  else if (Math.max(flow,friction) < strong) { rating = contacts.length ? "active" : "quiet"; drivers = [...contacts].sort(compareForecastContacts).slice(0,2); }
  else if (Math.min(flow,friction) >= strong && 2*Math.min(flow,friction) >= Math.max(flow,friction)) {
    rating = "mixed"; drivers = [support[0],pressure[0]];
  } else { rating = flow > friction ? "easy" : "tense"; drivers = (flow > friction ? support : pressure).slice(0,1); }
  return { rating, drivers: drivers.map(c => c.id), flow, friction };
}

export function compareForecastContacts(a: ForecastContact, b: ForecastContact) {
  return Number(b.timeLord)-Number(a.timeLord) || background(a)-background(b) || b.units-a.units || a.orb-b.orb || a.id.localeCompare(b.id);
}

export function forecastAnnualTiming(person: ForecastPerson, date: string): ForecastAnnualTiming | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate) || !person.ascendant || person.birthDate > date) return null;
  const ageYears = Number(date.slice(0,4))-Number(person.birthDate.slice(0,4))-(date.slice(5)<person.birthDate.slice(5)?1:0);
  const timing = buildAnnualTimingContext({ ageYears, ascendantSign: person.ascendant });
  const title = (value: string) => value[0].toUpperCase()+value.slice(1);
  return { owner: person.owner, house: timing.profectedHouse, sign: title(timing.profectedSign), lordOfYear: title(timing.lordOfYear) };
}

export function connectForecastContacts(contacts: ForecastContact[], synastry: ForecastSynastry[]) {
  return contacts.map(contact => ({ ...contact, connections: synastry.filter(link =>
    (contact.owner === "reader" ? link.readerPoint : link.friendPoint) === contact.target
  ).map(link => {
    const opposite = contacts.find(other => other.owner !== contact.owner && other.planet === contact.planet
      && other.target === (contact.owner === "reader" ? link.friendPoint : link.readerPoint)
      && contact.activeIntervals.some(([a,b]) => other.activeIntervals.some(([c,d]) => Math.max(Date.parse(a),Date.parse(c)) < Math.min(Date.parse(b),Date.parse(d)))));
    return { ...link, ...(opposite ? { directContactId: opposite.id } : {}) };
  }) }));
}

export function forecastMainThemes(contacts: ForecastContact[]) {
  return (["reader", "friend"] as const).flatMap(owner => {
    const personal = contacts.filter(c => c.owner === owner).sort(compareForecastContacts);
    return personal[0] ? [personal[0].id] : [];
  });
}

export function forecastMoodContact(contact: ForecastContact) {
  return ["square", "opposition", "conjunction"].includes(contact.aspect)
    && (contact.target === "Moon" && ["Mars", "Saturn", "Uranus", "Neptune", "Pluto"].includes(contact.planet)
      || contact.planet === "Moon" && ["Mars", "Saturn", "Pluto"].includes(contact.target));
}

/** Whole civil-day search. The caller supplies Swiss Ephemeris longitudes;
 * samples are shared across every relationship, target and aspect. Exact roots
 * and station-adjacent minima are refined rather than inferred from speed. */
export function calculateRelationshipForecastDay(
  pairs: NatalForecastInput[], date: string, timeZone: string,
  longitude: (planet: string, milliseconds: number) => number
): Array<{ id: string; day: RelationshipForecastDay }> {
  const { start, end } = personalDayBounds(date,timeZone);
  const first = +start, last = +end-1, step = relationshipForecastPolicy.sampleMinutes*60_000;
  const times: number[] = [];
  for (let t=first;t<last;t+=step) times.push(t);
  times.push(last);
  const cache = new Map<string,number>();
  const at = (planet: string,t: number) => {
    const key = `${planet}:${t}`;
    if (!cache.has(key)) {
      const value = longitude(planet,t);
      if (!Number.isFinite(value)) throw new Error("Relationship ephemeris returned an invalid position.");
      cache.set(key,value);
    }
    return cache.get(key)!;
  };
  return pairs.map(pair => {
    const contacts: ForecastContact[] = [];
    const annualTiming = pair.people.flatMap(person => { const timing = forecastAnnualTiming(person,date); return timing ? [timing] : []; });
    for (const person of pair.people) for (const [planet,base] of Object.entries(relationshipForecastPolicy.baseUnits)) for (const target of person.targets) {
      if (!natalForecastTargets.includes(target.planet) || !Number.isFinite(target.longitude)) continue;
      for (const [aspect,angle] of aspects) {
        const residual = (t: number) => {
          const delta = signedAngle(at(planet,t)-target.longitude);
          return angle === 0 || angle === 180 ? signedAngle(delta-angle)
            : Math.abs(signedAngle(delta-angle)) <= Math.abs(signedAngle(delta+angle)) ? signedAngle(delta-angle) : signedAngle(delta+angle);
        };
        const values = times.map(residual);
        let minimum = Math.min(...values.map(Math.abs));
        // No body travels a degree in 15 minutes; distant samples cannot hide
        // an in-orb contact between them. Avoid unnecessary refinement work.
        if (minimum > 1.25) continue;
        const exactAt: string[] = [];
        const refined = [...times];
        for (let i=0;i<times.length;i++) {
          if (values[i] === 0) exactAt.push(new Date(times[i]).toISOString());
          if (i && values[i]*values[i-1] < 0 && Math.abs(values[i]-values[i-1]) < 180) {
            let a=times[i-1], b=times[i], va=values[i-1];
            while (b-a > 20) { const mid=Math.floor((a+b)/2), vm=residual(mid); if (va*vm<=0) b=mid; else { a=mid; va=vm; } }
            const exact = Math.floor((a+b)/2);
            exactAt.push(new Date(exact).toISOString()); refined.push(exact); minimum=0;
          }
          if (i>0 && i<times.length-1 && Math.abs(values[i]) < Math.abs(values[i-1]) && Math.abs(values[i]) < Math.abs(values[i+1])) {
            let a=times[i-1], b=times[i+1];
            while (b-a>20) { const l=a+(b-a)/3, r=b-(b-a)/3; if (Math.abs(residual(l))<Math.abs(residual(r))) b=r; else a=l; }
            const closest = Math.floor((a+b)/2);
            refined.push(closest); minimum=Math.min(minimum,Math.abs(residual(closest)));
          }
        }
        if (minimum > relationshipForecastPolicy.orb) continue;
        // Resolve in-orb intervals as well as exact roots: two Moon contacts on
        // the same date need not be active at the same time.
        const points = [...new Set(refined)].sort((a,b)=>a-b);
        const intervals: Array<[string,string]> = [];
        let entered: number | null = Math.abs(residual(first)) <= 1 ? first : null;
        for (let i=1;i<points.length;i++) {
          const inside = Math.abs(residual(points[i])) <= 1;
          if (inside !== (Math.abs(residual(points[i-1])) <= 1)) {
            let a=points[i-1], b=points[i];
            const leftInside = entered !== null;
            while (b-a>20) { const mid=Math.floor((a+b)/2); if ((Math.abs(residual(mid))<=1) === leftInside) a=mid; else b=mid; }
            const boundary=Math.floor((a+b)/2);
            if (inside) entered=boundary;
            else if (entered !== null) { intervals.push([new Date(entered).toISOString(),new Date(boundary).toISOString()]); entered=null; }
          }
        }
        if (entered !== null) intervals.push([new Date(entered).toISOString(),end.toISOString()]);
        const peak = exactAt[0] ? Date.parse(exactAt[0]) : points.reduce((a,b)=>Math.abs(residual(a))<=Math.abs(residual(b))?a:b);
        const timeLord = annualTiming.some(t=>t.owner === person.owner && (t.lordOfYear === planet || t.lordOfYear === target.planet));
        contacts.push({ id:`${person.owner}:${planet}:${aspect}:${target.planet}`, planet,target:target.planet,aspect,orb:minimum,
          units:Math.round(base*(1-0.75*minimum)),
          channel:aspect === "sextile" || aspect === "trine" ? "flow" : aspect === "square" || aspect === "opposition" ? "friction" : "unrated",
          exactAt:[...new Set(exactAt)], continuesFromPreviousDay:Math.abs(residual(first-1))<=1,
          continuesIntoNextDay:Math.abs(residual(+end))<=1,
          owner:person.owner,targetLongitude:target.longitude,peakAt:new Date(peak).toISOString(),transitLongitude:at(planet,peak),
          activeIntervals:intervals,timeLord,retrograde:signedAngle(at(planet,peak+30_000)-at(planet,peak-30_000))<0,connections:[] });
      }
    }
    const connected = connectForecastContacts(contacts,pair.synastry).sort(compareForecastContacts);
    const mainThemes = forecastMainThemes(connected);
    return {id:pair.id,day:{date,start:start.toISOString(),end:end.toISOString(),contacts:connected,...rateRelationshipContacts(connected),drivers:mainThemes,mainThemes,annualTiming}};
  });
}

export function relationshipForecastDates(date: string, timeZone: string) {
  const {dateKey} = personalDayBounds(date,timeZone);
  return [0,1,2].map(offset => shiftPersonalDateKey(dateKey,offset));
}
