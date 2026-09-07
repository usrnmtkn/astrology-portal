import { templateVariableReferences, type TemplateVariableReference } from "./templateVariableReference";
import {
  templateVariableSourceCandidates,
  templateVariableSourceContract,
  type TemplateVariableSourceContract
} from "./templateVariableSources";
import { isCompositionTemplateRow } from "./compositionTemplateClassifier";

export { isCompositionTemplateRow } from "./compositionTemplateClassifier";

export type CompositionMapRow = {
  id: string;
  content_key: string;
  headline: string | null;
  summary: string | null;
  body: string | null;
  surface: string;
  status: string;
  block_type?: string | null;
  sections: unknown;
  source_snapshot?: unknown;
};

export type CompositionMapSourceKind = "copy" | "hook" | "phrase";
export type CompositionPreviewVariableKind = CompositionMapSourceKind | "copy" | "fact";

export type CompositionMapSource = {
  kind: CompositionMapSourceKind;
  label: string;
  row: CompositionMapRow;
};

export type CompositionMapSlot = TemplateVariableReference & {
  depth: number;
  parents: string[];
  sourceContract: TemplateVariableSourceContract;
  sources: CompositionMapSource[];
  issue: string | null;
};

export type CompositionPreviewField = {
  audience?: "you" | "they";
  key: string;
  label: string;
  paragraphs: CompositionPreviewSegment[][];
  rendered: string;
  template: string;
};

export type CompositionPreviewSegment = {
  kind?: CompositionPreviewVariableKind;
  name?: string;
  source?: CompositionMapSource;
  text: string;
};

export type CompositionPreviewFact = {
  label: string;
  name: string;
  value: string;
};

export type CompositionPreview = {
  facts: CompositionPreviewFact[];
  fields: CompositionPreviewField[];
  lineage: "runtime-traceable" | "not-traceable";
  lineageNote: string;
  sources: CompositionMapSource[];
};

export type CompositionPreviewOptions = {
  exampleValues?: Record<string, string>;
  includeOptionalSources?: boolean;
};

export type CompositionMapTemplate = {
  destination: string;
  description: string;
  issues: string[];
  label: string;
  preview: CompositionPreview;
  row: CompositionMapRow;
  slots: CompositionMapSlot[];
};

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function humanize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/[._/-]+/gu, " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase())
    .trim();
}

function packageRecordForRow(row: CompositionMapRow) {
  const sections = objectRecord(row.sections);
  return objectRecord(sections?.packageRecord) ?? {};
}

function variableFieldsForRow(row: CompositionMapRow) {
  const sections = objectRecord(row.sections) ?? {};
  const packageRecord = packageRecordForRow(row);
  return {
    Headline: row.headline ?? "",
    Summary: row.summary ?? "",
    Body: row.body ?? "",
    body: packageRecord.body ?? sections.body ?? "",
    body_you: packageRecord.body_you ?? sections.body_you ?? "",
    body_they: packageRecord.body_they ?? sections.body_they ?? ""
  };
}

type AtomicReference = TemplateVariableReference & { depth: number; parents: string[] };
type AtomicVariableCaches = {
  candidates: Map<string, CompositionMapRow[]>;
  nested: Map<string, TemplateVariableReference[]>;
};

function sourceCandidates(reference: TemplateVariableReference, rows: CompositionMapRow[], templateKey: string, cache: AtomicVariableCaches) {
  const key = `${templateKey}\u0000${reference.name}`;
  let candidates = cache.candidates.get(key);
  if (!candidates) {
    candidates = [...new Map(
      templateVariableSourceCandidates(reference, rows, templateKey)
        .map((candidate) => [candidate.content_key, candidate])
    ).values()];
    cache.candidates.set(key, candidates);
  }
  return candidates;
}

function atomicVariableReferences(row: CompositionMapRow, rows: CompositionMapRow[], cache: AtomicVariableCaches) {
  const roots = templateVariableReferences(variableFieldsForRow(row), packageRecordForRow(row));
  const references = new Map<string, AtomicReference>();
  const queue: AtomicReference[] = roots.map((reference) => ({ ...reference, depth: 0, parents: [] }));

  while (queue.length) {
    const reference = queue.shift()!;
    const existing = references.get(reference.name);
    if (existing) {
      existing.depth = Math.min(existing.depth, reference.depth);
      existing.parents = [...new Set([...existing.parents, ...reference.parents])].sort();
      existing.fields = [...new Set([...existing.fields, ...reference.fields])].sort();
      continue;
    }
    references.set(reference.name, reference);
    if (reference.depth >= 6 || reference.sourceKind === "runtime") continue;

    const candidates = sourceCandidates(reference, rows, row.content_key, cache);
    candidates.forEach((candidate) => {
      const candidateKey = candidate.id || candidate.content_key;
      let nested = cache.nested.get(candidateKey);
      if (!nested) {
        nested = templateVariableReferences(variableFieldsForRow(candidate), packageRecordForRow(candidate));
        cache.nested.set(candidateKey, nested);
      }
      nested.forEach((dependency) => {
        if (dependency.name === reference.name) return;
        queue.push({
          ...dependency,
          depth: reference.depth + 1,
          fields: [`Inside {{${reference.name}}}`],
          parents: [reference.name]
        });
      });
    });
  }

  return [...references.values()].sort((left, right) => left.depth - right.depth
    || left.label.localeCompare(right.label, undefined, { sensitivity: "base" }));
}

function rowRole(row: CompositionMapRow) {
  const packageRole = text(packageRecordForRow(row).content_role);
  const snapshotRole = text(objectRecord(row.source_snapshot)?.content_role);
  return packageRole || snapshotRole;
}

export function compositionDestination(row: CompositionMapRow) {
  const snapshot = objectRecord(row.source_snapshot);
  const declaredDestination = text(snapshot?.readerDestination)
    || text(snapshot?.reader_destination);
  if (declaredDestination) return humanize(declaredDestination);
  const key = `${row.content_key} ${text(snapshot?.contentFamily)}`.toLowerCase();
  if (key.includes("compatibility") || key.includes("synastry") || key.includes("relationship")) return "Friends & relationships";
  if (key.includes("calendar") || key.includes("lunation") || key.includes("moon-phase")) return "Calendar & lunations";
  if (key.includes("sky") || key.includes("transit") || key.includes("retrograde")) return "Current Sky";
  if (key.includes("natal") || key.includes("placement") || key.includes("aspect") || key.includes("angle")) return "Natal chart";
  if (row.surface === "friends" || row.surface === "relationship" || row.surface === "synastry" || row.surface === "composite") return "Friends & relationships";
  if (row.surface === "sky") return "Current Sky";
  if (row.surface === "natal" || row.surface === "you") return "Natal chart";
  return "Reader destination not declared";
}

export function compositionTemplateLabel(row: CompositionMapRow) {
  const destination = compositionDestination(row);
  const planetVariant = row.content_key.match(/^fallback-template\/natal\.planet-in-sign\/([^/]+)$/u)?.[1];
  let label = row.content_key === "fallback-template/natal.planet-in-sign"
    ? "Any planet in any sign"
    : row.content_key === "fallback-template/natal.node-in-sign"
      ? "Lunar Node in any sign"
      : row.content_key === "fallback-template/sky-placement-frame-v3"
        ? "Planet in any sign"
        : row.content_key === "fallback-template/transit.retrograde-article"
          ? "Planet retrograde article"
        : planetVariant
          ? `${humanize(planetVariant)} in any sign`
          : text(row.headline) || humanize(row.content_key.split("/").at(-1) ?? "Template");
  label = label
    .replace(/^compatibility\s+/iu, "")
    .replace(/^current[- ]sky\s+(?:aspect:\s*)?/iu, "")
    .replace(/\s+(?:slot|template|voice scaffold)$/iu, "")
    .trim();
  if (!label) label = "Untitled template";
  return `${destination} · ${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function sourceKind(row: CompositionMapRow): CompositionMapSourceKind {
  const role = rowRole(row);
  if (row.content_key.startsWith("vocab/")
    || row.content_key.startsWith("fallback-vocab/")
    || row.block_type === "vocabulary_phrase"
    || role === "vocabulary") return "phrase";
  return row.content_key.startsWith("fallback-hook/") || row.block_type === "fallback_hook"
    ? "hook"
    : "copy";
}

function sourceLabel(row: CompositionMapRow) {
  return text(row.headline) || humanize(row.content_key.split("/").slice(-2).join(" "));
}

function representativeExample(name: string, example: string) {
  if (name === "natalTitle") return "Venus";
  const normalized = text(example);
  if (!normalized || /^varies with /iu.test(normalized)) return humanize(name).toLowerCase();
  if (normalized.split(/\s+/u).length <= 7 && /,\s+(?:and|or)\s+/iu.test(normalized)) return normalized.split(",")[0].trim();
  if (/\s+or\s+/iu.test(normalized)) return normalized.split(/\s+or\s+/iu)[0].trim();
  return normalized;
}

function representativeExampleForRow(row: CompositionMapRow, name: string, example: string) {
  if (row.content_key === "fallback-template/transit.retrograde-article") {
    if (name === "transitRef") return "Saturn in Aries";
    if (name === "transitTitle") return "Saturn";
    if (name === "signTitle") return "Aries";
  }
  if (name === "oppositeSignTitle") return "Aquarius";
  if (name === "planetTitle") {
    const planetVariant = row.content_key.match(/^fallback-template\/natal\.planet-in-sign\/([^/]+)$/u)?.[1];
    if (planetVariant) return humanize(planetVariant);
    if (row.content_key === "fallback-template/natal.node-in-sign") return "North Node";
    if (row.content_key === "fallback-template/sky-placement-frame-v3") return "Jupiter";
  }
  return representativeExample(name, example);
}

function previewSourceText(source: CompositionMapSource, audience: "you" | "they", slotName: string) {
  const packageRecord = packageRecordForRow(source.row);
  const sections = objectRecord(source.row.sections) ?? {};
  if (/headline$/iu.test(slotName)) {
    const audienceHeadline = audience === "they" ? text(packageRecord.headline_they) : "";
    return audienceHeadline
      || text(packageRecord.headline)
      || text(source.row.headline);
  }
  const audienceCopy = audience === "they"
    ? text(packageRecord.body_they) || text(sections.body_they)
    : text(packageRecord.body_you) || text(sections.body_you);
  return audienceCopy
    || text(packageRecord.body)
    || text(sections.body)
    || text(source.row.body)
    || text(source.row.summary)
    || text(source.row.headline);
}

function representativeSource(
  slot: CompositionMapSlot,
  slots: CompositionMapSlot[],
  values: Map<string, string>,
  includeOptionalSources = false
) {
  if ((!includeOptionalSources && slot.requirement === "Optional") || !slot.sources.length) return null;
  if (slot.sources.length === 1) return slot.sources[0];
  const directAnchorNames: Record<string, string[]> = {
    angleIntro: ["angleTitle"],
    aspectAdj: ["aspectName"],
    aspectMotion: ["aspectName"],
    aspectVerb: ["aspectName"],
    houseMeaning: ["houseOrdinal"],
    houseTopic: ["houseOrdinal"],
    natalCore: ["natalTitle"],
    nodeJourney: ["planetTitle"],
    oppositeDirection: ["oppositeSignTitle"],
    planetACore: ["planetATitle"],
    planetBCore: ["planetBTitle"],
    planetBest: ["planetTitle"],
    planetExcess: ["planetTitle"],
    planetFunction: ["planetTitle"],
    planetVerb: ["planetTitle"],
    signAdverb: ["signTitle"],
    signNeed: ["signTitle"],
    transitTypeLine: ["aspectName"]
  };
  const directAnchors = (directAnchorNames[slot.name] ?? [])
    .map((name) => (values.get(name) ?? "").toLowerCase().trim().replace(/\s+/gu, "-"))
    .filter(Boolean);
  for (const prefix of slot.sourceContract.prefixes) {
    for (const anchor of directAnchors) {
      const exact = slot.sources.find((source) => source.row.content_key === `${prefix}${anchor}`);
      if (exact) return exact;
    }
  }
  if (slot.name === "elementPattern") {
    const elements: Record<string, string> = {
      aries: "fire", leo: "fire", sagittarius: "fire",
      taurus: "earth", virgo: "earth", capricorn: "earth",
      gemini: "air", libra: "air", aquarius: "air",
      cancer: "water", scorpio: "water", pisces: "water"
    };
    const elementA = elements[(values.get("signATitle") ?? "").toLowerCase()];
    const elementB = elements[(values.get("signBTitle") ?? "").toLowerCase()];
    if (elementA && elementB) {
      for (const prefix of slot.sourceContract.prefixes) {
        const exact = slot.sources.find((source) => source.row.content_key === `${prefix}${elementA}/${elementB}`);
        if (exact) return exact;
      }
    }
  }
  if (["transitEffect", "transitEffectLine"].includes(slot.name)) {
    const aspect = (values.get("aspectName") ?? "").toLowerCase();
    const family = ["trine", "sextile"].includes(aspect)
      ? "soft"
      : ["square", "opposition"].includes(aspect) ? "hard" : aspect;
    const transit = (values.get("transitTitle") ?? "").toLowerCase().replace(/\s+/gu, "-");
    const natal = (values.get("natalTitle") ?? "").toLowerCase().replace(/\s+/gu, "-");
    const exact = slot.sources.find((source) => source.row.content_key === `fallback-hook/transit-effect-${family}/${transit}/${natal}`);
    if (exact) return exact;
  }
  const anchorSlotNames = slot.name === "transitTopic"
    ? ["transitTitle"]
    : slot.name === "natalCore" || slot.name === "natalArea"
      ? ["natalTitle"]
      : ["aspectAdj", "aspectVerb", "synAspectLine"].includes(slot.name)
        ? ["aspectName", "aspectAdj"]
        : slot.name === "elementPattern"
          ? ["signATitle", "signBTitle"]
          : slot.name === "rulerHouseTopic"
            ? ["rulerHouseOrdinal"]
            : slot.name === "topicN"
              ? ["houseN"]
              : slot.name === "topicM"
                ? ["houseM"]
        : ["transitTypeLine", "transitEffectLine", "transitEffect"].includes(slot.name)
          ? ["aspectName", "transitTitle", "natalTitle"]
          : slot.name === "pairSentences"
            ? ["planetATitle", "planetBTitle", "aspectAdj"]
            : /A$/u.test(slot.name) && ["modeA", "askA", "gratesA", "sceneA"].includes(slot.name)
              ? ["planetATitle"]
              : /B$/u.test(slot.name) && ["modeB", "askB", "gratesB", "sceneB"].includes(slot.name)
                ? ["planetBTitle"]
                : null;
  const anchors = slots.filter((candidate) => anchorSlotNames ? anchorSlotNames.includes(candidate.name) : candidate.sourceKind === "runtime")
    .flatMap((candidate) => (values.get(candidate.name) ?? "").toLowerCase().match(/[a-z]+/gu) ?? []);
  const numericAnchorNames = anchorSlotNames ?? ["houseOrdinal"];
  numericAnchorNames.forEach((name) => anchors.push(...(values.get(name)?.match(/\d+/gu) ?? [])));
  if (slot.name === "elementPattern") {
    const elements: Record<string, string> = {
      aries: "fire", leo: "fire", sagittarius: "fire",
      taurus: "earth", virgo: "earth", capricorn: "earth",
      gemini: "air", libra: "air", aquarius: "air",
      cancer: "water", scorpio: "water", pisces: "water"
    };
    ["signATitle", "signBTitle"].forEach((name) => {
      const element = elements[(values.get(name) ?? "").toLowerCase()];
      if (element) anchors.push(element);
    });
  }
  const group = anchors.includes("trine") || anchors.includes("sextile")
    ? "soft"
    : anchors.some((anchor) => ["square", "opposition", "opposite"].includes(anchor)) ? "hard" : "";
  const ranked = slot.sources.map((source) => {
    const rawParts = source.row.content_key.toLowerCase().split(/[\/.\-_]+/u);
    const parts = slot.name === "elementPattern" ? rawParts : [...new Set(rawParts)];
    return { source, score: parts.reduce((total, part) => total + (anchors.includes(part) ? 2 : part === group ? 1 : 0), 0) };
  }).sort((left, right) => right.score - left.score);
  const winner = ranked[0];
  if (!winner?.score) return null;
  if (ranked[1]?.score === winner.score) return null;
  return winner.source;
}

function fallbackPreviewValue(name: string) {
  const reference = templateVariableReferences({ Preview: `{{${name}}}` })[0];
  return representativeExample(name, reference?.example ?? humanize(name));
}

function renderPreviewText(template: string, values: Map<string, string>, seen = new Set<string>(), mark?: (name: string, value: string) => string): string {
  const resolve = (name: string) => {
    if (seen.has(name)) return fallbackPreviewValue(name);
    if (!values.has(name)) return fallbackPreviewValue(name);
    const raw = values.get(name) ?? "";
    if (!raw) return "";
    const value = renderPreviewText(raw, values, new Set([...seen, name]), mark);
    return mark ? mark(name, value) : value;
  };
  let rendered = template;
  const sectionPattern = /\{\{\s*([#^])\s*([\w.-]+)\s*\}\}([\s\S]*?)\{\{\s*\/\s*\2\s*\}\}/gu;
  for (let pass = 0; pass < 4 && sectionPattern.test(rendered); pass += 1) {
    sectionPattern.lastIndex = 0;
    rendered = rendered.replace(sectionPattern, (_match, marker: string, name: string, content: string) => {
      const value = resolve(name);
      const include = marker === "#" ? Boolean(value) : !value;
      return include
        ? ` ${renderPreviewText(content.replace(/\{\{\s*\.\s*\}\}/gu, value), values, seen, mark)} `
        : "";
    });
  }
  return rendered
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/gu, (_match, name: string) => resolve(name))
    .replace(/\{\{[^}]+\}\}/gu, "")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/[ \t]{2,}/gu, " ")
    .replace(/([.!?])\1+/gu, "$1")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function previewSegments(template: string, values: Map<string, string>, slots: CompositionMapSlot[], sourceByName: Map<string, CompositionMapSource>) {
  const rendered = renderPreviewText(template, values, new Set(), (name, value) => `\uE000${name}\uE001${value}\uE002`);
  const segments: CompositionPreviewSegment[] = [];
  const stack: string[] = [];
  let cursor = 0;
  while (cursor < rendered.length) {
    if (rendered[cursor] === "\uE000") {
      const separator = rendered.indexOf("\uE001", cursor);
      stack.push(rendered.slice(cursor + 1, separator));
      cursor = separator + 1;
      continue;
    }
    if (rendered[cursor] === "\uE002") {
      stack.pop();
      cursor += 1;
      continue;
    }
    const boundary = [rendered.indexOf("\uE000", cursor), rendered.indexOf("\uE002", cursor)]
      .filter((index) => index >= 0).sort((left, right) => left - right)[0] ?? rendered.length;
    const name = [...stack].reverse().find((candidate) => slots.some((slot) => slot.name === candidate));
    const source = name ? sourceByName.get(name) : undefined;
    const slot = slots.find((candidate) => candidate.name === name);
    const segment = {
      kind: name ? source?.kind ?? (slot?.sourceKind === "runtime" ? "fact" : "copy") : undefined,
      name,
      source,
      text: rendered.slice(cursor, boundary)
    } satisfies CompositionPreviewSegment;
    const previous = segments.at(-1);
    if (previous && previous.name === segment.name && previous.source === segment.source) previous.text += segment.text;
    else segments.push(segment);
    cursor = boundary;
  }
  return segments;
}

function previewParagraphs(segments: CompositionPreviewSegment[]) {
  const paragraphs: CompositionPreviewSegment[][] = [[]];
  segments.forEach((segment) => segment.text.split(/\n{2,}/u).forEach((part, index) => {
    if (index) paragraphs.push([]);
    if (part) paragraphs.at(-1)?.push({ ...segment, text: part });
  }));
  return paragraphs.filter((paragraph) => paragraph.length);
}

function compositionPreviewFields(row: CompositionMapRow) {
  const packageRecord = packageRecordForRow(row);
  const candidates: Array<{ audience?: "you" | "they"; key: string; label: string; value: string }> = [];
  const add = (key: string, label: string, value: unknown, audience?: "you" | "they") => {
    const normalized = text(value);
    if (!normalized || candidates.some((candidate) => candidate.value === normalized)) return;
    candidates.push({ audience, key, label, value: normalized });
  };
  const packageHeadline = text(packageRecord.headline);
  const theyHeadline = text(packageRecord.headline_they);
  const rowHeadline = text(row.headline);
  const headline = packageHeadline || (rowHeadline.includes("{{") ? rowHeadline : "");
  const splitHeadline = Boolean(theyHeadline && theyHeadline !== headline);
  if (headline) {
    add("headline", "Headline", headline, splitHeadline ? "you" : undefined);
  }
  if (splitHeadline) add("headline_they", "Headline", theyHeadline, "they");
  const youBody = text(packageRecord.body_you);
  const theyBody = text(packageRecord.body_they);
  const packageBody = text(packageRecord.body);
  const mainBody = packageBody || (!youBody && !theyBody ? text(row.body) : "");
  const splitBody = Boolean(theyBody && theyBody !== (youBody || mainBody));
  add("body_you", "Passage", youBody, splitBody ? "you" : undefined);
  if (splitBody) add("body_they", "Passage", theyBody, "they");
  add("body", youBody ? "Main passage" : "Passage", mainBody, splitBody && !youBody ? "you" : undefined);
  ([
    ["opening", "Opening"],
    ["tension", "Tension"],
    ["development", "Development"],
    ["close", "Close"]
  ] as const).forEach(([key, label]) => add(key, label, packageRecord[key]));
  return candidates;
}

function buildCompositionPreview(
  row: CompositionMapRow,
  slots: CompositionMapSlot[],
  options: CompositionPreviewOptions = {}
): CompositionPreview {
  const values = new Map<string, string>();
  slots.forEach((slot) => {
    values.set(slot.name, slot.requirement === "Optional"
      ? ""
      : representativeExampleForRow(row, slot.name, slot.example));
  });
  Object.entries(options.exampleValues ?? {}).forEach(([name, value]) => values.set(name, value));
  const sources: CompositionMapSource[] = [];
  const selectedSavedSlots = new Set<string>();
  const fields = compositionPreviewFields(row).map((field) => {
      const fieldValues = new Map(values);
      const sourceByName = new Map<string, CompositionMapSource>();
      const audience = field.audience === "they" ? "they" : "you";
      slots.forEach((slot) => {
        const source = representativeSource(slot, slots, values, options.includeOptionalSources);
        if (!source) return;
        fieldValues.set(slot.name, previewSourceText(source, audience, slot.name));
        sourceByName.set(slot.name, source);
        selectedSavedSlots.add(slot.name);
      });
      if (!fieldValues.has("transitTopic")) fieldValues.set("transitTopic", `${values.get("transitTitle") ?? "Transit"}'s focus`);
      if (!fieldValues.has("natalCore")) fieldValues.set("natalCore", `${values.get("natalTitle") ?? "natal"} themes`);
      if (!fieldValues.has("natalArea")) fieldValues.set("natalArea", `${values.get("natalTitle") ?? "Natal"} themes`);
      if (!fieldValues.has("transitEffect") && fieldValues.get("transitEffectLine")) fieldValues.set("transitEffect", fieldValues.get("transitEffectLine") ?? "");
      if (audience === "they") {
        fieldValues.set("possessive", "Maya's");
        fieldValues.set("possessiveLow", "Maya's");
      }
      const segments = previewSegments(field.value, fieldValues, slots, sourceByName);
      segments.forEach((segment) => {
        if (segment.source && !sources.some((candidate) => candidate.row.content_key === segment.source?.row.content_key)) sources.push(segment.source);
      });
      return {
        audience: field.audience,
        key: field.key,
        label: field.label,
        paragraphs: previewParagraphs(segments),
        template: field.value,
        rendered: segments.map((segment) => segment.text).join("")
      };
    });
  const requiredSavedSlots = slots.filter((slot) => slot.requirement === "Required" && slot.sourceKind === "saved-copy");
  const untraceableSlots = requiredSavedSlots.filter((slot) => (
    slot.sourceContract.confidence === "inferred" || !selectedSavedSlots.has(slot.name)
  ));
  const lineage = untraceableSlots.length === 0 ? "runtime-traceable" : "not-traceable";
  return {
    fields,
    facts: slots
      .filter((slot) => slot.sourceKind === "runtime")
      .map((slot) => ({
        label: slot.label,
        name: slot.name,
        value: values.get(slot.name) ?? representativeExampleForRow(row, slot.name, slot.example)
      })),
    lineage,
    lineageNote: lineage === "runtime-traceable"
      ? "Every required saved-copy slot follows a declared resolver contract and resolves to one editable source for these sample facts."
      : `The runtime source cannot be proven for ${untraceableSlots.map((slot) => `{{${slot.name}}}`).join(", ")}. The preview is incomplete until that lineage is declared.`,
    sources
  };
}

function buildCompositionTemplateWithCache(
  row: CompositionMapRow,
  rows: CompositionMapRow[],
  cache: AtomicVariableCaches,
  previewOptions: CompositionPreviewOptions = {}
): CompositionMapTemplate {
    const packageRecord = packageRecordForRow(row);
    const references = atomicVariableReferences(row, rows, cache);
    const slots = references.map((reference): CompositionMapSlot => {
      const candidates = sourceCandidates(reference, rows, row.content_key, cache);
      const sourceContract = templateVariableSourceContract(reference, row.content_key);
      const sources = candidates.map((candidate) => ({
        kind: sourceKind(candidate),
        label: sourceLabel(candidate),
        row: candidate
      }));
      return {
        ...reference,
        sourceContract,
        sources,
        issue: reference.sourceKind === "unmapped" && sources.length === 0
          ? "Declared by the template, but no canonical source row or active resolver value is wired."
          : reference.sourceKind === "saved-copy" && sources.length === 0
          ? "No saved hook or phrase is linked to this slot."
          : reference.source === "Runtime resolver"
            ? "This runtime value does not have an atomic provenance definition."
            : sourceContract.confidence === "inferred"
              ? "The source family was inferred from the variable name instead of declared by a resolver contract."
            : null
      };
    });
    const issues = slots.flatMap((slot) => slot.issue ? [`${slot.label}: ${slot.issue}`] : []);
    if (compositionDestination(row) === "Reader destination not declared") {
      issues.unshift("Reader destination is not declared.");
    }
    if (slots.length === 0) issues.push("No template slots were detected.");
    if (/^slot-template\/[2-6][a-z]$/iu.test(row.content_key)) {
      issues.push("Legacy template ID needs an explicit human destination and name.");
    }
    const preview = buildCompositionPreview(row, slots, previewOptions);
    return {
      destination: compositionDestination(row),
      description: text(row.summary) || "No editor-facing template description has been saved.",
      issues,
      label: compositionTemplateLabel(row),
      preview,
      row,
      slots
    };
}

export function buildCompositionTemplate(
  row: CompositionMapRow,
  rows: CompositionMapRow[],
  previewOptions: CompositionPreviewOptions = {}
) {
  return buildCompositionTemplateWithCache(row, rows, { candidates: new Map(), nested: new Map() }, previewOptions);
}

export function buildCompositionMap(rows: CompositionMapRow[]): CompositionMapTemplate[] {
  const templates = rows.filter(isCompositionTemplateRow);
  const cache: AtomicVariableCaches = { candidates: new Map(), nested: new Map() };
  return templates.map((row) => buildCompositionTemplateWithCache(row, rows, cache))
    .sort((left, right) => left.destination.localeCompare(right.destination)
    || left.label.localeCompare(right.label));
}

/** Stable content key for memoising a template preview whose row object is rebuilt each render. */
export function compositionTemplateKey(row: CompositionMapRow) {
  return [row.content_key, row.headline, row.summary, row.body, row.surface, row.status, row.block_type, JSON.stringify(row.sections ?? null), JSON.stringify(row.source_snapshot ?? null)].join("\u0000");
}
