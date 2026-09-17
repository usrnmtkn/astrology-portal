import type { CmsGeneratedContentMap } from "./cmsSurfaceOverrides";
import { contentPublication, publicationAllowsContent } from "./contentPublicationState.js";
import { skyDebilityField, skyDebilityFields } from "./skyDebilityCatalog.js";
import { assembleSkyDebilityCopy } from "./skyDebilityAssembly.js";
import type { TraditionalSkyDebilities } from "../services/planetSignDignity.mjs";
export { skyDebilitySlots } from "./skyDebilityAssembly.js";

export function skyDebilityContentKeys() { return skyDebilityFields.map(field => field.key); }

function savedCopy(content: CmsGeneratedContentMap | undefined, key: string) {
  const publication = contentPublication(key);
  const row = content?.get(key);
  if (publication?.state === "retired") return null;
  if (publication) {
    // Never substitute bundled wording for a missing, retired or stale published
    // revision. The shared loader owns last-known-good recovery.
    return row && publicationAllowsContent(key, row.id, row.updatedAt)
      && (!row.status || row.status === "LIVE") ? row.body : null;
  }
  if (row && (!row.status || row.status === "LIVE") && publicationAllowsContent(key, row.id, row.updatedAt)) return row.body;
  // A draft does not replace this owner-approved shipped baseline.
  return skyDebilityField(key)?.body;
}
export function resolveSkyDebilityCopy(content: CmsGeneratedContentMap | undefined, snapshot: TraditionalSkyDebilities) {
  return assembleSkyDebilityCopy(snapshot, key => savedCopy(content, key));
}
