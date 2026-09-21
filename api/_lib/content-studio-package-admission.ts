import coreManifest from "../../apps/web/src/content/fallbackArchitectureV3/bundled-core-manifest-v3.json" with { type: "json" };
import skyManifest from "../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json" with { type: "json" };
import { isFallbackDashboardRecordAllowed } from "../../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.js";

const keys = (manifest: { keys: string[] }) => new Set(manifest.keys.map(key => key.slice(key.indexOf(":") + 1)));
const coreKeys = keys(coreManifest);
const skyKeys = keys(skyManifest);
const object = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value : {};

/** Publication must use the same key admission as the actual package loaders. */
export function packagePublicationAdmissionIssue(row: Record<string, any>): string | null {
  if (row.status !== "LIVE") return null;
  const record = object(object(row.sections).packageRecord);
  const snapshot = object(row.source_snapshot);
  const facts = object(row.facts);
  const isPackage = row.provider === "tldrastro-fallback-architecture-v3"
    || row.provider === "tldrastro-fallback-architecture-v3-sky-placement"
    || snapshot.sourcePackage === "tldrastro-fallback-architecture-v3" || facts.fallbackArchitectureV3 === true;
  if (!isPackage) return null;
  const key = String(row.content_key ?? "");
  if (record.contentKey && record.contentKey !== key) return "The source and publication have different content keys. Reopen the correct source before publishing.";
  // Calendar's governed exact records have their own targeted reader and
  // owner-approval path, rather than the fallback package loader.
  if (record.source_package === "CALENDAR-ASPECT-CONSEQUENCE-FIRST-CONTENT-STUDIO-2026-09-01") return null;
  const exact = object(snapshot.exactSkyAspectIdentity);
  if (snapshot.contentStudioExactAspect === true && exact.a && exact.b && exact.aspect
    && key === `sky.aspect.${exact.a}.${exact.aspect}.${exact.b}`) return null;
  // Compatibility has a separate dynamically keyed loader.
  if (key.startsWith("authored/compat-pair/")) return null;
  // Calendar leftover season transitions have a dedicated leftover reader, not the fallback package loader.
  if (key.startsWith("authored/calendar-season-transition/")) return null;
  // Education articles have a dedicated /learn reader, not the fallback package loader.
  if (row.surface === "education" || key.startsWith("education/astro-101/")) return null;
  if (skyKeys.has(key) || isFallbackDashboardRecordAllowed({ ...record, contentKey: key }, coreKeys)) return null;
  return "This content key has no supported reader route. Save it as a draft; connect it to a supported reader source before publishing.";
}
