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
  const preview = args.includes("--preview");
  return { planet, sign, referenceDate, timeZone, out, preview };
}

function localDate(value, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone
  }).format(new Date(value));
}

function title(value) {
  return String(value)
    .trim()
    .replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase());
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
    const skyRegistry = await vite.ssrLoadModule("/src/content/skyRegistry.ts");
    const facts = await ephemeris.getSkyPlacementTransitFacts({
      planet: cli.planet,
      sign: cli.sign,
      referenceDate: cli.referenceDate,
      timeZone: cli.timeZone
    });

    const events = facts.rankedEventsDuringTransit.map((event) => {
      const approvedExact = skyRegistry.approvedExactSkyAspectCopy(
        event.planet,
        event.aspect,
        event.otherPlanet
      );

      return {
        id: event.id,
        rank: event.rank,
        eventType: event.eventType,
        planet: event.planet,
        otherPlanet: event.otherPlanet,
        planets: event.planets,
        aspect: event.aspect,
        occursAt: event.occursAt,
        dateKey: event.dateKey,
        localDate: localDate(event.occursAt, facts.timeZone),
        approvedExactAspectCopy: approvedExact ? {
          resolved: true,
          contentId: approvedExact.contentId,
          sourceId: approvedExact.sourceId,
          body: approvedExact.body
        } : {
          resolved: false,
          contentId: null,
          sourceId: null,
          body: null
        }
      };
    });

    let preview = null;
    if (cli.preview) {
      const canonical = await vite.ssrLoadModule("/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs");
      const canonicalPath = path.join(
        repoRoot,
        "apps",
        "web",
        "src",
        "content",
        "fallbackArchitectureV3",
        "authored-inputs",
        "sky-v4-canonical-content-studio-stage-v1.json"
      );
      const corpus = JSON.parse(fs.readFileSync(canonicalPath, "utf8"));
      const transitStartLocal = localDate(facts.transitStart, facts.timeZone);
      const transitEndLocal = localDate(facts.transitEnd, facts.timeZone);
      const aspectInputs = events.map((event) => ({
        id: event.id,
        bodyA: event.planet,
        bodyB: event.otherPlanet,
        approved: event.approvedExactAspectCopy.resolved,
        exactDateTime: event.occursAt,
        orb: 0,
        headline: `${title(event.planet)} ${event.aspect} ${title(event.otherPlanet)}`,
        dateLine: event.localDate,
        body: event.approvedExactAspectCopy.body || ""
      }));
      const renderedPreview = canonical.renderSkyV4ContinuousPreview(corpus, {
        planet: cli.planet,
        sign: cli.sign,
        dateLine: `${transitStartLocal} to ${transitEndLocal}`,
        facts: {
          entryDate: transitStartLocal,
          exitDate: transitEndLocal
        },
        aspects: aspectInputs
      });
      preview = {
        resolution: renderedPreview.resolution,
        selectedAspectIds: renderedPreview.selectedAspectIds,
        page: renderedPreview.page
      };
    }

    const output = {
      schema: "tldrastro-sky-placement-residency-aspect-audit/v1",
      generatedAt: new Date().toISOString(),
      serving: false,
      note: "Read-only engine and exact-aspect-authority audit. No content, approval, release, or production state is mutated.",
      request: {
        planet: cli.planet,
        sign: cli.sign,
        referenceDate: cli.referenceDate.toISOString(),
        timeZone: cli.timeZone,
        preview: cli.preview
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
      approvedExactAspectCount: events.filter((event) => event.approvedExactAspectCopy.resolved).length,
      unresolvedExactAspectCount: events.filter((event) => !event.approvedExactAspectCopy.resolved).length,
      aspects: events.map((event) => ({
        ...event,
        approvedExactAspectCopy: {
          resolved: event.approvedExactAspectCopy.resolved,
          contentId: event.approvedExactAspectCopy.contentId,
          sourceId: event.approvedExactAspectCopy.sourceId
        }
      })),
      preview
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
