import { SKY_WRITING_LIBRARY_GROUPS } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyWritingLibraryRegistry.mjs";
import { ZODIAC_SEASON_VARIABLES, ZODIAC_SIGNS, zodiacSeasonSourceKey } from "../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { VARIABLE_PLANETS } from "../apps/web/src/content/studioCustomVariables.mjs";

export const SKY_WRITEUP_IMPORT_COLUMNS = Object.freeze([
  "key", "contentKey", "field", "scope", "body", "sign", "variable", "grammarFrame",
  "text", "importAction", "sourceStatus", "reviewStatus", "shareHost", "heldBackText", "notes"
]);

export const TRADITIONAL_DIGNITY_BODIES = Object.freeze([
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"
]);

export const PLANET_SHARE_SIGN = "aries";
export const SIGN_SHARE_PLANET = "sun";

const libraryFields = new Map(SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(field => [field.id, { ...field, group: group.id }])));

const GRAMMAR = Object.freeze({
  planetDescriptor: "noun_phrase",
  planetFunction: "noun_phrase",
  planetProductive: "complete_sentences",
  planetShadow: "complete_sentences",
  planetCollectiveExpression: "complete_sentences",
  planetLore: "complete_sentences",
  returnMeaning: "complete_sentences",
  astronomySummary: "complete_sentences",
  signDescriptor: "noun_phrase",
  signCoreDrive: "noun_phrase",
  signMethod: "noun_or_gerund_phrase",
  signGift: "noun_or_gerund_phrase",
  signShadow: "noun_phrase",
  signValues: "complete_sentences_or_phrase",
  zodiacSeason: "complete_sentences",
  zodiacSeasonPolarAxis: "complete_sentences",
  placementDignityMeaning: "complete_paragraph_or_empty",
  placementDignityMechanism: "independent_clause_no_period",
  placementDignityExpression: "verb_phrase",
  placementThesis: "complete_sentences",
  placementOpportunity: "complete_sentences",
  placementPressure: "complete_sentences",
  responseSentence: "complete_sentences",
  placementShadow: "complete_sentences",
  placementCorrection: "complete_sentences",
  placementPractice: "complete_sentences",
  placementCollectiveTheme: "complete_sentences",
  placementCollectiveShadow: "complete_sentences",
  experienceGeneral: "complete_sentences",
  openingHook: "complete_sentences",
  reflectionQuestion: "optional_question",
  closingLine: "complete_sentences",
  practiceClosingLine: "complete_sentences",
  tldrWhat: "complete_sentences",
  tldrTakeaway: "complete_sentences",
  placementArticle: "article_template"
});

// Planet, point, and sign names are proper nouns and may open a clause that follows "Here,".
const PROPER_NOUN_START = /^(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node|South Node|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/u;
const PHRASE_FIELDS = new Set(["noun_phrase", "noun_or_gerund_phrase", "verb_phrase", "independent_clause_no_period"]);
const ARTICLE_FIELDS = Object.freeze(["tldrWhat", "tldrTakeaway", "placementArticle"]);
const EMPTY_ON_PURPOSE = new Set(["placementDignityMeaning"]);
const NO_DIGNITY_EMPTY = new Set(["placementDignityMechanism", "placementDignityExpression"]);

const BANNED_SUBSTRINGS = Object.freeze([
  "welcome to",
  "this is about",
  "a version of you",
  "a version of yourself",
  "the version of you",
  "the next version of yourself",
  "you're allowed",
  "you are allowed",
  "you don't have to",
  "you do not have to",
  "here's your permission",
  "here is your permission",
  "asks you to",
  "asks us to",
  "season asks",
  "weather",
  "leverage"
]);

const BANNED_WORDS = Object.freeze([
  "journey", "embrace", "navigate", "cosmic", "universe", "alchemy", "portal",
  "liminal", "magick", "manifest", "unlock", "realm", "delve", "tapestry", "vibes",
  "reckoning"
]);

const ABSTRACT_BANS = Object.freeze(["comfort", "steady", "steadily", "steadier", "steadiness", "settle", "settles", "warmth"]);

export function hasTraditionalDignity(body) {
  return TRADITIONAL_DIGNITY_BODIES.includes(body);
}

export function skyWriteupLibraryField(name) {
  return libraryFields.get(name) ?? (ARTICLE_FIELDS.includes(name) ? { id: name, kind: "placement", group: "article" } : null);
}

export function grammarFrameFor(name) {
  return GRAMMAR[name] ?? "";
}

export function canonicalSkyWriteupTarget({ scope, body, sign, variable }) {
  const name = String(variable ?? "").replace(/^\{\{|\}\}$/gu, "");
  const field = skyWriteupLibraryField(name);
  if (!field) return { error: `Unknown Sky Write-up variable ${name || variable}.` };
  const planet = String(body ?? "").trim().toLowerCase();
  const selectedSign = String(sign ?? "").trim().toLowerCase();
  if (name === "zodiacSeason" || name === "zodiacSeasonPolarAxis") {
    if (!ZODIAC_SIGNS.includes(selectedSign)) return { error: `${name} needs a zodiac sign.` };
    const contentKey = zodiacSeasonSourceKey(name, selectedSign);
    return {
      key: `${contentKey}#body`,
      contentKey,
      field: "body",
      scope: "sign",
      body: "",
      sign: selectedSign,
      variable: `{{${name}}}`,
      grammarFrame: grammarFrameFor(name),
      shareHost: contentKey
    };
  }
  if (ARTICLE_FIELDS.includes(name)) {
    if (!VARIABLE_PLANETS.includes(planet) || !ZODIAC_SIGNS.includes(selectedSign)) {
      return { error: `${name} needs sky-placement/article/{planet}/{sign}.` };
    }
    const contentKey = `sky-placement/article/${planet}/${selectedSign}`;
    return {
      key: `${contentKey}#${name}`,
      contentKey,
      field: name,
      scope: "placement",
      body: planet,
      sign: selectedSign,
      variable: `{{${name}}}`,
      grammarFrame: grammarFrameFor(name),
      shareHost: contentKey
    };
  }
  if (field.kind === "planet") {
    if (!VARIABLE_PLANETS.includes(planet)) return { error: `${name} needs a planet/body.` };
    const contentKey = `sky-placement/article/${planet}/${PLANET_SHARE_SIGN}`;
    return {
      key: `${contentKey}#ingress.sources.${name}`,
      contentKey,
      field: `ingress.sources.${name}`,
      scope: "planet",
      body: planet,
      sign: PLANET_SHARE_SIGN,
      variable: `{{${name}}}`,
      grammarFrame: grammarFrameFor(name),
      shareHost: contentKey
    };
  }
  if (field.kind === "sign") {
    if (!ZODIAC_SIGNS.includes(selectedSign)) return { error: `${name} needs a zodiac sign.` };
    const contentKey = `sky-placement/article/${SIGN_SHARE_PLANET}/${selectedSign}`;
    return {
      key: `${contentKey}#ingress.sources.${name}`,
      contentKey,
      field: `ingress.sources.${name}`,
      scope: "sign",
      body: SIGN_SHARE_PLANET,
      sign: selectedSign,
      variable: `{{${name}}}`,
      grammarFrame: grammarFrameFor(name),
      shareHost: contentKey
    };
  }
  if (field.kind === "placement") {
    if (!VARIABLE_PLANETS.includes(planet) || !ZODIAC_SIGNS.includes(selectedSign)) {
      return { error: `${name} needs a planet and sign.` };
    }
    const contentKey = `sky-placement/article/${planet}/${selectedSign}`;
    return {
      key: `${contentKey}#ingress.sources.${name}`,
      contentKey,
      field: `ingress.sources.${name}`,
      scope: "placement",
      body: planet,
      sign: selectedSign,
      variable: `{{${name}}}`,
      grammarFrame: grammarFrameFor(name),
      shareHost: contentKey
    };
  }
  return { error: `${name} is not a Sky Write-up import field.` };
}

const OLD_WRITING_LIBRARY = /^writing-library\/(planet|sign)\/([^/#]+)#([A-Za-z][A-Za-z0-9_]*)$/u;
const OLD_PLACEMENT = /^sky-placement\/(?!article\/)([^/]+)\/([^/#]+)#([A-Za-z][A-Za-z0-9_]*)$/u;
const ARTICLE_KEY = /^sky-placement\/article\/([^/]+)\/([^/#]+)#(tldrWhat|tldrTakeaway|placementArticle|ingress\.sources\.[A-Za-z][A-Za-z0-9_]*)$/u;
const SEASON_KEY = /^fallback-hook\/(zodiac-season|zodiac-season-polar-axis)\/([^/#]+)#body$/u;

export function parseSkyWriteupKey(key) {
  const value = String(key ?? "").trim();
  let match = OLD_WRITING_LIBRARY.exec(value);
  if (match) {
    const [, scope, id, name] = match;
    return scope === "planet"
      ? canonicalSkyWriteupTarget({ scope, body: id, sign: "", variable: name })
      : canonicalSkyWriteupTarget({ scope, body: "", sign: id, variable: name });
  }
  match = OLD_PLACEMENT.exec(value);
  if (match) {
    const [, body, sign, name] = match;
    return canonicalSkyWriteupTarget({ scope: "placement", body, sign, variable: name });
  }
  match = SEASON_KEY.exec(value);
  if (match) {
    const name = match[1] === "zodiac-season" ? "zodiacSeason" : "zodiacSeasonPolarAxis";
    return canonicalSkyWriteupTarget({ scope: "sign", body: "", sign: match[2], variable: name });
  }
  match = ARTICLE_KEY.exec(value);
  if (match) {
    const [, body, sign, field] = match;
    const name = field.startsWith("ingress.sources.") ? field.slice("ingress.sources.".length) : field;
    const target = canonicalSkyWriteupTarget({ scope: "placement", body, sign, variable: name });
    if (target.error) return target;
    if (target.scope === "placement") {
      if (target.key !== value) return { error: `Key ${value} does not match canonical ${target.key}.` };
      return target;
    }
    if (target.scope === "planet") {
      if (body !== target.body) return { error: `Planet field ${name} belongs on ${target.body} placements.` };
      return {
        ...target,
        key: value,
        contentKey: `sky-placement/article/${body}/${sign}`,
        sign,
        notes: sign === PLANET_SHARE_SIGN ? "" : `Prefer share host ${target.key}`
      };
    }
    if (target.scope === "sign") {
      if (sign !== target.sign) return { error: `Sign field ${name} belongs on ${target.sign} placements.` };
      return {
        ...target,
        key: value,
        contentKey: `sky-placement/article/${body}/${sign}`,
        body,
        notes: body === SIGN_SHARE_PLANET ? "" : `Prefer share host ${target.key}`
      };
    }
  }
  return { error: `Unrecognized Sky Write-up key ${value}. Use the sample spreadsheet.` };
}

function wordBoundary(term, text) {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu").test(text);
}

export function splitHeldBackPhrase(text) {
  const value = String(text ?? "").trim();
  const cut = value.search(/\.\s+\S/u);
  if (cut < 0) return { text: value, heldBackText: "" };
  return { text: value.slice(0, cut + 1).replace(/\.$/u, "").trim(), heldBackText: value.slice(cut + 1).trim() };
}

export function lintSkyWriteupRow(row) {
  const findings = [];
  const frame = row.grammarFrame || grammarFrameFor(String(row.variable ?? "").replace(/^\{\{|\}\}$/gu, ""));
  let text = String(row.text ?? "");
  let heldBackText = String(row.heldBackText ?? "");
  const name = String(row.variable ?? "").replace(/^\{\{|\}\}$/gu, "");

  if (EMPTY_ON_PURPOSE.has(name) && text.trim()) {
    findings.push("Leave placementDignityMeaning empty so the calculated template can run.");
  }
  if (NO_DIGNITY_EMPTY.has(name) && row.body && !hasTraditionalDignity(row.body) && text.trim()) {
    findings.push(`${name} stays empty for bodies without traditional sign dignity.`);
  }
  if (PHRASE_FIELDS.has(frame) && /\.\s+\S/u.test(text)) {
    const split = splitHeldBackPhrase(text);
    text = split.text;
    heldBackText = [heldBackText, split.heldBackText].filter(Boolean).join(" ");
    findings.push("Phrase field cannot contain a second sentence; extra sentence moved to heldBackText.");
  }
  if (frame === "independent_clause_no_period") {
    if (/[.!?]$/u.test(text.trim())) findings.push("Dignity mechanism is an independent clause with no final punctuation.");
    if (/^[A-Z]/u.test(text.trim()) && !PROPER_NOUN_START.test(text.trim())) findings.push("Dignity mechanism follows “Here,” so it should not start as a title-case sentence.");
  }
  if (frame === "verb_phrase") {
    if (/^to\s/iu.test(text.trim())) findings.push("Dignity expression must not start with “to”.");
    if (/[.!?]$/u.test(text.trim())) findings.push("Dignity expression has no final punctuation.");
  }
  if (/[—–]/u.test(text) || / - /u.test(text)) findings.push("Replace em dashes, en dashes, and spaced hyphens.");
  if (/!/u.test(text)) findings.push("Do not use exclamation marks.");
  if (PHRASE_FIELDS.has(frame) && /;/u.test(text)) findings.push("Do not use semicolons in short fields.");
  const lower = text.toLowerCase();
  for (const item of BANNED_SUBSTRINGS) if (lower.includes(item)) findings.push(`App-banned construction: ${item}`);
  for (const word of BANNED_WORDS) if (wordBoundary(word, text)) findings.push(`App-banned word: ${word}`);
  for (const word of ABSTRACT_BANS) if (wordBoundary(word, text)) findings.push(`Abstract ban in app copy: ${word}`);
  if (frame === "article_template" && text.trim() && !/\{\{/u.test(text)) {
    findings.push("Placement article fields usually keep calculated or library tokens rather than fully baked prose.");
  }
  return { findings, text, heldBackText };
}

export function remapSkyWriteupRow(row) {
  const variable = String(row.variable ?? "").replace(/^\{\{|\}\}$/gu, "") || String(row.key ?? "").split("#")[1]?.replace(/^ingress\.sources\./u, "") || "";
  const parsed = row.key ? parseSkyWriteupKey(row.key) : canonicalSkyWriteupTarget({
    scope: row.scope, body: row.body, sign: row.sign, variable
  });
  if (parsed.error) {
    return { ...row, variable: variable ? `{{${variable}}}` : row.variable, importReady: false, lintFindings: parsed.error };
  }
  const importAction = String(row.importAction ?? "create");
  const lint = lintSkyWriteupRow({ ...row, ...parsed, text: row.text });
  const keepLive = importAction === "skip_if_present";
  const leftover = keepLive ? [] : lint.findings.filter(item => !item.includes("heldBackText"));
  return {
    ...parsed,
    text: keepLive ? String(row.text ?? "") : lint.text,
    heldBackText: keepLive ? "" : lint.heldBackText,
    importAction,
    sourceStatus: row.sourceStatus ?? "",
    reviewStatus: keepLive ? (row.reviewStatus || "approved") : "needs_review",
    notes: [parsed.notes, row.notes].filter(Boolean).join(" "),
    importReady: leftover.length === 0,
    lintFindings: (keepLive ? lint.findings.map(item => `live kept; ${item}`) : leftover).join(" | ")
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/u.test(text) ? `"${text.replace(/"/gu, "\"\"")}"` : text;
}

export function rowsToCsv(rows, columns = [...SKY_WRITEUP_IMPORT_COLUMNS, "importReady", "lintFindings"]) {
  return [columns.join(","), ...rows.map(row => columns.map(column => csvEscape(row[column])).join(","))].join("\n") + "\n";
}

export function sampleSkyWriteupRows() {
  const rows = [];
  const add = (partial, text, notes) => {
    const target = canonicalSkyWriteupTarget(partial);
    rows.push({
      ...target,
      text,
      importAction: "create",
      sourceStatus: "SAMPLE",
      reviewStatus: "needs_review",
      heldBackText: "",
      notes,
      importReady: true,
      lintFindings: ""
    });
  };
  add({ body: "venus", variable: "planetDescriptor" }, "the planet of love, pleasure, and values", "Planet fields live once on the Aries share host, then other signs of that planet link to it.");
  add({ body: "venus", variable: "planetFunction" }, "love, pleasure, money, and what you believe you are worth", "Noun phrase after “describes.” No period.");
  add({ body: "venus", variable: "planetProductive" }, "Venus names what is worth keeping and makes room to enjoy it.", "Complete sentences are correct here.");
  add({ sign: "aries", variable: "signDescriptor" }, "a cardinal fire sign", "Sign fields live once on Sun in that sign, then other planets in the sign link to it.");
  add({ sign: "aries", variable: "signCoreDrive" }, "the nerve to begin without waiting for permission", "Noun phrase after “pursues.”");
  add({ sign: "aries", variable: "signMethod" }, "going first and starting before it feels ready", "Gerund or noun phrase after “through.”");
  add({ sign: "aries", variable: "signShadow" }, "the habit of treating every delay as a personal attack", "Phrase only. Do not append You're allowed / You do not have to.");
  add({ sign: "aries", variable: "zodiacSeason" }, "SAMPLE. Replace this cell with complete Aries season sentences in the current-sky register.", "Shared season copy uses fallback-hook keys, not writing-library keys. Blog-only openings stay out of this cell.");
  add({ sign: "aries", variable: "zodiacSeasonPolarAxis" }, "SAMPLE. The owner title for this axis is Self vs. Other. Replace this cell with complete axis sentences.", "Do not invent new axis titles in import.");
  add({ body: "sun", sign: "aries", variable: "placementDignityMechanism" }, "the Sun needs a purpose to burn toward, and Aries does not wait for a committee", "Follows “Here,”. No final period. Traditional dignity only.");
  add({ body: "sun", sign: "aries", variable: "placementDignityExpression" }, "act on what you want before the doubt gets organized", "Verb phrase. No leading to. No period.");
  add({ body: "sun", sign: "aries", variable: "placementThesis" }, "SAMPLE. Replace with the distinctive Sun-in-Aries thesis, not the Sun's general function.", "Placement fields use the full sky-placement/article/{planet}/{sign} key.");
  add({ body: "sun", sign: "aries", variable: "openingHook" }, "SAMPLE. Lead with the lived pattern, not a planet keyword.", "Lead with the lived pattern.");
  add({ body: "sun", sign: "aries", variable: "tldrWhat" }, "SAMPLE. Article What field for Sun in Aries.", "Article section fields are record paths, not ingress.sources.");
  add({ body: "uranus", sign: "taurus", variable: "placementThesis" }, "SAMPLE. Outer-planet thesis only. Leave dignity mechanism and expression empty.", "No dignity mechanism or expression rows for Uranus, Neptune, Pluto, the nodes, Chiron, or Lilith.");
  return rows;
}

export function libraryFieldIds() {
  return [...libraryFields.keys(), ...ARTICLE_FIELDS];
}

export { VARIABLE_PLANETS, ZODIAC_SEASON_VARIABLES, ZODIAC_SIGNS };
