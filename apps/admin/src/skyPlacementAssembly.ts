import type { CompositionMapRow } from "./compositionMap";
import { effectivePackageRecord, packageValueAt } from "./skyFallbackWorkspace";
import { skyV4StudioDefinition } from "./skyV4ContentStudio";

export type SkyPlacementWriting = "article" | "fallback";
export type SkyPlacementSelection = { planet: string; sign: string; motion: string };
export const skyRetrogradeBodies = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"]);
export type SkyPlacementAssemblyField = {
  row: CompositionMapRow;
  path: string;
  label: string;
  value: string;
  kind: "copy" | "hook";
};

export function skyPlacementAssemblyFields(row: CompositionMapRow): SkyPlacementAssemblyField[] {
  const source = effectivePackageRecord(row.sections);
  return skyV4StudioDefinition(source).editableFields.map(field => ({
    row,
    path: field.path,
    label: field.label.replace(/ draft$/u, ""),
    value: packageValueAt(source, field.path),
    kind: row.content_key.includes("/retrograde/") || field.path.startsWith("fallback.") ? "hook" : "copy"
  }));
}

export function skyPlacementAssembly(rows: CompositionMapRow[], writing: SkyPlacementWriting) {
  const fields = rows.flatMap(skyPlacementAssemblyFields);
  const retrograde = fields.filter(field => field.row.content_key.includes("/retrograde/") && field.path === "Body");
  const placement = fields.filter(field => !field.row.content_key.includes("/retrograde/"));
  const fallback = placement.filter(field => field.path.startsWith("fallback."));
  const article = placement.filter(field => !field.path.startsWith("fallback."));
  const tldr = article.filter(field => /^(?:tldrWhat|tldrTakeaway|TLDR_What|TLDR_Takeaway)$/u.test(field.path));
  // This is the field order of renderSkyV4ReaderRoute / the canonical fallback
  // preview. Dynamic event overlays, dates, aspects and horoscopes need chart
  // facts, so this editor explicitly previews the base placement writing only.
  return { fields, parts: writing === "fallback" ? [...retrograde, ...tldr, ...fallback] : [...retrograde, ...article], hasFallback: fallback.length > 0 };
}
