export type CompositionTemplateCandidateRow = {
  block_type?: string | null;
  content_key: string;
  sections: unknown;
  source_snapshot?: unknown;
};

function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function rowRole(row: CompositionTemplateCandidateRow) {
  const sections = objectRecord(row.sections);
  const packageRole = text(objectRecord(sections?.packageRecord)?.content_role);
  const snapshotRole = text(objectRecord(row.source_snapshot)?.content_role);
  return packageRole || snapshotRole;
}

export function isCompositionTemplateRow(row: CompositionTemplateCandidateRow) {
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
