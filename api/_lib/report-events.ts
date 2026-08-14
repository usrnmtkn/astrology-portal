export type CanonicalReportEvent = {
  eventId: string;
  factorId: string;
  occursAt: string;
  date: string;
  aspect: string;
  movingBody: string;
  natalBody: string;
  natalHouse: number | null;
  motion: "direct" | "retrograde" | "not_applicable";
  passNumber: number;
  passCount: number;
  attribution: string;
};

type FactRecord = Record<string, unknown>;

function record(value: unknown): FactRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as FactRecord : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slug(value: string) {
  return value.toLowerCase().replace(/&/gu, "and").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  return `${value}${value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`;
}

function aspectVerb(aspect: string) {
  return ({ conjunction: "conjoins", opposition: "opposes", square: "squares", trine: "trines", sextile: "sextiles" } as Record<string, string>)[aspect.toLowerCase()] ?? aspect;
}

function eventId(event: Omit<CanonicalReportEvent, "eventId" | "attribution">) {
  return [
    "report-event-v1", event.date, slug(event.movingBody), slug(event.aspect), slug(event.natalBody),
    `house-${event.natalHouse ?? "na"}`, event.motion, `pass-${event.passNumber}-of-${event.passCount}`
  ].join(":");
}

function transitEvents(root: FactRecord): CanonicalReportEvent[] {
  const arcs = Array.isArray(root.slowTransitArcs) ? root.slowTransitArcs.map(record).filter(Boolean) as FactRecord[] : [];
  return arcs.flatMap((arc) => {
    const movingBody = text(arc.transitPlanet);
    const natalBody = text(arc.natalPoint);
    const aspect = arc.isReturn === true ? "return" : text(arc.aspect).toLowerCase();
    const natalHouse = Number.isFinite(Number(arc.natalHouse)) ? Number(arc.natalHouse) : null;
    const passes = Array.isArray(arc.passes) ? arc.passes.map(record).filter(Boolean) as FactRecord[] : [];
    return passes.flatMap((pass, index) => {
      const occursAt = text(pass.exactAt);
      const date = occursAt.slice(0, 10);
      const motion = text(pass.motion).toLowerCase() === "retrograde" ? "retrograde" as const : "direct" as const;
      if (!movingBody || !natalBody || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) return [];
      const base = { factorId: text(arc.id) || `${slug(movingBody)}-${slug(aspect)}-${slug(natalBody)}`, occursAt, date, aspect, movingBody, natalBody, natalHouse, motion, passNumber: index + 1, passCount: passes.length };
      const house = natalHouse ? ` in your natal ${ordinal(natalHouse)} house` : "";
      const passClause = passes.length > 1 ? `, pass ${index + 1} of ${passes.length}` : "";
      const verb = aspect === "return" ? "returns to" : aspectVerb(aspect);
      return [{ ...base, eventId: eventId(base), attribution: `${movingBody} ${verb} your natal ${natalBody}${house}${passClause} (${motion}).` }];
    });
  });
}

function lunarEvents(root: FactRecord): CanonicalReportEvent[] {
  const events = Array.isArray(root.lunarEvents) ? root.lunarEvents.map(record).filter(Boolean) as FactRecord[] : [];
  return events.flatMap((event) => {
    const kind = text(event.kind).toLowerCase();
    if (!kind.endsWith("_eclipse")) return [];
    const occursAt = text(event.occursAt);
    const date = occursAt.slice(0, 10);
    const contacts = Array.isArray(event.natalContacts) ? event.natalContacts.map(record).filter(Boolean) as FactRecord[] : [];
    const contact = contacts.find((entry) => text(entry.natalPoint)) ?? null;
    const movingBody = kind.startsWith("solar") ? "Sun" : "Moon";
    const natalBody = contact ? text(contact.natalPoint) : "house cusp";
    const aspect = contact ? text(contact.aspect).toLowerCase() || "conjunction" : "eclipse";
    const natalHouse = Number.isFinite(Number(event.natalHouse)) ? Number(event.natalHouse) : null;
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return [];
    const base = { factorId: text(event.id) || `${kind}:${date}`, occursAt, date, aspect, movingBody, natalBody, natalHouse, motion: "not_applicable" as const, passNumber: 1, passCount: 1 };
    const eclipse = kind.replace("_", " ");
    const attribution = contact
      ? `A ${eclipse} ${aspectVerb(aspect)} your natal ${natalBody}${natalHouse ? ` in your natal ${ordinal(natalHouse)} house` : ""}.`
      : `A ${eclipse} falls in your natal ${ordinal(natalHouse ?? 0)} house.`;
    return [{ ...base, eventId: eventId(base), attribution }];
  });
}

function fastEvents(root: FactRecord): CanonicalReportEvent[] {
  const events = Array.isArray(root.fastTransitKeyDates) ? root.fastTransitKeyDates.map(record).filter(Boolean) as FactRecord[] : [];
  return events.flatMap((event) => {
    const occursAt = text(event.exactAt) || text(event.occursAt);
    const date = occursAt.slice(0, 10);
    const movingBody = text(event.transitPlanet);
    const natalBody = text(event.natalPoint);
    const aspect = text(event.aspect).toLowerCase();
    const natalHouse = Number.isFinite(Number(event.natalHouse)) ? Number(event.natalHouse) : null;
    const motion = text(event.motion).toLowerCase() === "retrograde" ? "retrograde" as const : "direct" as const;
    const passNumber = Number(event.passNumber) || 1;
    const passCount = Number(event.passCount) || 1;
    if (!movingBody || !natalBody || !aspect || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) return [];
    const base = { factorId: text(event.id) || `${slug(movingBody)}-${slug(aspect)}-${slug(natalBody)}`, occursAt, date, aspect, movingBody, natalBody, natalHouse, motion, passNumber, passCount };
    const attribution = `${movingBody} ${aspectVerb(aspect)} your natal ${natalBody}${natalHouse ? ` in your natal ${ordinal(natalHouse)} house` : ""}${passCount > 1 ? `, pass ${passNumber} of ${passCount}` : ""} (${motion}).`;
    return [{ ...base, eventId: eventId(base), attribution }];
  });
}

export function canonicalReportEvents(facts: Record<string, unknown>) {
  const root = record(facts.reportWindow) ?? facts;
  return [...transitEvents(root), ...fastEvents(root), ...lunarEvents(root)].sort((left, right) => Date.parse(left.occursAt) - Date.parse(right.occursAt) || left.eventId.localeCompare(right.eventId));
}
