#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = (process.env.PWD ? path.resolve(process.env.PWD) : process.cwd())
  .replace(/^\/Users\/mprez\/Code\//, "/Users/mprez/code/");
const sourcePath = path.join(repoRoot, "scripts/content-source/normalized-sky-source-records.json");
const outputPath = process.env.TLDR_SKY_SNAPSHOT_OUTPUT_PATH
  ? path.resolve(process.env.TLDR_SKY_SNAPSHOT_OUTPUT_PATH)
  : path.join(repoRoot, "apps/web/src/content/skyContentSnapshot.json");
const coverageOutputPath = process.env.TLDR_SKY_COVERAGE_OUTPUT_PATH
  ? path.resolve(process.env.TLDR_SKY_COVERAGE_OUTPUT_PATH)
  : path.join(repoRoot, "scripts/generated/normalized-sky-coverage.json");
const ORIGINAL_PACKAGE_TEMPLATE_VERSION = "final-source-grounded-templates:2026-07-13";
const SOURCE_GROUNDED_SNAPSHOT_TYPE = "source-grounded-generated-snapshot";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function slug(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function modulePart(value) {
  const part = slug(value);

  if (part === "true-node" || part === "north-node") return "north_node";
  if (part === "south-node") return "south_node";
  return part.replace(/-/g, "_");
}

function titleFromSlug(value) {
  return String(value ?? "")
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function planetActionPhrase(planet, fallback) {
  const actions = {
    Sun: "direction and confidence",
    Moon: "instinct and response",
    Mercury: "messages, plans, and decisions",
    Venus: "desire, value, and attachment",
    Mars: "heat, courage, and action",
    Jupiter: "belief, appetite, and opportunity",
    Saturn: "limits, timing, and responsibility",
    Uranus: "change, disruption, and invention",
    Neptune: "longing, sensitivity, and uncertainty",
    Pluto: "pressure, honesty, and power",
    Chiron: "tenderness, repair, and practical wisdom",
    "North Node": "growth, appetite, and direction"
  };

  return actions[planet] ?? fallback ?? `${planet.toLowerCase()} patterns`;
}

const planetLivedFunction = {
  Sun: "direction and confidence when it is time to be seen",
  Moon: "the instinct to restore safety when something feels personal",
  Mercury: "the way a thought becomes a message, plan, or decision",
  Venus: "desire and attachment where connection asks for a real agreement",
  Mars: "anger and courage at the moment action has to start",
  Jupiter: "faith and appetite where life asks for a wider view",
  Saturn: "responsibility and the skill that comes from staying with what is hard",
  Uranus: "the need to break a pattern that has gone rigid",
  Neptune: "longing and sensitivity where certainty starts to soften",
  Pluto: "pressure and honesty where nothing can stay superficial",
  Chiron: "tenderness where old pain becomes practical wisdom",
  "North Node": "growth where the next risk asks for more courage"
};

const signMethod = {
  Aries: "by acting before the room has finished deciding",
  Taurus: "by protecting what is steady enough to return to",
  Gemini: "by asking another question before the story hardens into certainty",
  Cancer: "by tracking memory and the emotional cost of a decision",
  Leo: "by letting warmth and creative risk become visible",
  Virgo: "by noticing what is not working and making the next practical adjustment",
  Libra: "by weighing fairness against the effect a choice has on another person",
  Scorpio: "by staying with what is intense enough to require honesty",
  Sagittarius: "by testing the story against experience and the need for a wider horizon",
  Capricorn: "by respecting time, consequence, and the structure that can hold the work",
  Aquarius: "by thinking independently and questioning a rule everyone else has stopped noticing",
  Pisces: "by listening for what is compassionate or hard to name"
};

function sentenceClause(value) {
  return String(value ?? "")
    .replace(/,\s*and\s+/g, " and ")
    .replace(/,\s*/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

function startSentence(value) {
  const text = String(value ?? "").trim();

  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function interpolate(source, slots) {
  return String(source ?? "").replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (_, key) => {
    return Object.prototype.hasOwnProperty.call(slots, key) ? String(slots[key] ?? "") : "";
  });
}

function assertNoSlots(value, key) {
  if (/\{\{[^}]+\}\}/.test(String(value ?? ""))) {
    throw new Error(`Unresolved slot in ${key}: ${value}`);
  }
}

const bannedPatterns = [
  /\bnot\b[^.?!]{0,60}\bbut\b[^.?!]{0,120}\bnot\b[^.?!]{0,60}\bbut\b/i,
  /\b(childhood|family trauma|abuse|addiction|illness)\b/i,
  /\b(nervous system|self-erasure|old version of you)\b/i,
  /\b\w+,\s*\w+,\s*\w+,\s*(?:and\s*)?\w+\b/i
];

function validateReaderCopy(text, key) {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    throw new Error(`Empty generated copy for ${key}.`);
  }

  for (const pattern of bannedPatterns) {
    if (pattern.test(normalized)) {
      throw new Error(`Generated copy for ${key} failed validator ${pattern}: ${normalized}`);
    }
  }

  const paragraphs = normalized.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const seen = new Set();

  for (const paragraph of paragraphs) {
    const comparable = paragraph.toLowerCase();
    if (seen.has(comparable)) {
      throw new Error(`Repeated paragraph in ${key}.`);
    }
    seen.add(comparable);
  }
}

function sourceKeysFor(...parts) {
  return parts.flat().filter(Boolean);
}

function skyPlacementClauses(planet, sign) {
  const key = `${planet}.${sign}`;
  const currentFunction = planetLivedFunction[planet] ?? planetActionPhrase(planet);
  const currentMethod = signMethod[sign] ?? `through ${sign}`;
  const specific = {
    "Venus.Virgo": {
      compactSkyBehaviorClause: "sorts desire through what is workable enough to repair",
      skyShiftClause: "putting more attention on the details that decide whether ease can actually last",
      collectiveBehaviorClause: "Preference may become less abstract when the real terms of care and effort have to be named plainly",
      recognizableSituationClause: "A small mismatch in effort, taste, or expectation can reveal what needs adjustment before resentment gathers.",
      currentChoiceClause: "Make the repair specific enough that everyone knows what has changed."
    },
    "Mars.Gemini": {
      compactSkyBehaviorClause: "speeds up the argument or errand that needs a clearer channel",
      skyShiftClause: "putting more heat into the words and unfinished threads already in the room",
      collectiveBehaviorClause: "Action may scatter when too many questions compete for the same attention",
      recognizableSituationClause: "A conversation can become the place where impatience, curiosity, and conflict all try to drive at once.",
      currentChoiceClause: "Choose the message that actually needs to be sent before chasing the next one."
    },
    "Jupiter.Leo": {
      compactSkyBehaviorClause: "amplifies confidence where creative risk wants a warmer reception",
      skyShiftClause: "putting more room around confidence and the desire to make something visible",
      collectiveBehaviorClause: "A bigger promise may need enough sincerity and craft to hold the attention it asks for",
      recognizableSituationClause: "A public choice can reveal where hope is asking for more scale than the plan can yet hold.",
      currentChoiceClause: "Let the generous move stay honest about what it can actually sustain."
    },
    "Saturn.Aries": {
      compactSkyBehaviorClause: "tests whether courage can become disciplined enough to begin well",
      skyShiftClause: "Putting pressure on first moves and the responsibility of acting before certainty arrives",
      collectiveBehaviorClause: "Initiative may need a stronger container before speed becomes useful",
      recognizableSituationClause: "A rushed start can show where patience is part of the action rather than a refusal to act.",
      currentChoiceClause: "Build the first step carefully enough that it can carry the next one."
    },
    "Uranus.Gemini": {
      compactSkyBehaviorClause: "disrupts stale messages and the assumptions that travel with them",
      skyShiftClause: "putting more voltage into language and the systems people use to connect",
      collectiveBehaviorClause: "Information can reroute quickly when a familiar explanation stops working",
      recognizableSituationClause: "A surprising message, technical shift, or change in the conversation can break open a different path.",
      currentChoiceClause: "Leave room for the useful interruption without making every disruption the new rule."
    },
    "Sun.Cancer": {
      compactSkyBehaviorClause: "draws attention to belonging and the cost of protection",
      skyShiftClause: "putting more attention on what people protect and how they react when something feels personal",
      collectiveBehaviorClause: "Decisions may be shaped by loyalty, family pressure, or the need to defend what already feels familiar",
      recognizableSituationClause: "A home matter, old memory, or protective reflex can carry more force than the immediate issue deserves.",
      currentChoiceClause: "Check what actually needs care before answering from habit."
    }
  };

  return specific[key] ?? {
    compactSkyBehaviorClause: `puts attention on ${currentFunction} ${currentMethod}`,
    skyShiftClause: `putting more attention on ${currentFunction} ${currentMethod}`,
    collectiveBehaviorClause: `${sign} changes how ${currentFunction} moves through the moment, so the next response may need to be more specific`,
    recognizableSituationClause: "You might notice this in a conversation, plan, or responsibility that needs a clearer next step.",
    currentChoiceClause: "Choose one practical response before giving the situation more energy."
  };
}

function templateIdFor(record) {
  if (record.templateId) return record.templateId;
  if (record.family === "retrograde-stage") {
    return record.slots?.phase ? `retrograde-phase.${record.slots.phase}` : "retrograde-stage";
  }
  return record.family;
}

const aspectBodyOrder = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "chiron",
  "north_node"
];

function aspectCanonical(first, aspect, second) {
  const parts = [modulePart(first), modulePart(second)].sort((left, right) => {
    const leftIndex = aspectBodyOrder.indexOf(left);
    const rightIndex = aspectBodyOrder.indexOf(right);

    if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
    if (leftIndex >= 0) return -1;
    if (rightIndex >= 0) return 1;
    return left.localeCompare(right);
  });
  const ordered = parts;
  return `sky.aspect.${ordered[0]}.${modulePart(aspect)}.${ordered[1]}`;
}

function aspectAliases(first, aspect, second, canonicalKey) {
  return Array.from(new Set([
    `sky.aspect.${modulePart(second)}.${modulePart(aspect)}.${modulePart(first)}`,
    `sky-${slug(first)}-${slug(aspect)}-${slug(second)}`,
    `sky-${slug(second)}-${slug(aspect)}-${slug(first)}`,
    `${slug(first)}-${slug(aspect)}-${slug(second)}`,
    `${slug(second)}-${slug(aspect)}-${slug(first)}`,
    canonicalKey === "sky.aspect.sun.conjunction.mercury" ? "fallback-hook/sky.aspect-detail/conjunction/card" : "",
    canonicalKey === "sky.aspect.sun.conjunction.mercury" ? "fallback-hook/sky.aspect-detail/conjunction/feed" : "",
    canonicalKey === "sky.aspect.sun.conjunction.mercury" ? "fallback-hook/sky.aspect-detail/conjunction/expanded" : ""
  ].filter(Boolean)));
}

function makeRow(record) {
  const compact = interpolate(record.templates.compact, record.slots);
  const expanded = interpolate(record.templates.expanded, record.slots);
  const templateId = templateIdFor(record);

  assertNoSlots(compact, `${record.canonicalKey}.compact`);
  assertNoSlots(expanded, `${record.canonicalKey}.expanded`);
  validateReaderCopy(compact, `${record.canonicalKey}.compact`);
  validateReaderCopy(expanded, `${record.canonicalKey}.expanded`);

  return {
    id: `local-normalized:${record.canonicalKey}`,
    contentKey: record.canonicalKey,
    aliases: record.aliases ?? [],
    surface: record.surface ?? "sky",
    mode: record.mode ?? "feed",
    eventType: record.family,
    targetDate: null,
    headline: record.slots.headline ?? null,
    summary: compact,
    body: expanded,
    sections: {
      preview: compact,
      templateId,
      templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
      templateVariants: ["compact", "expanded"],
      slots: record.slots,
      sourceKeys: record.sourceKeys ?? [],
      validation: record.validation ?? {}
    },
    blockType: record.blockType ?? null,
    provider: "local-normalized-dashboard-source",
    sourceSnapshot: {
      contentType: SOURCE_GROUNDED_SNAPSHOT_TYPE,
      sourceType: SOURCE_GROUNDED_SNAPSHOT_TYPE,
      family: record.family,
      canonicalKey: record.canonicalKey,
      sourceRecordId: record.canonicalKey,
      templateId,
      templateVersion: ORIGINAL_PACKAGE_TEMPLATE_VERSION,
      templateVariants: ["compact", "expanded"],
      sourceKeys: record.sourceKeys ?? [],
      factPolicy: "Calculated astrology facts are supplied by immutable AstrologyFact objects and are not supplied or overridden by this prose row.",
      validation: record.validation ?? {},
      revision: {
        sourceType: SOURCE_GROUNDED_SNAPSHOT_TYPE,
        updatedBy: "codex",
        note: record.note ?? "Generated from normalized package source records through the original source-grounded template contract."
      }
    },
    model: "deterministic-normalized-snapshot-v2",
    updatedAt: new Date(0).toISOString()
  };
}

function addRecord(records, record) {
  records.push(record);
}

const source = readJson(sourcePath);
const supported = source.supported ?? {};
const templates = source.templates ?? {};
const banks = source.clauseBanks ?? {};
const overrides = source.overrides ?? {};
const planets = supported.planets ?? [];
const signs = supported.signs ?? [];
const aspects = supported.aspects ?? [];
const records = [];

for (const planet of planets) {
  for (const sign of signs) {
    const canonicalKey = `sky.placement.${modulePart(planet)}.${modulePart(sign)}`;
    const override = overrides[canonicalKey] ?? {};
    const clauses = skyPlacementClauses(planet, sign);
    const slots = {
      planet,
      sign,
      headline: `${planet} is in ${sign}`,
      ...clauses,
      skyShiftClause: startSentence(clauses.skyShiftClause),
      ...override
    };

    addRecord(records, {
      canonicalKey,
      family: "current-sky-placement",
      templateId: "current-sky-placement",
      templates: templates["current-sky-placement"],
      slots,
      aliases: [`fallback-hook/sky.planetary-placement/${slug(planet)}/${slug(sign)}`, `sky-${slug(planet)}-in-${slug(sign)}`, `${slug(planet)}-in-${slug(sign)}`],
      sourceKeys: sourceKeysFor(`cc/sign/${slug(sign)}/lived-behaviors`, `cc/planet/${slug(planet)}/function`, `cc/planet-in-sign/${slug(planet)}-${slug(sign)}`),
      validation: { readerSafe: true, genericFallbackBlocked: true, previewRequired: true },
      blockType: "sign"
    });
  }
}

for (let firstIndex = 0; firstIndex < planets.length; firstIndex += 1) {
  for (let secondIndex = firstIndex + 1; secondIndex < planets.length; secondIndex += 1) {
    const planetA = planets[firstIndex];
    const planetB = planets[secondIndex];

    for (const aspect of aspects) {
      const canonicalKey = aspectCanonical(planetA, aspect, planetB);
      const aspectBank = banks.aspectBehavior?.[aspect] ?? {};
      const override = overrides[canonicalKey] ?? {};
      const firstFunction = planetLivedFunction[planetA] ?? planetActionPhrase(planetA);
      const secondFunction = planetLivedFunction[planetB] ?? planetActionPhrase(planetB);
      const slots = {
        planetA,
        planetB,
        aspect,
        headline: `${planetA} ${aspect} ${planetB}`,
        aspectVerb: aspectBank.verb ?? aspect,
        compactAspectBehaviorClause: `${firstFunction} meets ${secondFunction} in one active sky pattern`,
        aspectBehaviorClause: `${planetA} and ${planetB} are asking for a response to the same moment from different angles`,
        recognizableSituationClause: `A plan, message, or decision may need more than one kind of attention before it can move cleanly.`,
        constructiveUseClause: `${startSentence(aspectBank.constructive ?? "Keep the response specific to what is happening")}.`,
        timingClause: "Use this while the aspect is active and close by orb.",
        ...override
      };

      addRecord(records, {
        canonicalKey,
        family: "current-sky-aspect",
        templates: templates["current-sky-aspect"],
        slots,
        aliases: aspectAliases(planetA, aspect, planetB, canonicalKey),
        sourceKeys: sourceKeysFor(`cc/aspect/${slug(aspect)}`, `cc/aspect-pair/${slug(planetA)}-${slug(planetB)}`, `cc/planet/${slug(planetA)}/function`, `cc/planet/${slug(planetB)}/function`),
        validation: { readerSafe: true, genericFallbackBlocked: true, previewRequired: true },
        blockType: "sky_aspect",
        mode: "in_depth"
      });
    }
  }
}

for (const planet of planets) {
  for (const sign of signs) {
    const planetFunction = banks.planetFunction?.[planet] ?? `${planet.toLowerCase()} matters`;
    const planetAction = planetActionPhrase(planet, planetFunction);
    const signBehavior = sentenceClause(banks.signBehavior?.[sign] ?? `${sign.toLowerCase()} behavior becomes visible`);
    const currentFunction = planetLivedFunction[planet] ?? planetAction;
    const currentMethod = signMethod[sign] ?? `through ${sign}`;
    addRecord(records, {
      canonicalKey: `sky.ingress.${modulePart(planet)}.${modulePart(sign)}`,
      family: "ingress",
      templates: templates.ingress,
      slots: {
        planet,
        sign,
        headline: `${planet} enters ${sign}`,
        newModeClause: `${currentFunction} starts operating ${currentMethod}`,
        collectiveIngressSituation: `${sign} changes how the current pattern moves through the moment, so the next response may need to be more specific.`,
        timingClause: "Read this as a change of sign, then let exact aspects and natal contacts modify the event"
      },
      aliases: [`fallback-hook/sky.ingress/${slug(planet)}/${slug(sign)}`],
      sourceKeys: sourceKeysFor(`cc/sign/${slug(sign)}/lived-behaviors`, `cc/planet/${slug(planet)}/function`),
      validation: { readerSafe: true, previewRequired: true },
      blockType: "ingress"
    });
  }
}

for (const planet of supported.retrogradePlanets ?? []) {
  for (const sign of signs) {
    const clause = source.retrogradeClauses?.[planet]?.[sign] ?? {
      planetSpecificFunction: `${planet} reviews ${planetActionPhrase(planet)} while it is retrograde.`,
      phaseBehaviorClause: `In ${sign}, the review moves through ${sentenceClause(banks.signBehavior?.[sign] ?? `${sign.toLowerCase()} circumstances`)}.`,
      recognizableInterruptionClause: "A plan or message may ask for a second look.",
      returningMatterClause: "Something from the first pass may return for revision rather than a brand-new answer.",
      practicalResponseClause: "Confirm the facts and keep the next step concrete.",
      dateClause: "Use the calculated retrograde event dates."
    };

    for (const phase of source.retrogradeClauseContracts?.phases ?? []) {
      const phaseTemplates = templates["retrograde-phase"]?.[phase] ?? templates["retrograde-stage"];
      addRecord(records, {
        canonicalKey: `sky.retrograde.${modulePart(planet)}.${modulePart(sign)}.${modulePart(phase)}`,
        family: "retrograde-stage",
        templates: phaseTemplates,
        slots: {
          planet,
          sign,
          phase,
          phaseLabel: phase === "retrograde-passage" ? "retrograde" : titleFromSlug(phase).toLowerCase(),
          headline: `${planet} ${titleFromSlug(phase)} in ${sign}`,
          ...clause
        },
        aliases: [
          `fallback-hook/sky.retrograde/${slug(planet)}/${slug(sign)}/${slug(phase)}`
        ],
        sourceKeys: sourceKeysFor(`ms/retrograde/${slug(planet)}`, `cc/sign/${slug(sign)}/lived-behaviors`, `cc/planet/${slug(planet)}/function`),
        validation: { readerSafe: true, structuredClausesRequired: true, phaseRequired: true },
        blockType: "retrograde",
        mode: "in_depth"
      });
    }

    for (const stationDirection of ["retrograde", "direct"]) {
      addRecord(records, {
        canonicalKey: `sky.station.${modulePart(planet)}.${modulePart(sign)}.${stationDirection}`,
        family: "station",
        templates: templates.station,
        slots: {
          planet,
          sign,
          stationDirection,
          headline: `${planet} stations ${stationDirection} in ${sign}`,
          ...clause,
          phaseBehaviorClause: stationDirection === "retrograde"
            ? `The review starts to concentrate through ${sign} circumstances.`
            : `The review starts to release, but ${sign} choices still need careful re-entry.`
        },
        aliases: [],
        sourceKeys: sourceKeysFor(`ms/retrograde/${slug(planet)}`, `cc/sign/${slug(sign)}/lived-behaviors`),
        validation: { readerSafe: true, structuredClausesRequired: true, phaseRequired: true },
        blockType: "station"
      });
    }
  }
}

for (const lunation of supported.lunations ?? []) {
  for (const sign of signs) {
    const focus = banks.lunation?.[lunation] ?? "a lunar timing pattern";
    addRecord(records, {
      canonicalKey: `sky.lunation.${modulePart(lunation)}.${modulePart(sign)}`,
      family: "lunation",
      templates: templates.lunation,
      slots: {
        lunation,
        sign,
        lunationLabel: titleFromSlug(lunation),
        headline: `${titleFromSlug(lunation)} in ${sign}`,
        compactLunationClause: `${focus} through ${sign.toLowerCase()} circumstances`,
        lunationFocusClause: `${focus} through ${sign.toLowerCase()} circumstances`,
        recognizableSituationClause: sentenceClause(banks.signBehavior?.[sign] ?? `${sign} patterns become visible`),
        practicalResponseClause: "Let the timing describe the moment before turning it into a permanent conclusion.",
        dateClause: "Use the calculated lunar date for the active event."
      },
      aliases: [`fallback-hook/sky.lunation/${slug(lunation)}/${slug(sign)}`],
      sourceKeys: sourceKeysFor(`cc/sign/${slug(sign)}/lived-behaviors`, `ms/lunation/${slug(lunation)}`),
      validation: { readerSafe: true, previewRequired: true },
      blockType: "lunation"
    });
  }
}

for (const angle of supported.angles ?? []) {
  for (const sign of signs) {
    addRecord(records, {
      canonicalKey: `natal.angle.${modulePart(angle)}.${modulePart(sign)}`,
      family: "angle-surface",
      surface: "natal",
      templates: templates["angle-surface"],
      slots: {
        angle,
        sign,
        headline: `${angle} in ${sign}`,
        angleCompactClause: `${sentenceClause(banks.angle?.[angle] ?? angle.toLowerCase())} through ${sign.toLowerCase()} circumstances`,
        angleBehaviorClause: `${sentenceClause(banks.angle?.[angle] ?? `${angle} becomes visible`)} through ${sign.toLowerCase()} circumstances.`,
        recognizableSituationClause: sentenceClause(banks.signBehavior?.[sign] ?? `${sign} behavior becomes visible`),
        practicalResponseClause: "Read this only when birth time is reliable enough to calculate angles."
      },
      aliases: [`fallback-hook/you.natal-angle-placement/${slug(angle)}/${slug(sign)}`],
      sourceKeys: sourceKeysFor(`cc/sign/${slug(sign)}/lived-behaviors`, `cc/angle/${slug(angle)}`),
      validation: { readerSafe: true, reliableBirthTimeRequired: true },
      blockType: "angle"
    });
  }
}

for (const daylight of supported.daylight ?? []) {
  addRecord(records, {
    canonicalKey: `sky.daylight.${modulePart(daylight)}`,
    family: "daylight",
    templates: templates.daylight,
    slots: {
      daylight,
      daylightLabel: titleFromSlug(daylight),
      headline: titleFromSlug(daylight),
      compactDaylightClause: sentenceClause(banks.daylight?.[daylight] ?? "local timing matters"),
      daylightBehaviorClause: sentenceClause(banks.daylight?.[daylight] ?? "a local timing marker"),
      recognizableSituationClause: "Use it as timing context, not a standalone personality claim.",
      practicalResponseClause: "Pair it with the calculated local time before showing it to the reader."
    },
    aliases: [`fallback-hook/sky.${slug(daylight)}`],
    sourceKeys: sourceKeysFor(`ms/daylight/${slug(daylight)}`),
    validation: { readerSafe: true, localTimeRequired: true },
    blockType: "daylight"
  });
}

const rows = records.map(makeRow);
const coverage = rows.reduce((acc, row) => {
  const family = row.sourceSnapshot.family;
  acc[family] ??= { READY: 0 };
  acc[family].READY += 1;
  return acc;
}, {});

const snapshot = {
  schema: "tldrastro-normalized-sky-snapshot-v2",
  generatedAt: new Date().toISOString(),
  source: path.relative(repoRoot, sourcePath),
  coverage,
  rows
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
fs.mkdirSync(path.dirname(coverageOutputPath), { recursive: true });
fs.writeFileSync(coverageOutputPath, `${JSON.stringify({ generatedAt: snapshot.generatedAt, coverage }, null, 2)}\n`);
console.log(`Generated ${path.relative(repoRoot, outputPath)} from ${path.relative(repoRoot, sourcePath)} (${rows.length} rows).`);
