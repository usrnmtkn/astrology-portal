import { templateVariableReferences, type TemplateVariableReference } from "./templateVariableReference";
import { templateVariableSourceCandidates } from "./templateVariableSources";

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

export type CompositionMapTemplate = {
  destination: string;
  description: string;
  issues: string[];
  label: string;
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

export function isCompositionTemplateRow(row: CompositionMapRow) {
  const role = rowRole(row);
  if (role === "template") return true;
  if (row.content_key.startsWith("fallback-hook/")
    || row.content_key.startsWith("fallback-vocab/")
    || row.content_key.startsWith("vocab/")) return false;
  return row.content_key.startsWith("slot-template/")
    || row.content_key.startsWith("fallback-template/")
    || row.block_type === "template"
    || row.block_type === "fallback_template";
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
  let label = text(row.headline) || humanize(row.content_key.split("/").at(-1) ?? "Template");
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
    return {
      destination: compositionDestination(row),
      description: text(row.summary) || "No editor-facing template description has been saved.",
      issues,
      label: compositionTemplateLabel(row),
      row,
      slots
    };
  }).sort((left, right) => left.destination.localeCompare(right.destination)
    || left.label.localeCompare(right.label));
}
