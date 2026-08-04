#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseCli(argv) {
  const args = argv.slice(2);
  const valueFor = (flag) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  };
  const planet = String(valueFor("--planet") || "jupiter").trim().toLowerCase();
  const sign = String(valueFor("--sign") || "libra").trim().toLowerCase();
  const rawDate = valueFor("--date");
  const referenceDate = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(referenceDate.getTime())) throw new Error(`Invalid --date: ${rawDate}`);
  const timeZone = valueFor("--time-zone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
  } catch {
    throw new Error(`Invalid --time-zone: ${timeZone}`);
  }
  const out = valueFor("--out")
    ? path.resolve(valueFor("--out"))
    : path.join(repoRoot, "packages", "astro-knowledge", "out", "sky-placement-engine-facts", `${planet}-${sign}.json`);
  return { planet, sign, referenceDate, timeZone, out };
}

function slug(value) {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function localDate(value, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone
  }).format(new Date(value));
}

function transitMeaning(event) {
  const first = slug(event.planet);
  const second = slug(event.otherPlanet);
  const candidates = [
    `packages/astro-knowledge/data/transits/${first}-${event.aspect}-${second}.json`,
    `packages/astro-knowledge/data/transits/${second}-${event.aspect}-${first}.json`
  ];
  for (const relativePath of candidates) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const record = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    if (record.status !== "LIVE" || record.voiceNeutral !== true) continue;
    const meaning = record.cyclic?.meaning || record.modern || record.traditional || record.base || record.tldr;
    if (typeof meaning !== "string" || !meaning.trim()) continue;
    return { meaning: meaning.trim(), meaningSource: relativePath };
  }
  return null;
}

async function main() {
  const cli = parseCli(process.argv);
  const vite = await createServer({
    root: path.join(repoRoot, "apps", "web"),
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "silent"
  });

  try {
    const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
    const raw = await ephemeris.getSkyPlacementTransitFacts({
      planet: cli.planet,
      sign: cli.sign,
      referenceDate: cli.referenceDate,
      timeZone: cli.timeZone
    });
    const seenEventFamilies = new Set();
    const eventsDuringTransit = raw.rankedEventsDuringTransit
      .map((event) => {
        const family = `${slug(event.planet)}:${event.aspect}:${slug(event.otherPlanet)}`;
        if (seenEventFamilies.has(family)) return null;
        const joined = transitMeaning(event);
        if (!joined) return null;
        seenEventFamilies.add(family);
        return {
          id: event.id,
          body: `${slug(event.planet)}-${event.aspect}-${slug(event.otherPlanet)}`,
          bodies: event.planets.map(slug),
          eventType: event.eventType,
          aspect: event.aspect,
          date: localDate(event.occursAt, cli.timeZone),
          dateIso: event.occursAt,
          rank: event.rank,
          ...joined
        };
      })
      .filter(Boolean)
      .slice(0, 2);

    const facts = {
      schemaVersion: 1,
      factOwner: "app-engine",
      planet: slug(raw.planet),
      sign: slug(raw.sign),
      timeZone: raw.timeZone,
      transitStart: localDate(raw.transitStart, cli.timeZone),
      transitEnd: localDate(raw.transitEnd, cli.timeZone),
      transitStartIso: raw.transitStart,
      transitEndIso: raw.transitEnd,
      priorSign: slug(raw.priorSign),
      priorSignEntryDate: localDate(raw.priorSignEntryDate, cli.timeZone),
      priorSignExitDate: localDate(raw.priorSignExitDate, cli.timeZone),
      previousResidency: raw.previousResidency ? {
        sign: slug(raw.previousResidency.sign),
        entryDate: localDate(raw.previousResidency.entryDate, cli.timeZone),
        exitDate: localDate(raw.previousResidency.exitDate, cli.timeZone),
        entryDateIso: raw.previousResidency.entryDate,
        exitDateIso: raw.previousResidency.exitDate
      } : null,
      eventsDuringTransit,
      provenance: {
        calculationSource: raw.calculationSource,
        zodiac: raw.zodiac,
        requestedReferenceDate: cli.referenceDate.toISOString(),
        locatedTransitReferenceDate: raw.referenceDate,
        dateRenderingTimeZone: raw.timeZone,
        meanings: eventsDuringTransit.map((event) => event.meaningSource)
      },
      serving: false,
      note: "Calculation-only authoring facts. This file does not approve, import, or serve prose."
    };

    fs.mkdirSync(path.dirname(cli.out), { recursive: true });
    fs.writeFileSync(cli.out, `${JSON.stringify(facts, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ out: cli.out, ...facts }, null, 2)}\n`);
  } finally {
    await vite.close();
  }
}

await main();
