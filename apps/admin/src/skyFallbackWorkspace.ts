export type SkyFallbackField = {
  key: string;
  label: string;
  value: string;
};

export type SkyFallbackWorkspace = {
  kind: "article" | "aspect" | "legacy";
  title: string;
  fields: SkyFallbackField[];
  variables: string[];
};

const articleFieldOrder = [
  ["fact_line", "Date line"],
  ["opening", "Opening"],
  ["tension", "Tension"],
  ["development", "Development"],
  ["era_layer.frame", "Era frame"],
  ["era_layer.handoff", "Era handoff"],
  ["era_layer.recurrence", "Recurrence"],
  ["era_layer.collective_lesson", "Collective lesson"],
  ["close", "Close"]
] as const;

const aspectFieldOrder = [
  ["body", "Collective copy"],
  ["body_you", "Direct-address copy"],
  ["body_they", "Friend copy"]
] as const;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function packageValueAt(source: Record<string, unknown>, path: string): string {
  const value = path.split(".").reduce<unknown>((current, part) => record(current)[part], source);
  return typeof value === "string" ? value : "";
}

export function setPackageValueAt(source: Record<string, unknown>, path: string, value: string) {
  const next = structuredClone(source);
  const parts = path.split(".");
  let cursor = next;
  parts.slice(0, -1).forEach((part) => {
    cursor[part] = { ...record(cursor[part]) };
    cursor = cursor[part] as Record<string, unknown>;
  });
  cursor[parts.at(-1) ?? path] = value;
  return next;
}

export function packageDraftForSections(sections: unknown) {
  const sectionRecord = record(sections);
  return record(sectionRecord.packageDraft);
}

export function effectivePackageRecord(sections: unknown) {
  const sectionRecord = record(sections);
  return {
    ...record(sectionRecord.packageRecord),
    ...record(sectionRecord.packageDraft)
  };
}

export function placeholdersInPackage(source: Record<string, unknown>) {
  const slots = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      for (const match of value.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/gu)) slots.add(match[1]);
      return;
    }
    if (Array.isArray(value)) return value.forEach(visit);
    Object.values(record(value)).forEach(visit);
  };
  visit(source);
  return [...slots].sort();
}

export function skyFallbackWorkspace(contentKey: string, sections: unknown): SkyFallbackWorkspace | null {
  const source = effectivePackageRecord(sections);
  const renderPolicy = String(source.render_policy ?? "");
  const isArticle = contentKey.startsWith("fallback-hook/sky-sign-copy/") || renderPolicy === "sky-placement-continuous-v2";
  const isAspect = contentKey.includes("sky-aspect") || contentKey.includes("sky-placement-aspect");
  const configuredFields = isArticle ? articleFieldOrder : isAspect ? aspectFieldOrder : [];
  const fields = configuredFields
    .filter(([key]) => packageValueAt(source, key) !== "")
    .map(([key, label]) => ({ key, label, value: packageValueAt(source, key) }));

  if (!fields.length) return null;

  return {
    kind: isArticle ? "article" : isAspect ? "aspect" : "legacy",
    title: isArticle ? "Sky Placement article workspace" : "Sky aspect workspace",
    fields,
    variables: placeholdersInPackage(record(record(sections).packageRecord))
  };
}

export function packageDraftChanges(sections: unknown) {
  const sectionRecord = record(sections);
  const original = record(sectionRecord.packageRecord);
  const draft = record(sectionRecord.packageDraft);
  if (!Object.keys(draft).length) return [];
  const workspace = skyFallbackWorkspace(String(original.contentKey ?? ""), sections);
  if (!workspace) return [];
  return workspace.fields
    .map((field) => ({
      key: field.key,
      label: field.label,
      before: packageValueAt(original, field.key),
      after: packageValueAt(draft, field.key)
    }))
    .filter((change) => change.before !== change.after);
}

export function renderWorkspacePreview(fields: SkyFallbackField[], values: Record<string, string> = {}) {
  const fill = (copy: string) => copy.replace(/\{\{\s*([\w.-]+)\s*\}\}/gu, (_match, slot: string) => values[slot] ?? `{{${slot}}}`);
  return fields
    .filter((field) => field.key !== "fact_line")
    .map((field) => fill(field.value).trim())
    .filter(Boolean);
}
