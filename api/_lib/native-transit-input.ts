import { parseCalculationDate } from "./calculation-date.js";
import { ASTROLOGY_CALCULATION_CONTRACT } from "../../apps/web/src/services/astrologyFacts.js";

const moving = new Set([
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "North Node",
  "True Node",
  "South Node",
]);
const targets = new Set([
  ...moving,
  "Ascendant",
  "Descendant",
  "Midheaven",
  "Imum Coeli",
  "IC",
]);
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("Invalid input");
  return v as Record<string, unknown>;
};
function longitude(v: unknown) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v >= 360)
    throw Error("Invalid longitude");
  return v;
}
function planet(v: unknown, allowed = moving) {
  if (typeof v !== "string" || !allowed.has(v)) throw Error("Invalid body");
  return v;
}
function unique<T>(v: T[]) {
  if (new Set(v).size !== v.length) throw Error("Duplicate input");
  return v;
}
export function readNativeTransitInput(value: unknown) {
  const input = record(value);
  if (input.version !== ASTROLOGY_CALCULATION_CONTRACT.calculationVersion)
    throw Error("Invalid calculation version");
  const reference = parseCalculationDate(
    typeof input.referenceAt === "string" ? input.referenceAt : null,
  );
  if (reference.getUTCFullYear() < 1800 || reference.getUTCFullYear() > 2399)
    throw Error("Invalid date range");
  if (typeof input.timeZone !== "string" || input.timeZone.length > 100)
    throw Error("Invalid time zone");
  new Intl.DateTimeFormat("en", { timeZone: input.timeZone }).format(reference);
  const common = {
    referenceAt: reference.toISOString(),
    timeZone: input.timeZone,
  };
  if (input.kind === "retrograde-history") {
    if (
      typeof input.planet !== "string" ||
      ![
        "Mercury",
        "Venus",
        "Mars",
        "Jupiter",
        "Saturn",
        "Uranus",
        "Neptune",
        "Pluto",
        "Chiron",
      ].includes(input.planet) ||
      typeof input.sign !== "string" ||
      ![
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
        "Pisces",
      ].includes(input.sign)
    )
      throw Error("Invalid retrograde cycle");
    return {
      ...common,
      kind: "retrograde-history" as const,
      planet: input.planet,
      sign: input.sign,
    };
  }
  if (input.kind === "timing") {
    if (
      ![0, 60, 90, 120, 180].includes(Number(input.aspectDegrees)) ||
      typeof input.aspectDegrees !== "number"
    )
      throw Error("Invalid aspect");
    return {
      ...common,
      kind: "timing" as const,
      planet: planet(input.planet),
      longitude: longitude(input.longitude),
      aspectDegrees: input.aspectDegrees,
    };
  }
  if (input.kind === "timings") {
    if (
      !Array.isArray(input.contacts) ||
      !input.contacts.length ||
      input.contacts.length > 32
    )
      throw Error("Invalid timing inventory");
    const contacts = input.contacts.map((value) => {
      const contact = record(value);
      if (
        typeof contact.id !== "string" ||
        !/^[a-zA-Z0-9:._/ -]{1,200}$/.test(contact.id)
      )
        throw Error("Invalid contact ID");
      const parsed = readNativeTransitInput({
        ...common,
        planet: contact.planet,
        longitude: contact.longitude,
        aspectDegrees: contact.aspectDegrees,
        referenceAt: contact.referenceAt ?? common.referenceAt,
        kind: "timing",
        version: input.version,
      });
      if (parsed.kind !== "timing") throw Error("Invalid timing contact");
      return { ...parsed, id: contact.id };
    });
    unique(contacts.map((c) => c.id));
    return { ...common, kind: "timings" as const, contacts };
  }
  if (input.kind === "forecast") {
    if (
      !Array.isArray(input.pairs) ||
      !input.pairs.length ||
      input.pairs.length > 4
    )
      throw Error("Invalid forecast inventory");
    const pairs = input.pairs.map((value) => {
      const pair = record(value);
      if (
        typeof pair.id !== "string" ||
        !/^[a-zA-Z0-9:-]{1,100}$/.test(pair.id) ||
        !Array.isArray(pair.people) ||
        pair.people.length !== 2 ||
        !Array.isArray(pair.synastry) ||
        pair.synastry.length > 400
      )
        throw Error("Invalid forecast pair");
      const people = pair.people.map((value) => {
        const person = record(value);
        if (
          !["reader", "friend"].includes(String(person.owner)) ||
          typeof person.birthDate !== "string" ||
          typeof person.ascendant !== "string" ||
          ![
            "",
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
            "Pisces",
          ].includes(person.ascendant) ||
          !Array.isArray(person.targets) ||
          !person.targets.length ||
          person.targets.length > 20
        )
          throw Error("Invalid forecast subject");
        if (
          person.birthDate &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(person.birthDate) ||
            parseCalculationDate(person.birthDate) > reference)
        )
          throw Error("Invalid natal date");
        const subjectTargets = person.targets.map((value) => {
          const target = record(value);
          return {
            planet: planet(target.planet, targets),
            longitude: longitude(target.longitude),
          };
        });
        unique(subjectTargets.map((t) => t.planet));
        return {
          owner: person.owner as "reader" | "friend",
          birthDate: person.birthDate,
          ascendant: person.ascendant,
          targets: subjectTargets,
        };
      });
      unique(people.map((p) => p.owner));
      const synastry = pair.synastry.map((value) => {
        const contact = record(value);
        if (
          typeof contact.id !== "string" ||
          contact.id.length > 200 ||
          !["conjunction", "sextile", "square", "trine", "opposition"].includes(
            String(contact.aspect),
          ) ||
          typeof contact.orb !== "number" ||
          !Number.isFinite(contact.orb) ||
          contact.orb < 0 ||
          contact.orb > 15
        )
          throw Error("Invalid synastry contact");
        return {
          id: contact.id,
          readerPoint: planet(contact.readerPoint, targets),
          friendPoint: planet(contact.friendPoint, targets),
          aspect: contact.aspect as string,
          orb: contact.orb,
        };
      });
      unique(synastry.map((c) => c.id));
      return { id: pair.id, people, synastry };
    });
    unique(pairs.map((p) => p.id));
    return { ...common, kind: "forecast" as const, pairs };
  }
  if (input.kind === "daily") {
    if (
      !Array.isArray(input.planets) ||
      !input.planets.length ||
      input.planets.length > 15 ||
      !Array.isArray(input.targets) ||
      !input.targets.length ||
      input.targets.length > 20
    )
      throw Error("Invalid inventory");
    const planets = unique(input.planets.map((p) => planet(p)));
    const natalTargets = input.targets.map((value) => {
      const target = record(value);
      return {
        planet: planet(target.planet, targets),
        longitude: longitude(target.longitude),
      };
    });
    unique(natalTargets.map((t) => t.planet));
    return {
      ...common,
      kind: "daily" as const,
      planets,
      targets: natalTargets,
    };
  }
  throw Error("Invalid calculation kind");
}
