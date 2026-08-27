import { templateVariableReferences, type TemplateVariableReference } from "./templateVariableReference";
import { templateVariableSourceCandidates } from "./templateVariableSources";
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

export type CompositionMapSourceKind = "hook" | "phrase";

export type CompositionMapSource = {
  kind: CompositionMapSourceKind;
  label: string;
  row: CompositionMapRow;
};

export type CompositionMapSlot = TemplateVariableReference & {
  sources: CompositionMapSource[];
  issue: string | null;
};

export type CompositionPreviewField = {
  key: string;
  label: string;
  rendered: string;
  template: string;
};

export type CompositionPreviewFact = {
  label: string;
  name: string;
  value: string;
};

export type CompositionPreview = {
  facts: CompositionPreviewFact[];
  fields: CompositionPreviewField[];
  sources: CompositionMapSource[];
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
  return row.content_key.startsWith("vocab/")
    || row.content_key.startsWith("fallback-vocab/")
    || row.block_type === "vocabulary_phrase"
    || role === "vocabulary"
    ? "phrase"
    : "hook";
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
  if (name === "planetTitle") {
    const planetVariant = row.content_key.match(/^fallback-template\/natal\.planet-in-sign\/([^/]+)$/u)?.[1];
    if (planetVariant) return humanize(planetVariant);
    if (row.content_key === "fallback-template/natal.node-in-sign") return "North Node";
    if (row.content_key === "fallback-template/sky-placement-frame-v3") return "Jupiter";
  }
  return representativeExample(name, example);
}

function previewSourceText(source: CompositionMapSource) {
  const packageRecord = packageRecordForRow(source.row);
  return text(packageRecord.body)
    || text(packageRecord.body_you)
    || text(source.row.body)
    || text(source.row.summary)
    || text(source.row.headline);
}

function fallbackPreviewValue(name: string) {
  const reference = templateVariableReferences({ Preview: `{{${name}}}` })[0];
  return representativeExample(name, reference?.example ?? humanize(name));
}

function renderPreviewText(template: string, values: Map<string, string>, seen = new Set<string>()): string {
  const resolve = (name: string) => {
    if (seen.has(name)) return fallbackPreviewValue(name);
    if (!values.has(name)) return fallbackPreviewValue(name);
    const raw = values.get(name) ?? "";
    if (!raw) return "";
    return renderPreviewText(raw, values, new Set([...seen, name]));
  };
  let rendered = template;
  const sectionPattern = /\{\{\s*([#^])\s*([\w.-]+)\s*\}\}([\s\S]*?)\{\{\s*\/\s*\2\s*\}\}/gu;
  for (let pass = 0; pass < 4 && sectionPattern.test(rendered); pass += 1) {
    sectionPattern.lastIndex = 0;
    rendered = rendered.replace(sectionPattern, (_match, marker: string, name: string, content: string) => {
      const value = resolve(name);
      const include = marker === "#" ? Boolean(value) : !value;
      return include
        ? ` ${renderPreviewText(content.replace(/\{\{\s*\.\s*\}\}/gu, value), values, new Set([...seen, name]))} `
        : "";
    });
  }
  return rendered
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/gu, (_match, name: string) => resolve(name))
    .replace(/\{\{[^}]+\}\}/gu, "")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/[ \t]{2,}/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function compositionPreviewFields(row: CompositionMapRow) {
  const packageRecord = packageRecordForRow(row);
  const candidates: Array<{ key: string; label: string; value: string }> = [];
  const add = (key: string, label: string, value: unknown) => {
    const normalized = text(value);
    if (!normalized || candidates.some((candidate) => candidate.value === normalized)) return;
    candidates.push({ key, label, value: normalized });
  };
  const packageHeadline = text(packageRecord.headline);
  const rowHeadline = text(row.headline);
  if (packageHeadline || rowHeadline.includes("{{")) {
    add("headline", "Headline", packageHeadline || rowHeadline);
  }
  add("body_you", "Direct-to-reader version", packageRecord.body_you);
  add("body_they", "Third-person version", packageRecord.body_they);
  add("body", "Main passage", packageRecord.body || row.body);
  ([
    ["opening", "Opening"],
    ["tension", "Tension"],
    ["development", "Development"],
    ["close", "Close"]
  ] as const).forEach(([key, label]) => add(key, label, packageRecord[key]));
  return candidates;
}

function buildCompositionPreview(row: CompositionMapRow, slots: CompositionMapSlot[]): CompositionPreview {
  const values = new Map<string, string>();
  slots.forEach((slot) => {
    const sourceValue = slot.requirement !== "Optional" && slot.sources.length === 1
      ? previewSourceText(slot.sources[0])
      : "";
    values.set(slot.name, slot.requirement === "Optional"
      ? ""
      : sourceValue || representativeExampleForRow(row, slot.name, slot.example));
  });
  const sources = slots.flatMap((slot) => slot.requirement !== "Optional" && slot.sources.length === 1 ? slot.sources : [])
    .filter((source, index, list) => list.findIndex((candidate) => candidate.row.id === source.row.id) === index);
  return {
    fields: compositionPreviewFields(row).map((field) => {
      const fieldValues = new Map(values);
      if (field.key === "body_they") {
        fieldValues.set("possessive", "Maya's");
        fieldValues.set("possessiveLow", "Maya's");
      }
      return {
        key: field.key,
        label: field.label,
        template: field.value,
        rendered: renderPreviewText(field.value, fieldValues)
      };
    }),
    facts: slots
      .filter((slot) => slot.sourceKind === "runtime")
      .map((slot) => ({
        label: slot.label,
        name: slot.name,
        value: representativeExampleForRow(row, slot.name, slot.example)
      })),
    sources
  };
}

export function buildCompositionMap(rows: CompositionMapRow[]): CompositionMapTemplate[] {
  const templates = rows.filter(isCompositionTemplateRow);
  return templates.map((row) => {
    const packageRecord = packageRecordForRow(row);
    const references = templateVariableReferences({
      Headline: row.headline ?? "",
      Summary: row.summary ?? "",
      Body: row.body ?? ""
    }, packageRecord);
    const slots = references.map((reference): CompositionMapSlot => {
      const candidates = reference.sourceKind === "saved-copy"
        ? templateVariableSourceCandidates(reference, rows, row.content_key)
        : [];
      const sources = candidates.map((candidate) => ({
        kind: sourceKind(candidate),
        label: sourceLabel(candidate),
        row: candidate
      }));
      return {
        ...reference,
        sources,
        issue: reference.sourceKind === "saved-copy" && sources.length === 0
          ? "No saved hook or phrase is linked to this slot."
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
    const preview = buildCompositionPreview(row, slots);
    return {
      destination: compositionDestination(row),
      description: text(row.summary) || "No editor-facing template description has been saved.",
      issues,
      label: compositionTemplateLabel(row),
      preview,
      row,
      slots
    };
  }).sort((left, right) => left.destination.localeCompare(right.destination)
    || left.label.localeCompare(right.label));
}
