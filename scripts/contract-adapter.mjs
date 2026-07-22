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
  }
};

function authoredUnit(card, surface) {
  const layout = surfaceLayouts[surface];

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
      body: card.body
    }
  };
}

export default async function loadUnits() {
  const houseTransitUnits = readJson(
    "apps/web/src/content/fallbackArchitectureV3/source-rows/house-transits-master-v2.json"
  );
  const transitLibrary = readJson(
    "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"
  );
  const moonCompatibilityLibrary = readJson(
    "tldr-astro-phrasebank/phrasebank/moon-compatibility-library.json"
  );

  const houses = houseTransitUnits.map((unit) => ({
    key: unit.key,
    surface: "house",
    sourcePackage: "house-transits-master-v2",
    version: "author-final",
    declaredSlots: [...surfaceLayouts.house.requiredSlots],
    fields: {
      headline: unit.headline,
      body: unit.body
    }
  }));
  const aspects = transitLibrary.authoredCards
    .filter((card) => card.contentKey.startsWith("authored/transit-aspect/"))
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

  return [...houses, ...aspects, ...compat];
}
