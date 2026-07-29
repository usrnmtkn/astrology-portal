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
  let body = card.body_you ?? card.body;
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

async function skyPlacementUnitsFromPackage(transitLibrary, templates, sourceRows) {
  const { createTransitSynastryRenderer } = await import(
    "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js"
  );
  const renderer = createTransitSynastryRenderer(transitLibrary, templates, sourceRows);
  const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

  return planets.flatMap((planet) => signs.map((sign) => {
    const rendered = renderer.renderSkyPlacement({ planet, sign });

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
  const moonCompatibilityLibrary = readJson(
    "tldr-astro-phrasebank/phrasebank/moon-compatibility-library.json"
  );
  const houses = await transitHouseUnitsFromPackage(transitLibrary, fallbackTemplates, fallbackSourceRows);
  const skyPlacements = await skyPlacementUnitsFromPackage(transitLibrary, fallbackTemplates, fallbackSourceRows);
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
  return [...houses, ...aspects, ...compat, ...skyPlacements];
}
