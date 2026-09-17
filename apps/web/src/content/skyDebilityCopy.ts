import type { CmsGeneratedContentMap } from "./cmsSurfaceOverrides";
import { contentPublication, publicationAllowsContent } from "./contentPublicationState";
import {
  skyDebilityDefaults,
  skyDebilityField,
  skyDebilityFields,
  skyDebilityTemplateErrors
} from "./skyDebilityCatalog";
import { interpolateTemplateString } from "../services/templateInterpolation";
import type { TraditionalSkyDebilities } from "../services/planetSignDignity.mjs";

type DebilityTemplateName = keyof typeof skyDebilityDefaults;

export function skyDebilityContentKeys() {
  return skyDebilityFields.map(field => field.key);
}

function savedCopy(content: CmsGeneratedContentMap | undefined, key: string, fallback: string) {
  const publication = contentPublication(key);
  const row = content?.get(key);
  if (publication?.state === "retired") return "";
  if (publication) {
    const usable = Boolean(row && publicationAllowsContent(key, row.id, row.updatedAt)
      && (!row.status || row.status === "LIVE") && row.body.trim() && skyDebilityTemplateErrors(key, row.body).length === 0);
    return usable && row ? row.body.trim() : fallback;
  }
  if (!row || (row.status && row.status !== "LIVE") || !row.body.trim() || skyDebilityTemplateErrors(key, row.body).length) {
    return fallback;
  }
  return row.body.trim();
}

export function skyDebilitySlots(snapshot: TraditionalSkyDebilities) {
  return {
    count: String(snapshot.count),
    total: String(snapshot.traditionalCount),
    planetWord: snapshot.count === 1 ? "planet" : "planets"
  };
}

export function resolveSkyDebilityCopy(content: CmsGeneratedContentMap | undefined, snapshot: TraditionalSkyDebilities) {
  const slots = skyDebilitySlots(snapshot);
  const templates = Object.fromEntries((Object.keys(skyDebilityDefaults) as DebilityTemplateName[]).map(name => {
    const key = `cms/sky-debility/${name}`;
    return [name, savedCopy(content, key, skyDebilityField(key)?.body ?? skyDebilityDefaults[name])];
  })) as Record<DebilityTemplateName, string>;
  const bodyKey = snapshot.count === 0 ? "none" : snapshot.count === 1 ? "one" : "many";
  const fill = (template: string, field: string) => interpolateTemplateString(template, slots, {
    contentKey: `cms/sky-debility/${field}`,
    field: "body",
    missingSlotBehavior: "empty"
  });
  return {
    titleLead: templates.titleLead,
    titleSoft: templates.titleSoft,
    countLabel: fill(templates.countLabel, "countLabel"),
    countUnit: fill(templates.countUnit, "countUnit"),
    body: fill(templates[bodyKey], bodyKey),
    accessibleName: `${templates.titleLead} ${templates.titleSoft}`.replace(/\s+/gu, " ").trim()
  };
}
