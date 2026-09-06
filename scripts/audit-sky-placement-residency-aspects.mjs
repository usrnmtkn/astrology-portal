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

  const planet = String(valueFor("--planet") || "sun").trim().toLowerCase();
  const sign = String(valueFor("--sign") || "scorpio").trim().toLowerCase();
  const rawDate = valueFor("--date") || "2026-11-01T12:00:00Z";
  const referenceDate = new Date(rawDate);
  if (Number.isNaN(referenceDate.getTime())) throw new Error(`Invalid --date: ${rawDate}`);

  const timeZone = valueFor("--time-zone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
  } catch {
    throw new Error(`Invalid --time-zone: ${timeZone}`);
  }

  const out = valueFor("--out") ? path.resolve(valueFor("--out")) : null;
  return { planet, sign, referenceDate, timeZone, out };
}

function localDate(value, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone
  }).format(new Date(value));
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
    const facts = await ephemeris.getSkyPlacementTransitFacts({
      planet: cli.planet,
      sign: cli.sign,
      referenceDate: cli.referenceDate,
      timeZone: cli.timeZone
    });

    const events = facts.rankedEventsDuringTransit.map((event) => ({
      id: event.id,
      rank: event.rank,
      eventType: event.eventType,
      planet: event.planet,
      otherPlanet: event.otherPlanet,
      planets: event.planets,
      aspect: event.aspect,
      occursAt: event.occursAt,
      dateKey: event.dateKey,
      localDate: localDate(event.occursAt, facts.timeZone)
    }));

    const output = {
      schema: "tldrastro-sky-placement-residency-aspect-audit/v1",
      generatedAt: new Date().toISOString(),
      serving: false,
      note: "Read-only engine audit. No content, approval, release, or production state is mutated.",
      request: {
        planet: cli.planet,
        sign: cli.sign,
        referenceDate: cli.referenceDate.toISOString(),
        timeZone: cli.timeZone
      },
      residency: {
        planet: facts.planet,
        sign: facts.sign,
        timeZone: facts.timeZone,
        transitStart: facts.transitStart,
        transitEnd: facts.transitEnd,
        transitStartLocal: localDate(facts.transitStart, facts.timeZone),
        transitEndLocal: localDate(facts.transitEnd, facts.timeZone)
      },
      aspectCount: events.length,
      aspects: events
    };

    const rendered = `${JSON.stringify(output, null, 2)}\n`;
    if (cli.out) {
      fs.mkdirSync(path.dirname(cli.out), { recursive: true });
      fs.writeFileSync(cli.out, rendered, "utf8");
    }
    process.stdout.write(rendered);
  } finally {
    await vite.close();
  }
}

await main();
