import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

const surfaceLayouts = {
  house: {
    requiredSlots: ["headline", "body"],
    optionalSlots: ["tldr"]
  },
  aspect: {
    requiredSlots: ["body"],
    optionalSlots: ["tldr"]
  },
  compat: {
    requiredSlots: ["tag", "body"],
    optionalSlots: ["tldr"]
  },
  daily: {
    requiredSlots: ["headline", "body"],
    optionalSlots: ["tldr"]
  }
};

function authoredUnit(card, surface) {
  const layout = surfaceLayouts[surface];
  // Some approved contacts are Friends-only. They are reader units in that
  // audience, rather than empty You passages.
  let body = card.body_you ?? card.body ?? card.body_they;
  if (surface === "aspect" && typeof body === "string") {
    const selector = String(card.contentKey ?? "").split("/")[4];
    const aspect = selector === "soft" ? "trine" : selector === "hard" ? "square" : selector === "any" ? "conjunction" : selector;
    const aspectWord = {
      conjunction: "conjunct",
      opposition: "opposite",
      square: "square",
      trine: "trine",
      sextile: "sextile"
    }[aspect] ?? aspect;
    // The authored rows intentionally carry engine slots. Expose the same concrete
    // reader body the resolver produces, rather than misreporting those slots as copy.
    body = body
      .replaceAll("{{aspectWord}}", aspectWord)
      .replaceAll("{{untilDate}}", "Aug 10");
  }

  return {
    key: card.contentKey
      .replace("authored/transit-house/", "house.")
      .replace("authored/transit-aspect/", "aspect.")
      .replaceAll("/", "."),
    surface,
    sourcePackage: "tldrastro-fallback-architecture-v3",
    version: "author-final",
    declaredSlots: [
      ...layout.requiredSlots,
      ...layout.optionalSlots.filter((slot) => typeof card[slot] === "string" && card[slot].trim())
    ],
    fields: {
      headline: card.headline,
      tldr: card.tldr,
      body
    }
  };
}

const selectableTransitAspectTargets = new Set([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
  "chiron", "lilith", "north-node", "south-node", "ascendant", "midheaven", "descendant", "imum-coeli"
]);

function selectableTransitAspectCard(card) {
  const [, , transiting, natal] = String(card.contentKey ?? "").split("/");

  return (transiting === "any" || selectableTransitAspectTargets.has(transiting))
    && selectableTransitAspectTargets.has(natal);
}

function keyPart(value) {
  return String(value ?? "").trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function transitHouseUnitsFromPackage(transitLibrary, templates, sourceRows) {
  const { createTransitSynastryRenderer } = await import(
    "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js"
  );
  const renderer = createTransitSynastryRenderer(transitLibrary, templates, sourceRows);
  const transitHousePlanets = Array.from(new Set(
    (sourceRows.hookRows ?? [])
      .map((row) => String(row.contentKey ?? "").match(/^fallback-hook\/transit-effect-house\/([^/]+)$/)?.[1])
      .filter(Boolean)
  )).sort();

  return transitHousePlanets.flatMap((planet) => (
    Array.from({ length: 12 }, (_, index) => {
      const house = index + 1;
      const rendered = renderer.renderTransitHouse({ planet, house });

      return {
        key: rendered.contentKey ?? `house.${planet}.${house}`,
        surface: "house",
        sourcePackage: "tldrastro-fallback-architecture-v3",
        version: "author-final",
        declaredSlots: [...surfaceLayouts.house.requiredSlots],
        fields: {
          headline: rendered.headline,
          body: rendered.body
        }
      };
    })
  ));
}

async function skyPlacementUnitsFromPackage() {
  const { createTransitSynastryRenderer } = await import(
    "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js"
  );
  // Match the app's initial and deferred serving packages. The raw fallback
  // source file alone predates the continuous Sky articles and omits their
  // approved sign copy, education and house sources.
  const bundles = [
    "bundled-initial-reader-rows-v3",
    "bundled-sky-core-rows-v3",
    "bundled-deferred-core-rows-v3",
    "bundled-sky-placement-rows-v3",
    "bundled-sky-placement-house-rows-v3",
    "bundled-calendar-rows-v3",
    "bundled-shared-placement-rows-v3"
  ].map((name) => readJson(`apps/web/src/content/fallbackArchitectureV3/${name}.json`));
  const renderer = createTransitSynastryRenderer(
    { authoredCards: bundles.flatMap((bundle) => bundle.authoredCards ?? []) },
    { templates: bundles.flatMap((bundle) => bundle.templates ?? []) },
    {
      hookRows: bundles.flatMap((bundle) => bundle.hookRows ?? []),
      vocabularyRows: bundles.flatMap((bundle) => bundle.vocabularyRows ?? [])
    }
  );
  const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

  return planets.flatMap((planet) => signs.map((sign, signIndex) => {
    // Explicit test facts fill the same calculated-date slots as the app.
    // These values are contract fixtures, never production placement data.
    const rendered = renderer.renderSkyPlacement({
      planet,
      sign,
      events: [],
      asOfDate: "2026-03-21T12:00:00Z",
      entryDate: "March 20, 2026",
      exitDate: "April 19, 2026",
      priorSign: signs[(signIndex + 11) % signs.length],
      priorSignEntryDate: "February 18, 2026",
      priorSignExitDate: "March 20, 2026",
      previousResidencyEntryDate: "March 20, 2000",
      previousResidencyExitDate: "April 19, 2000"
    });

    return {
      key: `sky.${planet}.${sign}`,
      surface: "daily",
      sourcePackage: "tldrastro-fallback-architecture-v3",
      version: "author-final",
      declaredSlots: [...surfaceLayouts.daily.requiredSlots],
      fields: {
        headline: rendered.headline,
        body: rendered.body
      }
    };
  }));
}

export default async function loadUnits() {
  const transitLibrary = readJson(
    "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"
  );
  const fallbackSourceRows = readJson(
    "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
  );
  const fallbackTemplates = readJson(
    "apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json"
  );
  const lunationBlendRows = readJson(
    "apps/web/src/content/fallbackArchitectureV3/source-rows/lunation-blend-units-v1.json"
  );
  const weeklyRows = readJson(
    "apps/web/src/content/fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json"
  );
  const moonCompatibilityLibrary = readJson(
    "tldr-astro-phrasebank/phrasebank/moon-compatibility-library.json"
  );
  const houses = await transitHouseUnitsFromPackage(transitLibrary, fallbackTemplates, fallbackSourceRows);
  const skyPlacements = await skyPlacementUnitsFromPackage();
  const aspects = transitLibrary.authoredCards
    .filter((card) => card.contentKey.startsWith("authored/transit-aspect/"))
    .filter(selectableTransitAspectCard)
    .map((card) => authoredUnit(card, "aspect"));
  const compat = moonCompatibilityLibrary.map((record) => {
    const layout = surfaceLayouts.compat;

    return {
      key: `compat.moon.${record.reader_moon.toLowerCase()}.${record.other_moon.toLowerCase()}`,
      surface: "compat",
      sourcePackage: "moon-moon-matching-library-v1",
      version: "author-final",
      declaredSlots: [
        ...layout.requiredSlots,
        ...layout.optionalSlots.filter((slot) => typeof record[slot] === "string" && record[slot].trim())
      ],
      fields: {
        tag: record.tag,
        tldr: record.tldr,
        body: record.text
      }
    };
  });
  const weekly = weeklyRows
    .filter((record) => ["approved", "approved_reuse", "reviewed"].includes(record.review_status))
    .map((record) => {
      const body = record.contentKey.startsWith("authored/week-opener/")
        ? record.body.replaceAll("{{signTitle}}", "Leo")
        : record.body;
      let headline = record.headline;
      if (!headline && record.contentKey.startsWith("authored/weekly-transit-aspect/")) {
        const [, , transiting, , , natal, aspect] = record.contentKey.split("/");
        const title = (value) => value.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
        const relation = { conjunction: "conjunct", opposition: "opposite", square: "square", trine: "trine", sextile: "sextile" }[aspect];
        // weeklyHoroscope.renderContact supplies this calculated label when the
        // authored row deliberately has no title. Its body remains verbatim.
        headline = `${title(transiting)} ${relation} your ${title(natal)}`;
      }

      return {
        key: record.contentKey.replaceAll("/", "."),
        surface: "daily",
        sourcePackage: "tldrastro-fallback-architecture-v3",
        version: "author-final",
        declaredSlots: ["headline", "body"],
        fields: {
          headline,
          body
        }
      };
    });
  const lunationMacros = lunationBlendRows.authoredCards
    .filter((record) => ["approved", "approved_reuse", "reviewed"].includes(record.review_status))
    .map((record) => authoredUnit(record, "daily"));
  return [...houses, ...aspects, ...compat, ...skyPlacements, ...weekly, ...lunationMacros];
}
