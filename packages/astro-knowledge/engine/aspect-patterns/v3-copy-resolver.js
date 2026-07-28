"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const TEMPLATE_PATH = path.join(PACKAGE_ROOT, "aspect-pattern-templates-v3.7.md");
const TABLE_PATH = path.join(PACKAGE_ROOT, "aspect-pattern-tables-v1.md");
const SOURCE_ROWS_PATH = path.resolve(
  PACKAGE_ROOT,
  "../../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
);

const PATTERN_HEADINGS = Object.freeze({
  t_square: "T-SQUARE",
  grand_square: "GRAND CROSS",
  grand_trine: "GRAND TRINE",
  kite: "KITE",
  yod: "YOD",
  mystic_rectangle: "MYSTIC RECTANGLE"
});

const PATTERN_NAMES = Object.freeze({
  t_square: "T-square",
  grand_square: "Grand Cross",
  grand_trine: "Grand Trine",
  kite: "Kite",
  yod: "Yod",
  mystic_rectangle: "Mystic Rectangle"
});

const L1_SECTION_IDS = Object.freeze([
  "feel",
  "shows_up",
  "complicated",
  "another_response"
]);

const L2_SECTION_IDS = Object.freeze([
  "how_it_works",
  "planet_roles",
  "watch_for",
  "reference_point"
]);

const TOKEN_PATTERN = /\{([a-zA-Z_0-9]+)\.([a-zA-Z_0-9]+)\}/g;
const OUTER_PLANETS = new Set(["uranus", "neptune", "pluto"]);

const COMPACT_ROLE_GLOSSES = Object.freeze({
  sun: "how you shine",
  moon: "what feels safe",
  mercury: "how you communicate",
  venus: "what you value",
  mars: "how you push",
  jupiter: "what you believe",
  saturn: "what you answer to",
  uranus: "where you break form",
  neptune: "what you imagine",
  pluto: "where you transform",
  chiron: "where you heal"
});

const COMPACT_HOUSE_AREAS = Object.freeze({
  1: "identity",
  2: "money and worth",
  3: "communication",
  4: "home and family",
  5: "creativity",
  6: "daily work",
  7: "partnership",
  8: "shared money, obligations, and intimacy",
  9: "belief",
  10: "career and reputation",
  11: "community",
  12: "the inner life"
});

const DECISION_HOUSE_AREAS = Object.freeze({
  1: "your sense of self",
  2: "your financial security",
  3: "communication",
  4: "your home life",
  5: "your creative life",
  6: "your daily responsibilities",
  7: "your relationships",
  8: "shared money, obligations, and who holds power",
  9: "your beliefs",
  10: "your reputation",
  11: "your community",
  12: "your private life"
});

const DECISION_HOUSE_TESTS = Object.freeze({
  1: "when you act on it",
  2: "when the cost becomes real",
  3: "when you have to explain it",
  4: "at home",
  5: "when it becomes personal",
  6: "in daily practice",
  7: "when another person has a say",
  8: "in private",
  9: "when it is tested against what you believe",
  10: "in your career and public life",
  11: "when the group is involved",
  12: "when no one else can see it"
});

const COORDINATE_VERBS = new Set([
  "act", "answer", "believe", "bring", "build", "care", "carry", "change",
  "bother", "choose", "collect", "do", "explain", "feel", "find", "finish", "get",
  "give", "go", "handle", "have", "help", "hold", "keep", "lead", "learn",
  "listen", "look", "love", "make", "move", "need", "notice", "play", "process",
  "push", "question", "read", "remember", "run", "say", "see", "share", "show",
  "spot", "stay", "take", "talk", "think", "throw", "treat", "trust", "turn",
  "want", "work", "write"
]);

class AspectPatternV3SourceGapError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AspectPatternV3SourceGapError";
    this.details = details;
  }
}

const sourceRows = loadSourceRows();
const sourceIndex = buildSourceIndex(sourceRows);
const templates = parseTemplates(fs.readFileSync(TEMPLATE_PATH, "utf8"));
const tables = parseAuthoredTables(fs.readFileSync(TABLE_PATH, "utf8"));

function loadSourceRows() {
  try {
    // Keep this as a static require so serverless dependency tracing includes
    // the governed V3 source layer used by the app.
    return require("../../../../apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
  } catch (error) {
    throw new AspectPatternV3SourceGapError(
      `Canonical V3 source rows could not be loaded from ${SOURCE_ROWS_PATH}.`,
      { cause: error instanceof Error ? error.message : String(error) }
    );
  }
}

function buildSourceIndex(data) {
  const vocabulary = new Map();
  const hooks = new Map();

  for (const row of Array.isArray(data.vocabularyRows) ? data.vocabularyRows : []) {
    if (!eligibleSourceRow(row)) continue;
    vocabulary.set(row.contentKey, row);
  }
  for (const row of Array.isArray(data.hookRows) ? data.hookRows : []) {
    if (!eligibleSourceRow(row)) continue;
    hooks.set(row.contentKey, row);
  }

  return { vocabulary, hooks };
}

function eligibleSourceRow(row) {
  return Boolean(
    row
    && typeof row.contentKey === "string"
    && ["approved", "approved_reuse"].includes(row.review_status)
  );
}

function parseTemplates(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headingSet = new Set(Object.values(PATTERN_HEADINGS));
  const starts = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^## ([A-Z][A-Z -]+)$/);
    if (match && headingSet.has(match[1])) starts.push([match[1], index]);
  }

  const result = {};
  for (let index = 0; index < starts.length; index += 1) {
    const [heading, start] = starts[index];
    const end = starts[index + 1]?.[1] ?? lines.length;
    result[heading] = parsePatternBlock(lines.slice(start, end));
  }
  return result;
}

function parsePatternBlock(lines) {
  const pattern = {
    L1: { titles: {}, openings: {}, sections: {}, unknown: null },
    L2: { titles: {}, openings: {}, sections: {}, unknown: null },
    partial: { L1: null, L2: null },
    overrides: {}
  };
  let level = null;

  for (const line of lines) {
    if (line.startsWith("### Level 1")) {
      level = "L1";
      continue;
    }
    if (line.startsWith("### Level 2")) {
      level = "L2";
      continue;
    }
    if (line.startsWith("### Partial")) {
      level = "partial";
      continue;
    }

    if (level === "partial") {
      const match = line.match(/^(L[12]):\s*(.+)$/);
      if (match) pattern.partial[match[1]] = match[2].trim();
      continue;
    }
    if (level !== "L1" && level !== "L2") continue;

    if (line.startsWith("title ")) {
      parseTitleLine(line, pattern[level].titles);
      continue;
    }

    const opening = line.match(/^opening ([a-z_]+):\s*(.+)$/);
    if (opening) {
      pattern[level].openings[opening[1]] = opening[2].trim();
      continue;
    }

    const unknown = line.match(/^unknown_time L[12]:\s*(.+)$/);
    if (unknown) {
      pattern[level].unknown = unknown[1].trim();
      continue;
    }

    const override = line.match(/^OVERRIDE (out_of_sign)[^:]*:\s*(.+)$/);
    if (override) {
      pattern.overrides[override[1]] = override[2].trim();
      continue;
    }

    const section = line.match(/^([a-z_]+)(?:\s*\([^)]*\))?:\s*(.+)$/);
    if (section && [...L1_SECTION_IDS, ...L2_SECTION_IDS].includes(section[1])) {
      if (!section[2].trim().startsWith("(none")) {
        pattern[level].sections[section[1]] = section[2].trim();
      }
    }
  }

  return pattern;
}

function parseTitleLine(line, target) {
  for (const rawPart of line.split("|")) {
    const part = rawPart.trim();
    const match = part.match(/^(?:title )?(exact\/strong|wide|partial):\s*\*\*(.+)\*\*$/);
    if (!match) continue;
    if (match[1] === "exact/strong") {
      target.exact = match[2].trim();
      target.strong = match[2].trim();
    } else {
      target[match[1]] = match[2].trim();
    }
  }
}

function parseAuthoredTables(markdown) {
  return {
    focal: parseMarkdownTable(
      markdown,
      "focal-demand-by-planet",
      ["planet", "focal_demand", "focal_interruption"]
    ),
    patternNarrative: parseMarkdownTable(
      markdown,
      "pattern-narrative-by-planet",
      [
        "planet",
        "base_contribution",
        "lived_title",
        "lived_need",
        "incomplete_first_answer",
        "returning_lived_example"
      ]
    ),
    backgroundAnchor: parseMarkdownTable(
      markdown,
      "background-anchor-by-planet",
      ["planet", "background_anchor"]
    ),
    moonCondition: parseMarkdownTable(
      markdown,
      "moon-condition-by-sign",
      ["sign", "moon_condition"],
      "sign"
    )
  };
}

function parseMarkdownTable(markdown, heading, expectedColumns, keyColumn = "planet") {
  const headingMatch = markdown.match(new RegExp(`^## ${escapeRegex(heading)}[^\\n]*$`, "m"));
  if (!headingMatch || headingMatch.index === undefined) {
    throw new AspectPatternV3SourceGapError(`Missing authored table: ${heading}.`);
  }

  const afterHeading = markdown.slice(headingMatch.index + headingMatch[0].length);
  const remainingLines = afterHeading.split(/\r?\n/);
  const tableStart = remainingLines.findIndex((line) => line.trim().startsWith("|"));
  const tableLines = [];
  if (tableStart !== -1) {
    for (const line of remainingLines.slice(tableStart)) {
      if (!line.trim().startsWith("|")) break;
      tableLines.push(line);
    }
  }

  if (tableLines.length < 3) {
    throw new AspectPatternV3SourceGapError(`Authored table ${heading} is incomplete.`);
  }

  const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  const columns = cells(tableLines[0]);
  if (JSON.stringify(columns) !== JSON.stringify(expectedColumns)) {
    throw new AspectPatternV3SourceGapError(`Authored table ${heading} has unexpected columns.`);
  }

  const rows = new Map();
  for (const line of tableLines.slice(2)) {
    const values = cells(line);
    if (values.length !== columns.length) continue;
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    rows.set(normalizeToken(row[keyColumn]), row);
  }
  return rows;
}

function resolveAspectPatternV3Copy(context) {
  const heading = PATTERN_HEADINGS[context.patternType];
  const spec = templates[heading];
  if (!heading || !spec) {
    throw new AspectPatternV3SourceGapError(`No v3.7 template for ${context.patternType}.`);
  }

  const confidence = normalizeConfidence(context.geometry?.confidence);
  const hasHouses = context.members.some((member) => Number.isInteger(member.house));
  const roles = buildResolvedRoles(context, hasHouses);
  const skippedSections = [];
  const warnings = [];

  if (confidence === "partial") {
    const headline = renderRequired(spec.L1.titles.partial, roles, `${heading}/partial-title`);
    const overview = renderRequired(spec.partial.L1, roles, `${heading}/partial-L1`);
    const sections = [{
      id: "level_2",
      title: renderRequired(spec.L2.titles.partial, roles, `${heading}/partial-L2-title`),
      body: renderRequired(spec.partial.L2, roles, `${heading}/partial-L2`)
    }, readingNoteSection(context, confidence)];
    return makeResolvedCopy(context, headline, overview, sections, skippedSections, warnings, hasHouses);
  }

  const titleKey = confidence === "wide" ? "wide" : "exact";
  const openingKey = confidence === "wide" ? "wide" : "exact";
  const levelOneOpeningKey = confidence === "wide"
    ? "wide"
    : usesMoonDecisionSynthesis(context, roles, hasHouses)
      ? "moon_decision"
      : "exact";
  const headline = renderRequired(spec.L1.titles[titleKey], roles, `${heading}/${titleKey}-title`);
  const sections = [];
  let overview;

  if (!hasHouses) {
    overview = renderRequired(spec.L1.unknown, roles, `${heading}/unknown-L1`);
    sections.push({
      id: "level_2",
      title: renderRequired(spec.L2.titles[titleKey], roles, `${heading}/unknown-L2-title`),
      body: renderRequired(spec.L2.unknown, roles, `${heading}/unknown-L2`)
    });
  } else {
    overview = renderRequired(
      spec.L1.openings[levelOneOpeningKey],
      roles,
      `${heading}/${levelOneOpeningKey}-opening`
    );
    for (const sectionId of L1_SECTION_IDS) {
      const template = spec.L1.sections[sectionId];
      if (!template) continue;
      if (derivedSectionUnavailable(context, sectionId, hasHouses)) {
        skippedSections.push(sectionId);
        continue;
      }
      sections.push({
        id: sectionId,
        body: renderRequired(template, roles, `${heading}/${sectionId}`)
      });
    }

    sections.push({
      id: "level_2",
      title: renderRequired(spec.L2.titles[titleKey], roles, `${heading}/L2-${titleKey}-title`),
      body: renderRequired(spec.L2.openings[openingKey], roles, `${heading}/L2-${openingKey}-opening`)
    });

    for (const sectionId of L2_SECTION_IDS) {
      let template = spec.L2.sections[sectionId];
      if (sectionId === "how_it_works" && context.geometry?.warnings?.includes("out_of_sign_pattern")) {
        template = spec.overrides.out_of_sign || template;
      }
      if (!template) continue;
      if (derivedSectionUnavailable(context, sectionId, hasHouses)) {
        skippedSections.push(sectionId);
        continue;
      }
      sections.push({
        id: sectionId,
        body: renderRequired(template, roles, `${heading}/${sectionId}`)
      });
    }
  }

  sections.push(readingNoteSection(context, confidence));
  return makeResolvedCopy(context, headline, overview, sections, skippedSections, warnings, hasHouses);
}

function makeResolvedCopy(context, headline, overview, sections, skippedSections, warnings, hasHouses) {
  return {
    patternId: context.patternId,
    patternType: context.patternType,
    source: {
      recordId: `aspect-pattern-v3.7:${context.patternType}:${context.geometry.confidence}:${hasHouses ? "known" : "unknown"}`,
      contentLevel: "source_grounded_template",
      status: "approved",
      resolverVersion: "v3"
    },
    content: {
      eyebrow: PATTERN_NAMES[context.patternType],
      headline,
      overview,
      sections
    },
    diagnostics: {
      templateId: `aspect-pattern-templates-v3.7:${PATTERN_HEADINGS[context.patternType]}`,
      usedFallback: false,
      missingSlots: [],
      skippedSections: [...new Set(skippedSections)].sort(),
      validationWarnings: warnings
    }
  };
}

function readingNoteSection(context, confidence) {
  const sentence = {
    exact: "This is a close pattern in the chart.",
    strong: "This pattern is clear in the chart.",
    wide: "This is a wider pattern in the chart.",
    partial: "This is a partial pattern in the chart."
  }[confidence];
  const maximumOrb = formatNumber(context.geometry?.maximumOrb);
  return {
    id: "confidence_note",
    title: "Reading note",
    body: `${sentence} Its widest link is ${maximumOrb} ${Number(maximumOrb) === 1 ? "degree" : "degrees"}.`
  };
}

function usesMoonDecisionSynthesis(context, roles, hasHouses) {
  if (!hasHouses || context.patternType !== "yod" || roles.apex?.planet !== "Moon") {
    return false;
  }

  const baseMembers = context.members.filter((member) => context.roles.basePlanets.includes(member.planet));
  const pluto = baseMembers.find((member) => normalizeToken(member.planet) === "pluto");
  const neptune = baseMembers.find((member) => normalizeToken(member.planet) === "neptune");

  return pluto?.house === 8
    && neptune?.house === 10
    && Boolean(roles.apex.moon_condition);
}

function derivedSectionUnavailable(context, sectionId, hasHouses) {
  if (!["another_response", "reference_point"].includes(sectionId)) return false;
  if (context.patternType === "yod") {
    const point = derivedPoint(context, "fallout_point");
    return !point || (hasHouses && !Number.isInteger(point.house));
  }
  if (context.patternType === "t_square") {
    const point = derivedPoint(context, "empty_leg");
    return !point || (hasHouses && !Number.isInteger(point.house));
  }
  return false;
}

function buildResolvedRoles(context, hasHouses) {
  const members = context.members.slice();
  const byPlanet = new Map(members.map((member) => [member.planet, member]));
  const roles = {};
  const memberRole = (planet) => resolveMemberRole(byPlanet.get(planet), hasHouses);

  if (context.patternType === "t_square") {
    const [oppA, oppB] = sortPlanetsByLongitude(context.roles.oppositionAxis, byPlanet);
    roles.oppA = memberRole(oppA);
    roles.oppB = memberRole(oppB);
    roles.apex = memberRole(context.roles.apex);
    roles.ends = resolveMemberGroup([roles.oppA, roles.oppB], hasHouses);
    roles.empty_leg = resolvePointRole(
      context.roles.emptyLeg || derivedPoint(context, "empty_leg"),
      hasHouses
    );
  } else if (context.patternType === "grand_square") {
    const ordered = members.slice().sort(compareMemberLongitude);
    ordered.forEach((member, index) => {
      roles[`c${index + 1}`] = resolveMemberRole(member, hasHouses);
    });
    roles.corners = resolveMemberGroup(
      [roles.c1, roles.c2, roles.c3, roles.c4],
      hasHouses
    );
  } else if (context.patternType === "grand_trine") {
    const ordered = members.slice().sort(compareMemberLongitude);
    ordered.forEach((member, index) => {
      roles[`t${index + 1}`] = resolveMemberRole(member, hasHouses);
    });
    roles.trio = resolveMemberGroup([roles.t1, roles.t2, roles.t3], hasHouses);
  } else if (context.patternType === "kite") {
    const orderedTrine = sortPlanetsByLongitude(context.roles.grandTrinePlanets, byPlanet);
    orderedTrine.forEach((planet, index) => {
      roles[`t${index + 1}`] = memberRole(planet);
    });
    roles.trio = resolveMemberGroup([roles.t1, roles.t2, roles.t3], hasHouses);
    roles.focal = memberRole(context.roles.focalPlanet);
    roles.focal.opposes = titleToken(context.roles.opposedTrinePlanet);
    addFocalClauses(roles.focal, context.roles.focalPlanet);
  } else if (context.patternType === "yod") {
    const orderedBase = sortPlanetsByLongitude(context.roles.basePlanets, byPlanet);
    roles.base1 = memberRole(orderedBase[0]);
    roles.base2 = memberRole(orderedBase[1]);
    roles.bases = resolveMemberGroup([roles.base1, roles.base2], hasHouses);
    roles.apex = memberRole(context.roles.apex);
    roles.reference = resolvePointRole(
      context.roles.falloutPoint || derivedPoint(context, "fallout_point"),
      hasHouses
    );
    if (roles.reference) {
      roles.reference.area = roles.reference.house_area;
    }
  } else if (context.patternType === "mystic_rectangle") {
    const axes = orderedOppositionAxes(context.roles.oppositionAxes, byPlanet);
    const [axisA, axisB] = axes;
    roles.oa1 = memberRole(axisA[0]);
    roles.oa2 = memberRole(axisA[1]);
    roles.ob1 = memberRole(axisB[0]);
    roles.ob2 = memberRole(axisB[1]);
    roles.axisA = resolveMemberGroup([roles.oa1, roles.oa2], hasHouses);
    roles.axisB = resolveMemberGroup([roles.ob1, roles.ob2], hasHouses);
    roles.oppositionA = {
      ...roles.oa1,
      ...(hasHouses ? { area: oppositionArea(roles.oa1, roles.oa2, hasHouses) } : {})
    };
    roles.oppositionB = {
      ...roles.ob1,
      ...(hasHouses ? { area: oppositionArea(roles.ob1, roles.ob2, hasHouses) } : {})
    };
  }

  return roles;
}

function resolveMemberRole(member, hasHouses) {
  if (!member) {
    throw new AspectPatternV3SourceGapError("Pattern member could not be resolved.");
  }
  const planet = normalizeToken(member.planet);
  const sign = normalizeToken(member.sign);
  const planetTitle = titleToken(planet);
  const signTitle = titleToken(sign);
  vocabularyBody(`fallback-vocab/sign-style/${sign}`);
  const roleGloss = compactRoleGloss(planet);
  const signNeed = vocabularyBody(`fallback-vocab/sign-need/${sign}`);
  const placement = placementSentence(planet, sign);
  const houseArea = hasHouses && Number.isInteger(member.house)
    ? compactHouseArea(member.house)
    : null;
  const placementLead = firstSentence(placement);
  const concreteBehavior = placementBehavior(placementLead, signNeed);
  const shortBehavior = concreteBehavior.split(/[;,:]/)[0].trim();
  const narrative = tables.patternNarrative.get(planet);
  if (!narrative) {
    throw new AspectPatternV3SourceGapError(`Missing pattern narrative row for ${planet}.`);
  }

  const role = {
    planet: planetTitle,
    sign: signTitle,
    role_gloss: roleGloss,
    sign_need: signNeed,
    sign_behavior: shortBehavior,
    response_example: OUTER_PLANETS.has(planet)
      ? `Here, ${planetTitle} in ${signTitle} ${shortBehavior}.`
      : `In this part of life, you also need ${signNeed}.`,
    base_contribution: narrative.base_contribution,
    lived_title: narrative.lived_title,
    lived_need: narrative.lived_need,
    incomplete_first_answer: narrative.incomplete_first_answer,
    returning_lived_example: narrative.returning_lived_example
  };

  if (OUTER_PLANETS.has(planet)) {
    const background = tables.backgroundAnchor.get(planet);
    if (!background) {
      throw new AspectPatternV3SourceGapError(`Missing background-anchor row for ${planet}.`);
    }
    role.background_anchor = background.background_anchor;
    role.is_outer = true;
  }

  if (planet === "moon") {
    const moonCondition = tables.moonCondition.get(sign);
    if (!moonCondition?.moon_condition) {
      throw new AspectPatternV3SourceGapError(`Missing Moon-condition row for ${sign}.`);
    }
    role.moon_condition = moonCondition.moon_condition;
  }

  if (houseArea) {
    role.house_ordinal = ordinal(member.house);
    role.house_label = `the ${ordinal(member.house)} house of ${houseArea}`;
    role.house_area = houseArea;
    role.house_context = `around ${houseArea}`;
    role.decision_area = DECISION_HOUSE_AREAS[member.house];
    role.decision_test = DECISION_HOUSE_TESTS[member.house];
    role.sign_house_response = concreteBehavior;
  }
  return role;
}

function resolveMemberGroup(memberRoles, hasHouses) {
  const roles = memberRoles.filter(Boolean);
  if (roles.length === 0) {
    throw new AspectPatternV3SourceGapError("Pattern member group could not be resolved.");
  }

  const personal = roles.filter((role) => !role.is_outer);
  const outer = roles.filter((role) => role.is_outer);
  const sentences = personal.map((role) => {
    const placement = `Your ${role.planet} in ${role.sign} ${stripTerminalPunctuation(role.sign_behavior)}`;
    if (!hasHouses) {
      return `${placement}.`;
    }
    if (!role.house_ordinal || !role.house_area) {
      throw new AspectPatternV3SourceGapError(`Missing house label for ${role.planet} group introduction.`);
    }
    return `${placement}, and in the ${role.house_ordinal} house that plays out through ${role.house_area}.`;
  });

  if (outer.length > 0) {
    const names = joinWords(outer.map((role) => role.planet));
    const signs = joinWords(outer.map((role) => role.sign));
    const verb = outer.length === 1 ? "moves" : "move";
    const possessive = outer.length === 1 ? "its sign" : "their signs";
    const describe = outer.length === 1 ? "describes" : "describe";
    sentences.push(
      `${names} ${verb} slowly, so ${possessive}, ${signs}, ${describe} a generation before ${outer.length === 1 ? "it describes" : "they describe"} you alone.`
    );
    if (hasHouses) {
      const anchors = outer.map((role) => {
        if (!role.house_label || !role.background_anchor) {
          throw new AspectPatternV3SourceGapError(`Missing outer-planet group anchor for ${role.planet}.`);
        }
        return `${role.planet} anchors ${role.background_anchor} in ${role.house_label}`;
      });
      sentences.push(`In your chart, ${joinClauses(anchors)}.`);
    } else {
      const anchors = outer.map((role) => {
        if (!role.background_anchor) {
          throw new AspectPatternV3SourceGapError(`Missing outer-planet group anchor for ${role.planet}.`);
        }
        return `${role.planet} carries ${role.background_anchor}`;
      });
      sentences.push(`In this pattern, ${joinClauses(anchors)}.`);
    }
  }

  return {
    intro: sentences.join(" "),
    sign_list: joinWords(roles.map((role) => role.sign))
  };
}

function joinWords(values) {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function joinClauses(values) {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]}, while ${values[1]}`;
  return `${values.slice(0, -1).join("; ")}; and ${values.at(-1)}`;
}

function resolvePointRole(point, hasHouses) {
  if (!point || !point.sign) return null;
  const sign = normalizeToken(point.sign);
  const signNeed = vocabularyBody(`fallback-vocab/sign-need/${sign}`);
  const role = {
    planet: "",
    sign: titleToken(sign),
    balancing_move: `making room for ${signNeed}`,
    behavior: `making room for ${signNeed}`,
    sign_behavior: `moves toward ${signNeed}`
  };
  if (hasHouses && Number.isInteger(point.house)) {
    role.house_label = `the ${ordinal(point.house)} house`;
    role.house_area = compactHouseArea(point.house);
    role.house_context = `around ${role.house_area}`;
  }
  return role;
}

function addFocalClauses(role, planet) {
  const row = tables.focal.get(normalizeToken(planet));
  if (!row) throw new AspectPatternV3SourceGapError(`Missing focal-demand row for ${planet}.`);
  role.focal_demand = row.focal_demand;
  role.focal_interruption = row.focal_interruption;
}

function oppositionArea(first, second, hasHouses) {
  if (!hasHouses || !first?.house_area || !second?.house_area) {
    throw new AspectPatternV3SourceGapError("Known-time opposition area requires both house topics.");
  }
  return `${first.house_area} and ${second.house_area}`;
}

function renderRequired(template, roles, location) {
  if (!template) {
    throw new AspectPatternV3SourceGapError(`Missing template text at ${location}.`);
  }
  const missing = [];
  const rendered = template.replace(TOKEN_PATTERN, (_, prefix, field) => {
    const value = roles[prefix]?.[field];
    if (value === undefined || value === null || value === "") {
      missing.push(`${prefix}.${field}`);
      return `{${prefix}.${field}}`;
    }
    return String(value);
  });
  if (missing.length > 0 || /{[^}]+}/.test(rendered)) {
    throw new AspectPatternV3SourceGapError(
      `Required v3.7 clauses are missing at ${location}: ${[...new Set(missing)].join(", ")}.`,
      { location, missing: [...new Set(missing)] }
    );
  }
  return rendered;
}

function vocabularyBody(contentKey) {
  const body = sourceIndex.vocabulary.get(contentKey)?.body;
  if (typeof body !== "string" || !body.trim()) {
    throw new AspectPatternV3SourceGapError(`Missing approved V3 vocabulary row ${contentKey}.`);
  }
  return body.trim();
}

function placementSentence(planet, sign) {
  const contentKey = `fallback-hook/placement-sentence/${planet}/${sign}`;
  const body = sourceIndex.hooks.get(contentKey)?.body_you;
  if (typeof body !== "string" || !body.trim()) {
    throw new AspectPatternV3SourceGapError(`Missing approved V3 placement row ${contentKey}.`);
  }
  return body.trim();
}

function firstSentence(value) {
  return value.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || value.trim();
}

function compactRoleGloss(planet) {
  vocabularyBody(`fallback-vocab/planet-function/${planet}`);
  const gloss = COMPACT_ROLE_GLOSSES[planet];
  if (!gloss) {
    throw new AspectPatternV3SourceGapError(`Missing compact role gloss for ${planet}.`);
  }
  return gloss;
}

function compactHouseArea(house) {
  vocabularyBody(`fallback-vocab/house-topic/${house}`);
  const area = COMPACT_HOUSE_AREAS[house];
  if (!area) {
    throw new AspectPatternV3SourceGapError(`Missing compact house area for house ${house}.`);
  }
  return area;
}

function placementBehavior(value, signNeed) {
  const sentence = stripTerminalPunctuation(String(value || "").trim());
  const whenYou = sentence.match(/^When you\s+(.+?),\s*(.+)$/i);
  if (whenYou) return `responds when you ${whenYou[1]}: ${lowerInitial(whenYou[2])}`;

  const personalClause = /^You(?:'re|'ve|\s)/i.test(sentence)
    ? sentence
    : sentence.match(/[,;:]\s*(?:and\s+)?(you(?:'re|'ve|\s).+)$/i)?.[1];
  if (!personalClause) return fallbackSignBehavior(signNeed);
  return thirdPersonBehavior(personalClause);
}

function fallbackSignBehavior(signNeed) {
  const need = String(signNeed || "").trim();
  return /^to\s+/i.test(need) ? `leans ${need}` : `leans toward ${need}`;
}

function thirdPersonBehavior(value) {
  let clause = String(value || "").trim();
  clause = clause
    .replace(/\byourself\b/gi, "itself")
    .replace(/\byourselves\b/gi, "itself");

  clause = clause
    .replace(/^You(?:'re| are)\s+/i, "is ")
    .replace(/^You(?:'ve| have)\s+/i, "has ")
    .replace(/^You were\s+/i, "was ")
    .replace(/^You (?:do not|don't)\s+/i, "does not ")
    .replace(/^You can\s+([a-z]+)/i, (_, verb) => thirdPersonVerb(verb))
    .replace(
      /^You\s+(?:(personally|quietly|rarely|often|sometimes|usually|genuinely|fully|eventually)\s+)?([a-z]+)/i,
      (_, adverb, verb) => `${adverb && adverb.toLowerCase() !== "personally" ? `${adverb} ` : ""}${thirdPersonVerb(verb)}`
    );

  clause = clause.replace(
    /([,;]\s+(?:and\s+)?(?:(?:quietly|rarely|often|sometimes|usually|genuinely|fully|eventually)\s+)?)([a-z]+)\b/gi,
    (match, prefix, verb) => COORDINATE_VERBS.has(verb.toLowerCase())
      ? `${prefix}${thirdPersonVerb(verb)}`
      : match
  );
  clause = clause.replace(
    /(\band\s+(?:(?:quietly|rarely|often|sometimes|usually|genuinely|fully|eventually)\s+)?)([a-z]+)\b/gi,
    (match, prefix, verb) => COORDINATE_VERBS.has(verb.toLowerCase())
      ? `${prefix}${thirdPersonVerb(verb)}`
      : match
  );
  return clause;
}

function thirdPersonVerb(value) {
  const verb = String(value || "").toLowerCase();
  if (verb === "be") return "is";
  if (verb === "have") return "has";
  if (verb === "do") return "does";
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
  if (/(?:s|x|z|ch|sh|o)$/.test(verb)) return `${verb}es`;
  return `${verb}s`;
}

function orderedOppositionAxes(axes, byPlanet) {
  return (Array.isArray(axes) ? axes : [])
    .map((axis) => sortPlanetsByLongitude(axis, byPlanet))
    .sort((first, second) => memberLongitude(byPlanet.get(first[0])) - memberLongitude(byPlanet.get(second[0])));
}

function sortPlanetsByLongitude(planets, byPlanet) {
  return (Array.isArray(planets) ? planets.slice() : [])
    .sort((first, second) => {
      return memberLongitude(byPlanet.get(first)) - memberLongitude(byPlanet.get(second))
        || String(first).localeCompare(String(second));
    });
}

function compareMemberLongitude(first, second) {
  return memberLongitude(first) - memberLongitude(second)
    || String(first.planet).localeCompare(String(second.planet));
}

function memberLongitude(member) {
  return typeof member?.longitude === "number" ? member.longitude : Number.MAX_SAFE_INTEGER;
}

function derivedPoint(context, type) {
  return context.derivedPoints?.find((point) => point.type === type) || null;
}

function normalizeConfidence(value) {
  return ["exact", "strong", "wide", "partial"].includes(value) ? value : "wide";
}

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase().replaceAll(" ", "-").replaceAll("_", "-");
}

function titleToken(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function lowerInitial(value) {
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function stripTerminalPunctuation(value) {
  return String(value || "").replace(/[.!?]+$/, "");
}

function ordinal(value) {
  const number = Number(value);
  const suffix = number % 10 === 1 && number % 100 !== 11
    ? "st"
    : number % 10 === 2 && number % 100 !== 12
      ? "nd"
      : number % 10 === 3 && number % 100 !== 13
        ? "rd"
        : "th";
  return `${number}${suffix}`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "unknown";
  return number.toFixed(number % 1 === 0 ? 0 : 1);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  AspectPatternV3SourceGapError,
  resolveAspectPatternV3Copy
};
