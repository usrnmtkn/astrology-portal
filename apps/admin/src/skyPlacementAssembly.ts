import type { CompositionMapRow } from "./compositionMap";
import { effectivePackageRecord, packageValueAt, skyFallbackWorkspace } from "./skyFallbackWorkspace";
import { skyV4StudioDefinition } from "./skyV4ContentStudio";
import type { SkyEditorialSection } from "./skyArticleOutlines";
// @ts-ignore Shared canonical evergreen layout used by the reader.
import { isSkyEvergreenSource, skyPlacementArticlePath, skyEvergreenFields, skyEvergreenLayout, SKY_EVERGREEN_SECTIONS_PATH } from "../../web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs";

export type SkyPlacementWriting = "article" | "fallback";
export type SkyPlacementSelection = { planet: string; sign: string; motion: string };
export const skyRetrogradeBodies = new Set(["mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"]);
export type SkyPlacementAssemblyField = {
  row: CompositionMapRow;
  path: string;
  label: string;
  value: string;
  kind: "copy" | "hook";
  motion?: string;
  editorial?: SkyEditorialSection;
};

export function skyPlacementAssemblyFields(row: CompositionMapRow): SkyPlacementAssemblyField[] {
  const source = effectivePackageRecord(row.sections);
  const definition = skyV4StudioDefinition(source).editableFields;
  const editable = definition.length ? definition : (skyFallbackWorkspace(row.content_key, row.sections)?.fields ?? []).map(field => ({ path: field.key, label: field.label }));
  if (!editable.length && typeof source.body_you === "string") editable.push({ path: "body_you", label: "Placement passage" });
  const fields: SkyPlacementAssemblyField[] = editable
    .filter(field => field.path !== "ingress" && field.path !== SKY_EVERGREEN_SECTIONS_PATH && (!isSkyEvergreenSource(source) || !field.path.startsWith("fallback.")))
    .map(field => ({
    row,
    path: field.path,
    label: field.label.replace(/ draft$/u, ""),
    value: packageValueAt(source, field.path),
    kind: row.content_key.includes("/retrograde/") || field.path.startsWith("fallback.") ? "hook" : "copy"
  }));
  if (isSkyEvergreenSource(source)) fields.push(...skyEvergreenFields(source).map((field: { id: string; path: string; label: string; value: string; motion: string }) => ({
    row, path: field.path, label: field.label, value: field.value, motion: field.motion, kind: "hook" as const,
    editorial: skyEvergreenLayout(source).find((section: SkyEditorialSection) => section.id === field.id)
  })));
  return fields;
}

export function skyPlacementAssembly(rows: CompositionMapRow[], writing: SkyPlacementWriting, motion = rows.some(row => row.content_key.includes("/retrograde/")) ? "retrograde" : "direct") {
  const fields = rows.flatMap(skyPlacementAssemblyFields);
  const retrograde = fields.filter(field => field.row.content_key.includes("/retrograde/") && field.path === "Body" && motion === "retrograde");
  const seasonal = fields.filter(field => field.row.content_key.startsWith("sky-placement/seasonal-context/"));
  const placement = fields.filter(field => !field.row.content_key.includes("/retrograde/") && !field.row.content_key.startsWith("sky-placement/seasonal-context/"));
  const fallback = placement.filter(field => field.path.startsWith("fallback.") && (!field.motion || field.motion === "all" || field.motion === motion));
  const article = placement.filter(field => (!field.row.content_key.startsWith("sky-nodes/axis/") || field.path === "NodeAxisArticle") && !field.path.startsWith("fallback.") && (!/^placementArticle/u.test(field.path) || field.path === skyPlacementArticlePath(effectivePackageRecord(field.row.sections), motion)));
  const tldr = article.filter(field => /^(?:tldrWhat|tldrTakeaway|TLDR_What|TLDR_Takeaway)$/u.test(field.path));
  const articleWithSeasonal = seasonal.length
    ? [...tldr, ...seasonal, ...article.filter(field => !tldr.includes(field))] : article;
  // This is the field order of renderSkyV4ReaderRoute / the canonical fallback
  // preview. Seasonal writing uses the selected preview hemisphere.
  // Dynamic event overlays, dates, aspects and horoscopes need chart
  // facts, so this editor explicitly previews the base placement writing only.
  return { fields, parts: writing === "fallback" ? [...retrograde, ...tldr, ...seasonal, ...fallback] : [...retrograde, ...articleWithSeasonal], hasFallback: fields.some(field => field.path.startsWith("fallback.")) };
}
