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

function skyDoDontParagraphs(value) {
  if (!value) return [];
  const list = (label, items) => {
    const cleanItems = Array.isArray(items) ? items.map(String).map((item) => item.trim()).filter(Boolean) : [];
    return cleanItems.length > 0 ? `${label}: ${cleanItems.join("; ")}.` : "";
  };

  return [list("Do", value.do), list("Don't", value.dont)].filter(Boolean);
}

function skyAuthoredUnit(article) {
  const layout = surfaceLayouts.daily;
  const sections = article.sections ?? {};
  const sectionOrder = article.type === "retrograde"
    ? ["s1_header", "s1", "s2_header", "s2", "s3_header", "s3", "s4_header", "s4", "handoff"]
    : ["opening", "mechanics", "lived", "shadow", "truth", "collective", "directive", "handoff"];
  const bodyParts = sectionOrder
    .map((slot) => typeof sections[slot] === "string" ? sections[slot].trim() : "")
    .filter(Boolean);

  if (Array.isArray(sections.walkthrough_authored_beats)) {
    bodyParts.push(...sections.walkthrough_authored_beats.map((beat) => String(beat?.text ?? "").trim()).filter(Boolean));
  }

  bodyParts.push(...skyDoDontParagraphs({ do: sections.do, dont: sections.dont }));

  const headline = article.key
    .replace(/^sky\./, "")
    .replace(/\.rx$/, "")
    .split(".")
    .map((part) => part.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))
    .join(" in ");
  const tldr = typeof article.header?.tldr === "string" ? article.header.tldr : "";

  return {
    key: article.key,
    surface: "daily",
    sourcePackage: "sky-writing-v1",
    version: article.version ?? "author-final",
    declaredSlots: [
      ...layout.requiredSlots,
      ...layout.optionalSlots.filter((slot) => slot === "tldr" && tldr.trim())
    ],
    fields: {
      headline,
      tldr,
      body: bodyParts.join("\n\n")
    }
  };
}

function skyFallbackUnits(atoms, signColors, authoredKeys) {
  const planets = Object.keys(atoms.planetFunctions ?? {});
  const signs = Object.keys(atoms.signMechanics ?? {});

  return planets.flatMap((planet) => signs.flatMap((sign) => {
    const modes = [`${planet}.direct`, `${planet}.retrograde`].filter((mode) => atoms.doDont?.[mode]);

    return modes.flatMap((mode) => {
      const motion = mode.endsWith(".retrograde") ? "rx" : "";
      const key = ["sky", planet, sign, motion].filter(Boolean).join(".");
      if (authoredKeys.has(key)) return [];

      const collective = atoms.collectiveFrames?.[planet] && atoms.signSubjects?.[sign]
        ? atoms.collectiveFrames[planet].replace(/\[SIGN SUBJECTS\]/g, atoms.signSubjects[sign])
        : "";
      const body = [
        atoms.planetFunctions?.[planet],
        signColors[`${planet}.${sign}`],
        atoms.signMechanics?.[sign],
        collective,
        ...skyDoDontParagraphs(atoms.doDont?.[mode])
      ].map((part) => String(part ?? "").trim()).filter(Boolean).join("\n\n");

      return [{
        key,
        surface: "daily",
        sourcePackage: "sky-writing-v1",
        version: "author-final",
        declaredSlots: [...surfaceLayouts.daily.requiredSlots],
        fields: {
          headline: `${planet} in ${sign}${motion ? " retrograde" : ""}`,
          body
        }
      }];
    });
  }));
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
  const skyArticles = readJson(
    "apps/web/src/content/sky-writing/sky-articles-authored-v1.json"
  );
  const skyAtoms = readJson(
    "apps/web/src/content/sky-writing/fallback-atoms-v1.json"
  );
  const skySignColors = readJson(
    "apps/web/src/content/sky-writing/sign-colors-v1.json"
  );

  const houses = await transitHouseUnitsFromPackage(transitLibrary, fallbackTemplates, fallbackSourceRows);
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
  const skyAuthored = skyArticles.map(skyAuthoredUnit);
  const skyFallback = skyFallbackUnits(skyAtoms, skySignColors, new Set(skyAuthored.map((unit) => unit.key)));

  return [...houses, ...aspects, ...compat, ...skyAuthored, ...skyFallback];
}
