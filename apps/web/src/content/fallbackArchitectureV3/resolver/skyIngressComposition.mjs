import { sha256Text } from "./contentIntegrity.mjs";
import { SKY_PLACEMENT_VARIABLES, skyPlacementVariableFacts } from "./skyPlacementVariables.mjs";

export const SKY_INGRESS_PATH = "ingress";
export const SKY_INGRESS_VERSION = 5;
export const SKY_INGRESS_FIELDS = Object.freeze([
  ...["planetRole", "planetFunctionSentence"].map(id => ({ id, kind: "planet" })),
  { id: "signFunctionSentence", kind: "sign" },
  ...["openingHook", "placementThesisSentence", "planetSignMechanismSentence", "introManifestationSentence", "introClosingSentence", "dignitySentence", "placementMeaningSentence", "deeperMeaningSentence", "manifestationSentence1", "manifestationSentence2", "manifestationSentence3", "challengeSentence", "stakesSentence", "responseSentence", "practiceClosingLine"].map(id => ({ id, kind: "placement" })),
  ...["durationSentence", "timingSinglePass", "timingFirstPass", "timingReturn", "timingFinalPass", "timingLongCycle"].map(id => ({ id, kind: "timing" })),
  ...["aspectMechanismSentence", "aspectManifestationSentence1", "aspectManifestationSentence2", "aspectChallengeSentence", "aspectResponseSentence"].map(id => ({ id, kind: "aspect" }))
]);
export const SKY_INGRESS_VARIABLES = Object.freeze([
  { name: "passEntryDate", description: "Entry into the selected calculated pass." },
  { name: "passExitDate", description: "Exit from the selected calculated pass." },
  { name: "firstEntryDate", description: "First entry in the calculated residency story." },
  { name: "finalExitDate", description: "Final exit in the calculated residency story." },
  { name: "returnDate", description: "Entry of the next calculated pass, when one exists." },
  { name: "priorPassYear", description: "Year of the immediately preceding pass." },
  { name: "currentYear", description: "Year of the selected pass entry, not today's year." },
  { name: "previousSignTitle", description: "Calculated sign immediately before this pass, when supplied." },
  { name: "ingressVerb", description: "Entry verb from calculated motion at the crossing; never inferred from current motion." },
  { name: "aspectPlanetTitle", description: "Other body of the selected calculated aspect." },
  { name: "aspectType", description: "Selected calculated aspect type." },
  { name: "aspectVerb", description: "Display verb for the selected calculated aspect." },
  { name: "aspectExactDate", description: "Exact aspect date in the selected timezone." }
]);
const factNames = new Set([...SKY_PLACEMENT_VARIABLES, ...SKY_INGRESS_VARIABLES].map(item => item.name));
const identifier = value => typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9-]{0,63}$/u.test(value) && !["constructor", "prototype", "__proto__"].includes(value);
const object = value => value && typeof value === "object" && !Array.isArray(value);
const tokens = value => [...String(value).matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/gu)];
const title = value => String(value ?? "").split(/[- ]/u).map(part => part[0]?.toUpperCase() + part.slice(1).toLowerCase()).join(" ");
const fail = message => { throw new Error(`SKY_V5_COMPOSITION: ${message}`); };
const exactKeys = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));
const dateValue = value => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : NaN;

/** Structural starter only. No proposed astrology prose is promoted by installation. */
export function makeSkyIngressComposition() {
  const module = (id, label, names, required = false, extra = {}) => ({ id, label, required, enabled: true, motion: "all", duration: "all", timing: "all", template: names.map(name => `{{${name}}}`).join(" "), ...extra });
  return {
    version: SKY_INGRESS_VERSION, enabled: false,
    sources: Object.fromEntries(SKY_INGRESS_FIELDS.map(field => [field.id, { kind: field.kind, text: "" }])),
    modules: [
      module("opening", "Opening", ["openingHook"]),
      module("intro", "Ingress introduction", [], false, { template: "On {{passEntryDate}}, {{planetTitle}}, {{planetRole}}, {{ingressVerb}} {{signTitle}}. {{durationSentence}} {{placementThesisSentence}}" }),
      module("dignity", "Dignity", ["dignitySentence"]),
      module("intro-mechanism", "Intro mechanism and experience", ["planetSignMechanismSentence", "introManifestationSentence"]),
      module("intro-close", "Intro close", ["introClosingSentence"]),
      module("practice", "Placement in practice", ["planetFunctionSentence", "signFunctionSentence", "placementMeaningSentence", "deeperMeaningSentence"], true),
      module("manifestations", "How it may show up", ["manifestationSentence1", "manifestationSentence2"], true),
      module("third-manifestation", "Long transit manifestation", ["manifestationSentence3"], false, { duration: "long" }),
      module("response", "Challenge, stakes, and response", ["challengeSentence", "stakesSentence", "responseSentence"], true),
      module("single-pass", "Single pass timing", ["timingSinglePass"], false, { timing: "single_pass" }),
      module("first-pass", "First pass timing", ["timingFirstPass"], false, { timing: "first_pass" }),
      module("return", "Return timing", ["timingReturn"], false, { timing: "return_pass" }),
      module("final-pass", "Final pass timing", ["timingFinalPass"], false, { timing: "final_pass" }),
      module("long-cycle", "Long cycle context", ["timingLongCycle"], false, { duration: "long" }),
      module("close", "Practice close", ["practiceClosingLine"])
    ]
  };
}

export function ingressTextIssues(text, sourceNames = []) {
  if (typeof text !== "string") return ["Writing must be text."];
  const names = new Set([...factNames, ...sourceNames]);
  const issues = tokens(text).filter(match => !names.has(match[1])).map(match => `Unknown ingress slot ${match[0]}.`);
  if (/\{\{|\}\}/u.test(text.replace(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/gu, ""))) issues.push("Use complete {{name}} tokens; conditional blocks and nested references are not supported.");
  return [...new Set(issues)];
}

export function validateSkyIngressComposition(value) {
  if (value === undefined || value === null) return;
  if (!exactKeys(value, ["version", "enabled", "sources", "modules"]) || value.version !== 5 || typeof value.enabled !== "boolean" || !object(value.sources) || !Array.isArray(value.modules)) fail("Choose a version 5 composition with sources and ordered modules.");
  if (Object.keys(value.sources).length > 80 || value.modules.length > 32 || JSON.stringify(value).length > 180000) fail("Composition exceeds the supported size.");
  for (const [id, source] of Object.entries(value.sources)) {
    if (!identifier(id) || !/^[A-Za-z][A-Za-z0-9]*$/u.test(id) || factNames.has(id) || !exactKeys(source, ["kind", "text", "reference"]) || !["planet", "sign", "placement", "timing", "aspect"].includes(source.kind)) fail(`Invalid source ${id}.`);
    if (source.reference !== undefined) {
      const ref = source.reference;
      if (source.text !== undefined || !exactKeys(ref, ["contentKey", "field", "sha256"]) || !/^sky-placement\/article\/[a-z-]+\/[a-z-]+$/u.test(ref.contentKey) || !/^ingress\.sources\.[A-Za-z][A-Za-z0-9]*$/u.test(ref.field) || !/^[a-f0-9]{64}$/u.test(ref.sha256)) fail(`Source ${id} needs an exact field reference and text hash.`);
    } else {
      if (typeof source.text !== "string" || source.text.length > 20000) fail(`Source ${id} needs writing.`);
      const issues = ingressTextIssues(source.text);
      if (issues.length) fail(`${id}: ${issues.join(" ")}`);
    }
  }
  const ids = new Set();
  for (const module of value.modules) {
    if (!exactKeys(module, ["id", "label", "template", "required", "enabled", "motion", "duration", "timing", "aspect"]) || !identifier(module.id) || ids.has(module.id) || typeof module.label !== "string" || module.label.length > 120 || typeof module.template !== "string" || module.template.length > 20000 || typeof module.required !== "boolean" || typeof module.enabled !== "boolean" || !["all", "direct", "retrograde"].includes(module.motion) || !["all", "short", "long"].includes(module.duration) || !["all", "single_pass", "first_pass", "return_pass", "final_pass"].includes(module.timing)) fail("Each module needs a unique ID, template, and valid selection rules.");
    ids.add(module.id);
    const issues = ingressTextIssues(module.template, Object.keys(value.sources));
    if (issues.length) fail(`${module.label}: ${issues.join(" ")}`);
    if (module.aspect !== undefined && (!exactKeys(module.aspect, ["otherPlanet", "type", "weight"]) || !/^(sun|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|lilith)$/u.test(module.aspect.otherPlanet) || !["conjunction", "sextile", "square", "trine", "opposition"].includes(module.aspect.type) || !["defining", "supporting", "minor"].includes(module.aspect.weight))) fail(`${module.label}: invalid aspect selection.`);
  }
}

export function ingressSourceAt(record, field) {
  const match = /^ingress\.sources\.([A-Za-z][A-Za-z0-9]*)$/u.exec(field);
  return match && record?.ingress?.sources?.[match[1]];
}

/** References are one hop, hash-pinned, and resolved from the already eligible snapshot. */
export function resolveIngressSource(owner, id, records = []) {
  const source = owner.ingress?.sources?.[id];
  const localRef = `${owner.contentKey}#ingress.sources.${id}`;
  if (!source) return { reference: localRef, reason: "Source missing" };
  if (!source.reference) return { reference: localRef, text: source.text, kind: source.kind, sha256: sha256Text(source.text) };
  const ref = source.reference;
  const record = records.find(row => row.contentKey === ref.contentKey);
  const target = ingressSourceAt(record, ref.field);
  const reference = `${ref.contentKey}#${ref.field}`;
  if (!record || !target || target.reference || typeof target.text !== "string") return { reference, reason: "Referenced published sentence is unavailable; chained references are not allowed" };
  // Keys are sky-placement/article/{planet}/{sign} (four segments).
  const own = owner.contentKey.split("/").slice(2);
  const other = record.contentKey.split("/").slice(2);
  if (source.kind !== target.kind || (source.kind === "planet" && own[0] !== other[0]) || (source.kind === "sign" && own[1] !== other[1]) || (["placement", "timing"].includes(source.kind) && owner.contentKey !== record.contentKey)) return { reference, reason: "Source scope does not match this placement" };
  if (sha256Text(target.text) !== ref.sha256) return { reference, reason: "Referenced writing changed; review and relink this exact revision" };
  return { reference, text: target.text, sha256: ref.sha256, kind: target.kind };
}

/** Formatting only: every boundary and entry motion is supplied by the ephemeris. */
export function skyIngressOccurrence(input = {}) {
  const facts = skyPlacementVariableFacts(input);
  const occurrence = input.ingressOccurrence ?? {};
  const timeZone = occurrence.timeZone ?? input.aspectFacts?.timeZone ?? "UTC";
  const format = value => new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone }).format(new Date(value));
  const passes = (Array.isArray(occurrence.passes) ? occurrence.passes : []).filter(pass => pass && Number.isFinite(dateValue(pass.entryDate)) && dateValue(pass.exitDate) > dateValue(pass.entryDate)).slice().sort((a, b) => dateValue(a.entryDate) - dateValue(b.entryDate));
  const selectedAt = dateValue(occurrence.asOfDate);
  const index = passes.findIndex(pass => dateValue(pass.entryDate) <= selectedAt && selectedAt < dateValue(pass.exitDate));
  const pass = passes[index];
  const aspectIdentity = title(input.aspectFacts?.planet) === title(input.planet) && title(input.aspectFacts?.sign) === title(input.sign);
  const events = aspectIdentity ? input.aspectFacts?.inSign : undefined;
  if (!pass) return { facts, duration: "unknown", timing: "unknown", events, timeZone };
  facts.passEntryDate = format(pass.entryDate); facts.passExitDate = format(pass.exitDate);
  facts.firstEntryDate = format(passes[0].entryDate); facts.finalExitDate = format(passes.at(-1).exitDate);
  facts.currentYear = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(new Date(pass.entryDate));
  if (index > 0) facts.priorPassYear = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(new Date(passes[index - 1].entryDate));
  if (passes[index + 1]) facts.returnDate = format(passes[index + 1].entryDate);
  if (pass.entryMotion === "direct") facts.ingressVerb = index ? "re-enters" : "enters";
  else if (pass.entryMotion === "retrograde") facts.ingressVerb = "moves back into";
  if (pass.previousSign) facts.previousSignTitle = title(pass.previousSign);
  return { facts, duration: (dateValue(passes.at(-1).exitDate) - dateValue(passes[0].entryDate)) / 86400000 >= 90 ? "long" : "short",
    timing: passes.length === 1 ? "single_pass" : index === passes.length - 1 ? "final_pass" : index === 0 ? "first_pass" : "return_pass", events, timeZone };
}

function fillText(text, facts) {
  const missing = tokens(text).filter(match => typeof facts[match[1]] !== "string" || !facts[match[1]].trim()).map(match => match[1]);
  return { missing, text: missing.length ? "" : text.replace(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/gu, (_, name) => facts[name]) };
}

export function renderSkyIngressComposition(owner, input = {}, records = [], options = {}) {
  const composition = owner?.ingress;
  validateSkyIngressComposition(composition);
  if (!composition) return { status: "absent", body: "", trace: [] };
  if (!composition.enabled && !options.preview) return { status: "disabled", body: "", trace: [] };
  const occurrence = skyIngressOccurrence(input);
  const trace = [];
  let requiredGap = false;
  const events = [...new Map((Array.isArray(occurrence.events) ? occurrence.events : []).filter(event => event && typeof event.id === "string" && Number.isFinite(dateValue(event.occursAt)) && String(event.planet).toLowerCase() === String(input.planet).toLowerCase()).map(event => [event.id, event])).values()].sort((a, b) => dateValue(a.occursAt) - dateValue(b.occursAt) || a.id.localeCompare(b.id));
  const selectionReason = module => !module.enabled ? "Disabled" : module.motion !== "all" && module.motion !== occurrence.facts.motion ? "Different motion" : module.duration !== "all" && module.duration !== occurrence.duration ? occurrence.duration === "unknown" ? "Needs calculated residency" : "Different duration" : module.timing !== "all" && module.timing !== occurrence.timing ? occurrence.timing === "unknown" ? "Needs calculated pass" : "Different pass" : "";
  const type = value => ({ conjunct: "conjunction", opposite: "opposition" }[value] ?? value);
  const defining = events.map(event => ({ event, module: composition.modules.find(module => !selectionReason(module) && module.aspect?.weight === "defining" && module.aspect.otherPlanet === String(event.otherPlanet).toLowerCase() && module.aspect.type === type(event.aspect)) })).filter(item => item.module).slice(0, 2);
  for (const module of composition.modules) {
    let reason = selectionReason(module);
    const selected = module.aspect ? defining.filter(item => item.module.id === module.id).map(item => item.event) : [null];
    if (module.aspect && !selected.length && !reason) reason = !Array.isArray(occurrence.events) ? "Needs calculated aspects" : "No selected defining aspect; at most two exact events receive prose";
    if (reason) {
      if (module.required && reason.startsWith("Needs calculated")) requiredGap = true;
      trace.push({ id: module.id, label: module.label, status: "omitted", reason, template: module.template, slots: [] }); continue;
    }
    for (const event of selected) {
      const facts = { ...occurrence.facts };
      if (event) Object.assign(facts, { aspectPlanetTitle: title(event.otherPlanet), aspectType: type(event.aspect), aspectVerb: ({ conjunction: "conjoins", sextile: "sextiles", square: "squares", trine: "trines", opposition: "opposes" })[type(event.aspect)], aspectExactDate: new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: occurrence.timeZone ?? "UTC" }).format(new Date(event.occursAt)) });
      const slots = [];
      const values = {};
      for (const match of tokens(module.template)) {
        const name = match[1];
        if (Object.hasOwn(values, name)) continue;
        if (factNames.has(name)) { values[name] = facts[name]; slots.push({ name, kind: "fact", text: facts[name] ?? "", reference: `calculated#${name}`, reason: facts[name] ? "" : "Needs calculated value" }); }
        else {
          const source = resolveIngressSource(owner, name, records);
          const filled = source.text?.trim() ? fillText(source.text, facts) : { text: "", missing: [] };
          values[name] = filled.text;
          slots.push({ name, ...source, raw: source.text ?? "", text: filled.text, reason: source.reason || (filled.missing.length ? `Needs calculated ${filled.missing.join(", ")}` : !filled.text ? "No writing saved" : "") });
        }
      }
      const result = fillText(module.template, values);
      const missing = slots.filter(slot => slot.reason);
      const incomplete = missing.length > 0 || !result.text.trim();
      if (incomplete && module.required) requiredGap = true;
      trace.push({ id: module.id, eventId: event?.id, label: module.label, template: module.template, status: incomplete ? "omitted" : "included", reason: incomplete ? `${module.required ? "Required module incomplete" : "Optional module omitted"}: ${missing.map(slot => slot.name).join(", ") || "empty template"}` : "Selected by this composition", text: result.text, slots });
    }
  }
  const body = trace.filter(part => part.status === "included").map(part => part.text).join("\n\n");
  return { status: requiredGap || !body.trim() ? "incomplete" : "ready", body: requiredGap ? "" : body, trace, timing: occurrence.timing, duration: occurrence.duration };
}

/** Publication checks writing completeness without requiring an invented occurrence. */
export function skyIngressPublicationIssues(owner, records = []) {
  validateSkyIngressComposition(owner.ingress);
  if (!owner.ingress?.enabled) return [];
  const issues = [];
  const required = owner.ingress.modules.filter(module => module.required && module.enabled);
  if (!required.length) issues.push("An enabled composition needs at least one required core module.");
  for (const module of required) {
    if (!module.template.trim()) issues.push(`${module.label}: required template is empty.`);
    for (const match of tokens(module.template)) if (!factNames.has(match[1])) {
      const resolved = resolveIngressSource(owner, match[1], records);
      if (!resolved.text?.trim() || resolved.reason) issues.push(`${module.label} → ${match[1]}: ${resolved.reason || "required writing is empty"}.`);
    }
  }
  return [...new Set(issues)];
}
