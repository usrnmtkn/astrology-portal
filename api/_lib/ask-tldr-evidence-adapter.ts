import type { AskTldrEvidenceCandidate } from "./ask-tldr-model.ts";

type FactRecord = Record<string, unknown>;

export type AskTldrCalculatedEvidenceCandidate = AskTldrEvidenceCandidate & {
  label: string;
  facts: FactRecord;
  knowledgeIds: string[];
};

const ANGLE_HOUSES = new Map<string, number>([
  ["ascendant", 1],
  ["midheaven", 10],
  ["descendant", 7],
  ["ic", 4],
  ["imum coeli", 4]
]);
const ANGLES = new Map<string, string>([
  ["ascendant", "Ascendant"],
  ["midheaven", "Midheaven"],
  ["descendant", "Descendant"],
  ["ic", "IC"],
  ["imum coeli", "IC"]
]);
const SR_OVERLAY_ELIGIBLE_POINT_TOKENS = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"
]);

function record(value: unknown): FactRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as FactRecord : null;
}

function records(value: unknown) {
  return Array.isArray(value) ? value.map(record).filter(Boolean) as FactRecord[] : [];
}

function words(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function pointToken(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ").replaceAll("-", " ").replace(/\s+/gu, " ");
}

function canonicalAngle(value: string) {
  return ANGLES.get(pointToken(value)) ?? null;
}

function canonicalHouse(point: string, reportedHouse: number | null) {
  return ANGLE_HOUSES.get(pointToken(point)) ?? reportedHouse;
}

function houses(values: Array<number | null>) {
  return unique(values.filter((value): value is number => value !== null && value >= 1 && value <= 12));
}

function angles(values: string[]) {
  return unique(values.flatMap((value) => {
    const angle = canonicalAngle(value);
    return angle ? [angle] : [];
  }));
}

function sourceFacts(value: FactRecord) {
  return JSON.parse(JSON.stringify(value)) as FactRecord;
}

function candidate(input: AskTldrCalculatedEvidenceCandidate) {
  return input;
}

function natalEvidence(natalValue: unknown, calculator: string): AskTldrCalculatedEvidenceCandidate[] {
  const natal = record(natalValue);
  if (!natal) return [];
  const positions = records(natal.positions).flatMap((position) => {
    const point = words(position.point ?? position.planet);
    const reportedHouse = numberValue(position.house);
    if (!point || reportedHouse === null) return [];
    const house = canonicalHouse(point, reportedHouse);
    return [candidate({
      id: `natal-placement:${pointToken(point).replaceAll(" ", "-")}`,
      factorKey: `natal-placement:${pointToken(point)}`,
      kind: "natal_placement",
      temporalState: "natal",
      houses: houses([house]),
      angles: angles([point]),
      points: [point],
      themes: [],
      importance: "supporting",
      label: `${point} in natal house ${house}`,
      facts: sourceFacts(position),
      knowledgeIds: strings(position.knowledgeIds),
      provenance: { calculator, sourceId: `natal.position:${point}` }
    })];
  });

  const anglePlacements = Object.entries(record(natal.angles) ?? {}).flatMap(([key, value]) => {
    const angleRecord = record(value);
    const point = canonicalAngle(words(angleRecord?.point) || key) ?? canonicalAngle(key);
    if (!point) return [];
    const house = canonicalHouse(point, numberValue(angleRecord?.house));
    return [candidate({
      id: `natal-angle:${pointToken(point).replaceAll(" ", "-")}`,
      factorKey: `natal-angle:${pointToken(point)}`,
      kind: "natal_placement",
      temporalState: "natal",
      houses: houses([house]),
      angles: [point],
      points: [point],
      themes: [],
      importance: "supporting",
      label: `Natal ${point}`,
      facts: sourceFacts(angleRecord ?? { point, house }),
      knowledgeIds: strings(angleRecord?.knowledgeIds),
      provenance: { calculator, sourceId: `natal.angle:${point}` }
    })];
  });

  const aspects = records(natal.aspects).flatMap((aspect) => {
    const from = words(aspect.from ?? aspect.from_);
    const to = words(aspect.to);
    const aspectType = words(aspect.type ?? aspect.aspect);
    if (!from || !to || !aspectType) return [];
    const fromHouse = canonicalHouse(from, numberValue(aspect.fromHouse));
    const toHouse = canonicalHouse(to, numberValue(aspect.toHouse));
    const strength = numberValue(aspect.strength);
    return [candidate({
      id: `natal-aspect:${pointToken(from)}:${pointToken(aspectType)}:${pointToken(to)}`,
      factorKey: `natal-aspect:${[pointToken(from), pointToken(to)].sort().join(":")}:${pointToken(aspectType)}`,
      kind: "natal_aspect",
      temporalState: "natal",
      houses: houses([fromHouse, toHouse]),
      angles: angles([from, to]),
      points: unique([from, to]),
      themes: [],
      importance: strength !== null && strength >= 80 ? "major" : "supporting",
      label: `Natal ${from} ${aspectType} ${to}`,
      facts: sourceFacts(aspect),
      knowledgeIds: strings(aspect.knowledgeIds),
      provenance: { calculator, sourceId: `natal.aspect:${from}:${aspectType}:${to}` }
    })];
  });

  return [...positions, ...anglePlacements, ...aspects];
}

function transitHitCandidate(hit: FactRecord, calculator: string): AskTldrCalculatedEvidenceCandidate | null {
  const id = words(hit.id);
  const transitPlanet = words(hit.transitPlanet);
  const natalPoint = words(hit.natalPoint);
  const aspect = words(hit.aspect);
  if (!id || !transitPlanet || !natalPoint || !aspect) return null;
  const natalHouse = canonicalHouse(natalPoint, numberValue(hit.natalHouse));
  const transitHouse = numberValue(hit.transitHouse);
  const strength = numberValue(hit.strength);
  return candidate({
    id: `active:${id}`,
    factorKey: `transit:${pointToken(transitPlanet)}:${pointToken(aspect)}:${pointToken(natalPoint)}`,
    kind: transitPlanet === natalPoint && pointToken(aspect) === "conjunction" ? "return" : "transit_to_natal",
    temporalState: "active",
    houses: houses([transitHouse, natalHouse]),
    angles: angles([natalPoint]),
    points: unique([transitPlanet, natalPoint]),
    themes: [],
    exactAt: words(hit.exactAt) || undefined,
    importance: strength !== null && strength >= 80 ? "major" : "supporting",
    label: `${transitPlanet} ${aspect} natal ${natalPoint}`,
    facts: sourceFacts(hit),
    knowledgeIds: strings(hit.knowledgeIds),
    provenance: { calculator, sourceId: id }
  });
}

export function askTldrEvidenceFromPersonalTiming(
  timingValue: unknown,
  calculator = "tldrastro-api:/timing/personal"
): AskTldrCalculatedEvidenceCandidate[] {
  const timing = record(timingValue);
  if (!timing) return [];
  const boosted = records(timing.timingBoostedTransits).flatMap((entry) => {
    const hit = record(entry.hit);
    return hit ? [{ ...hit, timingBoost: sourceFacts(entry) }] : [];
  });
  const rawHits = [...boosted, ...records(timing.topTransits)];
  const seenHits = new Set<string>();
  const active = rawHits.flatMap((hit) => {
    const id = words(hit.id);
    if (!id || seenHits.has(id)) return [];
    seenHits.add(id);
    const adapted = transitHitCandidate(hit, calculator);
    return adapted ? [adapted] : [];
  });
  const natal = natalEvidence(timing.natal, calculator);
  const profections = record(timing.profections);
  const annual = record(profections?.annual);
  const house = numberValue(annual?.house);
  const ruler = words(annual?.ruler);
  const annualCandidate = annual && house !== null ? [candidate({
    id: `profection:annual:${house}`,
    factorKey: `profection:annual:${house}`,
    kind: "profection",
    temporalState: "annual",
    houses: [house],
    angles: [],
    points: ruler ? [ruler] : [],
    themes: [],
    startsAt: words(annual.startsAt) || undefined,
    endsAt: words(annual.endsAt) || undefined,
    importance: "supporting",
    label: `Annual profection house ${house}${ruler ? ` ruled by ${ruler}` : ""}`,
    facts: sourceFacts(annual),
    knowledgeIds: strings(annual.knowledgeIds),
    provenance: { calculator, sourceId: `profection.annual:${house}` }
  })] : [];
  return [...natal, ...active, ...annualCandidate];
}

function slowTransitEvidence(root: FactRecord, now: Date, calculator: string) {
  return records(root.slowTransitArcs).flatMap((arc) => {
    const arcId = words(arc.id);
    const transitPlanet = words(arc.transitPlanet);
    const natalPoint = words(arc.natalPoint);
    const aspect = words(arc.aspect);
    if (!arcId || !transitPlanet || !natalPoint || !aspect) return [];
    const natalHouse = canonicalHouse(natalPoint, numberValue(arc.natalHouse));
    const passList = records(arc.passes);
    return passList.flatMap((pass, index) => {
      const exactAt = words(pass.exactAt);
      if (!exactAt) return [];
      const parsed = new Date(exactAt);
      if (!Number.isFinite(parsed.getTime())) return [];
      const future = parsed.getTime() >= now.getTime();
      const isReturn = arc.isReturn === true;
      return [candidate({
        id: `window:${arcId}:pass-${index + 1}`,
        factorKey: `transit:${pointToken(transitPlanet)}:${pointToken(aspect)}:${pointToken(natalPoint)}`,
        kind: isReturn ? "return" : "transit_to_natal",
        temporalState: future ? "upcoming" : "annual",
        houses: houses([natalHouse]),
        angles: angles([natalPoint]),
        points: unique([transitPlanet, natalPoint]),
        themes: [],
        exactAt,
        importance: isReturn || passList.length > 1 || Boolean(canonicalAngle(natalPoint)) ? "major" : "supporting",
        label: `${transitPlanet} ${aspect} natal ${natalPoint}${passList.length > 1 ? `, pass ${index + 1} of ${passList.length}` : ""}`,
        facts: sourceFacts({ ...arc, pass, passIndex: index }),
        knowledgeIds: unique([...strings(arc.knowledgeIds), ...strings(pass.knowledgeIds)]),
        provenance: { calculator, sourceId: `${arcId}:pass-${index + 1}` }
      })];
    });
  });
}

function eclipseEvidence(root: FactRecord, now: Date, calculator: string) {
  return records(root.lunarEvents).flatMap((event) => {
    const id = words(event.id);
    const kind = words(event.kind);
    const occursAt = words(event.occursAt);
    if (!id || !kind.includes("eclipse") || !occursAt) return [];
    const parsed = new Date(occursAt);
    if (!Number.isFinite(parsed.getTime())) return [];
    const eventHouse = numberValue(event.natalHouse);
    const contacts = records(event.natalContacts);
    const contactHouses = contacts.map((contact) => {
      const natalPoint = words(contact.natalPoint);
      return canonicalHouse(natalPoint, numberValue(contact.natalHouse));
    });
    const contactPoints = contacts.map((contact) => words(contact.natalPoint)).filter(Boolean);
    return [candidate({
      id: `eclipse:${id}`,
      factorKey: `eclipse:${id}`,
      kind: "eclipse",
      temporalState: parsed.getTime() >= now.getTime() ? "upcoming" : "annual",
      houses: houses([eventHouse, ...contactHouses]),
      angles: angles(contactPoints),
      points: unique(contactPoints),
      themes: [],
      exactAt: occursAt,
      importance: "major",
      label: kind.replaceAll("_", " "),
      facts: sourceFacts(event),
      knowledgeIds: strings(event.knowledgeIds),
      provenance: { calculator, sourceId: id }
    })];
  });
}

function solarReturnEvidence(root: FactRecord, calculator: string) {
  const solarReturn = record(root.solarReturn);
  const analysis = record(solarReturn?.analysis);
  return records(analysis?.solarReturnToNatalOverlays).flatMap((overlay) => {
    const point = words(overlay.point);
    const house = numberValue(overlay.house);
    if (!point || house === null || !SR_OVERLAY_ELIGIBLE_POINT_TOKENS.has(pointToken(point))) return [];
    return [candidate({
      id: `solar-return-overlay:${pointToken(point)}:house-${house}`,
      factorKey: `solar-return-overlay:${pointToken(point)}:house-${house}`,
      kind: "solar_return_overlay",
      temporalState: "annual",
      houses: [house],
      angles: angles([point]),
      points: [point],
      themes: [],
      exactAt: words(solarReturn?.returnMoment) || undefined,
      importance: "supporting",
      label: `Solar Return ${point} in natal house ${house}`,
      facts: sourceFacts(overlay),
      knowledgeIds: strings(overlay.knowledgeIds),
      provenance: { calculator, sourceId: `solar-return.overlay:${point}:house-${house}` }
    })];
  });
}

function reportProfectionEvidence(root: FactRecord, calculator: string) {
  const annual = record(record(root.profections)?.annual);
  const house = numberValue(annual?.house);
  const ruler = words(annual?.ruler);
  if (!annual || house === null) return [];
  return [candidate({
    id: `profection:annual:${house}`,
    factorKey: `profection:annual:${house}`,
    kind: "profection",
    temporalState: "annual",
    houses: [house],
    angles: [],
    points: ruler ? [ruler] : [],
    themes: [],
    startsAt: words(annual.startsAt) || words(root.startsAt) || undefined,
    endsAt: words(annual.endsAt) || words(root.endsAt) || undefined,
    importance: "supporting",
    label: `Annual profection house ${house}${ruler ? ` ruled by ${ruler}` : ""}`,
    facts: sourceFacts(annual),
    knowledgeIds: strings(annual.knowledgeIds),
    provenance: { calculator, sourceId: `profection.annual:${house}` }
  })];
}

export function askTldrEvidenceFromReportWindow(
  reportWindowValue: unknown,
  now = new Date(),
  calculator = "tldrastro-api:/timing/report-window"
): AskTldrCalculatedEvidenceCandidate[] {
  const root = record(record(reportWindowValue)?.reportWindow) ?? record(reportWindowValue);
  if (!root) return [];
  return [
    ...natalEvidence(root.natal, calculator),
    ...slowTransitEvidence(root, now, calculator),
    ...eclipseEvidence(root, now, calculator),
    ...reportProfectionEvidence(root, calculator),
    ...solarReturnEvidence(root, calculator)
  ];
}

export function combineAskTldrCalculatedEvidence(...groups: AskTldrCalculatedEvidenceCandidate[][]) {
  const byId = new Map<string, AskTldrCalculatedEvidenceCandidate>();
  for (const item of groups.flat()) {
    const existing = byId.get(item.id);
    if (!existing || (existing.temporalState !== "active" && item.temporalState === "active")) byId.set(item.id, item);
  }
  return [...byId.values()];
}