import { createHash } from "node:crypto";
import { getLunarCalendarMonth, type LunarCalendarEvent, type LunarCalendarMonth } from "../../apps/web/src/services/ephemeris.js";
import { zonedDateTimeToUtc } from "../../apps/web/src/services/timezones.js";
import { validateMonth, type MonthlyFacts, type MonthlyEvent } from "../../src/monthly-writing/model.js";
const slug = (value: string) => value.toLowerCase().replace(/\s+/gu,"-");
const aspectVerb: Record<string,string> = { conjunction: "conjoins", conjunct: "conjoins", opposition: "opposes", opposite: "opposes", square: "squares", sextile: "sextiles", trine: "trines" };
const outer = new Set(["Uranus","Neptune","Pluto"]);
const headlinePlanets = new Set(["Sun","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"]);
/** Editorial priority, not an ephemeris importance value. No cycle history inferred. */
function priority(event: LunarCalendarEvent) {
  if (event.type === "station" && !["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Pluto"].includes(event.planet ?? "")) return { score: 30, reason: "A calculated point station; not promoted above major planetary changes by default." };
  if (event.type === "station") return { score: 90 + (outer.has(event.planet ?? "") ? 6 : 0), reason: "A calculated change of direction during this month." };
  if (event.type === "ingress") return { score: outer.has(event.planet ?? "") ? 100 : ["Jupiter","Saturn"].includes(event.planet ?? "") ? 92 : 50, reason: "A calculated sign change during this month." };
  if (event.type === "aspect" && event.planets?.some(planet => !headlinePlanets.has(planet))) return { score: 35, reason: "An exact contact involving an auxiliary point; available for review but not promoted above major planetary activity by default." };
  return { score: event.planets?.every(planet=>outer.has(planet)) ? 95 : event.planets?.includes("Saturn") || event.planets?.includes("Jupiter") ? 65 : 55, reason: "An exact planetary contact during this month." };
}
export function monthlyFactsFromCalendar(calendar: LunarCalendarMonth, month: string, timeZone: string): MonthlyFacts {
  validateMonth(month,timeZone);
  if (calendar.timeZone !== timeZone) throw new Error("The calculated timezone does not match this monthly edition.");
  const days = calendar.days.filter(day=>day.inMonth);
  const wantedDays = new Date(Date.UTC(+month.slice(0,4),+month.slice(5),0)).getUTCDate();
  if (days.length !== wantedDays || days.some((day,index)=>day.dateKey !== `${month}-${String(index+1).padStart(2,"0")}`)) throw new Error("The full selected calendar month was not calculated.");
  const ingresses = calendar.events.filter(event=> event.type === "ingress" && event.planet === "Sun").sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
  const start = zonedDateTimeToUtc(`${month}-01`, "12:00 AM", timeZone).toISOString();
  const opening = ingresses.filter(event=>event.startsAt <= start).at(-1);
  const changing = ingresses.filter(event=>event.dateKey.startsWith(`${month}-`) && event.startsAt > start);
  if (!opening?.toSign && !opening?.sign || changing.length > 1) throw new Error("The opening and closing Sun seasons could not be resolved.");
  const dateFormat = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone }).format(new Date(iso));
  const candidates = calendar.events.filter(event=>event.dateKey.startsWith(`${month}-`))
    .filter(event => !(event.type === "aspect" && event.planets?.includes("Moon")))
    .filter(event => event.type !== "station" || !event.phase || ["station-retrograde","station-direct"].includes(event.phase));
  const events: MonthlyEvent[] = [];
  const seen = new Set<string>();
  for (const event of candidates) {
    if (seen.has(event.id)) continue;
    if (!event.id || !Number.isFinite(Date.parse(event.startsAt))) throw new Error("An event has incomplete calculated timing.");
    seen.add(event.id);
    let type: MonthlyEvent["type"] = event.type as MonthlyEvent["type"], clause: string, sourceIds: string[] = [];
    const planet = event.planet ?? "", sign = event.type === "ingress" ? event.toSign ?? event.sign ?? "" : event.sign ?? "";
    const planets = event.planets ?? (planet ? [planet] : []);
    if (event.type === "lunation") {
      if (!/^(New|Full) Moon/iu.test(event.title)) continue;
      type = event.eclipseType ? `${event.eclipseType}-eclipse` : /^New Moon/iu.test(event.title) ? "new-moon" : "full-moon";
      if (!sign) throw new Error("A lunar event is missing its calculated sign.");
      clause = `${type.split("-").map(word=>word[0].toUpperCase()+word.slice(1)).join(" ")} in ${sign}`;
      // Eclipse prose requires its own governed meaning record; never substitute a normal lunation.
      sourceIds = type.includes("eclipse") ? [] : [`sky-lunation-${type}-${slug(sign)}`];
    } else if (event.type === "ingress") {
      if (!planet || !sign) throw new Error("An ingress has incomplete calculated facts.");
      clause = `${planet} enters ${sign}`; sourceIds = [`sky-placement-${slug(planet)}-${slug(sign)}`];
    } else if (event.type === "station") {
      if (!planet || !["direct","retrograde"].includes(event.direction ?? "")) continue;
      clause = `${planet} stations ${event.direction}${sign ? ` in ${sign}` : ""}`;
      sourceIds = [`sky-retrograde-${slug(planet)}`, ...(sign ? [`sky-placement-${slug(planet)}-${slug(sign)}`] : [])];
    } else if (event.type === "aspect") {
      if (!event.planets || !aspectVerb[event.aspect ?? ""]) continue;
      clause = `${event.planets[0]} ${aspectVerb[event.aspect!]} ${event.planets[1]}`;
      sourceIds = [`sky-aspect-${slug(event.planets[0])}-${event.aspect}-${slug(event.planets[1])}`];
    } else continue;
    events.push({ id: event.id, type, startsAt: event.startsAt, date: dateFormat(event.startsAt), clause, sign, planet, planets, aspect: event.aspect ?? "", direction: event.direction ?? "", sourceIds, ...priority(event) });
  }
  events.sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));
  const stable = { month,timeZone,monthName:new Intl.DateTimeFormat("en-US",{month:"long",timeZone:"UTC"}).format(new Date(`${month}-15T12:00:00Z`)),year:month.slice(0,4), openingSeasonSign:opening!.toSign ?? opening!.sign!,closingSeasonSign:changing[0]?.toSign ?? changing[0]?.sign ?? "",seasonChangeDate:changing[0] ? dateFormat(changing[0].startsAt) : "",seasonChangeAt:changing[0]?.startsAt ?? "",events };
  return { ...stable, fingerprint: createHash("sha256").update(JSON.stringify(stable)).digest("hex"), calculatedAt:new Date().toISOString(),provenance:{source:"Canonical Calendar Swiss Ephemeris calculation",eclipseClassification:"Canonical Calendar true-node proximity classification; no subtype or visibility claim"} };
}
const cached = new Map<string,Promise<MonthlyFacts>>();
export async function calculateMonthlyTemplateFacts(month: string,timeZone: string) {
  validateMonth(month,timeZone);
  const key = `${month}|${timeZone}`;
  if (!cached.has(key)) {
    const request = getLunarCalendarMonth({label:"Geocentric reference",latitude:0,longitude:0,timeZone},zonedDateTimeToUtc(`${month}-15`,"12:00 PM",timeZone),{detail:"full"}).then(calendar=>monthlyFactsFromCalendar(calendar,month,timeZone));
    cached.set(key,request);
    void request.catch(()=>cached.delete(key));
    if(cached.size>12) cached.delete(cached.keys().next().value!);
  }
  return cached.get(key)!;
}
