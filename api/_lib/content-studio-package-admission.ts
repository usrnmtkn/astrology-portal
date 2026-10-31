import { calendarPassageIdentity, calendarPassageErrors } from '../../src/calendar-writing/passageContract.js';
import { isLunationHoroscopeKey } from '../../src/shared/lunationHoroscopeIdentity.js';
import { fallbackHoroscopeEditorialIssue } from '../../src/shared/horoscopeEditorialPolicy.js';
import { createHash } from 'node:crypto';
import { isLunationEclipseSectionKey, isStudioLunationRevision } from '../../apps/web/src/content/fallbackArchitectureV3/resolver/lunationStudioRevision.mjs';
import { calendarTransitionPhraseRecordForKey } from "./calendar-transition-phrase-sources.js";
import { isCalendarMoonIngressContentKey } from "./calendar-moon-ingress-sources.js";
import coreManifest from "../../apps/web/src/content/fallbackArchitectureV3/bundled-core-manifest-v3.json" with { type: "json" };
import skyManifest from "../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json" with { type: "json" };
import { isFallbackDashboardRecordAllowed } from "../../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.js";
import lunarJournalIndex from "../../apps/web/src/features/calendar/data/lunar-journal.index.json" with { type: "json" };
import { isConnectionSourceKey, connectionSourceErrors, CONNECTION_ACTIVATION_PREFIX } from "../../apps/web/src/content/connectionTransit.js";
import { SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX, SKY_PLACEMENT_ASPECT_BRIDGE_POLICY, skyPlacementAspectBridgeErrors } from '../../apps/web/src/content/skyPlacementAspectBridge.js';

const keys = (manifest: { keys: string[] }) => new Set(manifest.keys.map(key => key.slice(key.indexOf(":") + 1)));
const coreKeys = keys(coreManifest);
const skyKeys = keys(skyManifest);
const lunarJournalKeys = new Set(lunarJournalIndex.map(entry => entry.contentKey));
export const isRegisteredLunarJournalKey = (key: string) => lunarJournalKeys.has(key);
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
  const editorialIssue = fallbackHoroscopeEditorialIssue(key, record);
  if (editorialIssue) return editorialIssue;
  if (record.contentKey && record.contentKey !== key) return "The source and publication have different content keys. Reopen the correct source before publishing.";
  if (isLunationEclipseSectionKey(key) || isLunationHoroscopeKey(key) && record.studio_lunation_revision) {
    if (!isStudioLunationRevision(record) || typeof record.body !== 'string'
      || createHash('sha256').update(record.body).digest('hex') !== record.protected_content?.body_sha256
      || row.body !== record.body) return 'Publish this complete lunation revision with its explicit owner action and matching integrity receipt.';
    return null;
  }
  if (key.startsWith(SKY_PLACEMENT_ASPECT_BRIDGE_PREFIX)) {
    if (record.content_role !== 'fallback_hook' || record.render_policy !== SKY_PLACEMENT_ASPECT_BRIDGE_POLICY) return 'Reopen this house × aspect bridge before publishing.';
    return skyPlacementAspectBridgeErrors(key, typeof record.body === 'string' ? record.body : '').join(' ') || null;
  }
  if (isConnectionSourceKey(key)) {
    const body = key.startsWith(CONNECTION_ACTIVATION_PREFIX) ? record.body_you : record.body;
    return connectionSourceErrors(key, typeof body === "string" ? body : "").join(" ") || null;
  }
  if (key.startsWith("calendar-passage/")) {
    const identity = calendarPassageIdentity(key);
    if (!identity) return "Invalid Calendar passage identity.";
    if (identity.period === 'monthly') return "Publish Monthly editions in Horoscopes. Calendar Month uses that edition's authored TLDR; legacy Calendar monthly passages are retained as drafts only.";
    return calendarPassageErrors(String(row.body ?? "")).join(" ") || null;
  }
  // Calendar's governed exact records have their own targeted reader and
  // owner-approval path, rather than the fallback package loader.
  if (record.source_package === "CALENDAR-ASPECT-CONSEQUENCE-FIRST-CONTENT-STUDIO-2026-09-01") return null;
  const exact = object(snapshot.exactSkyAspectIdentity);
  if (snapshot.contentStudioExactAspect === true && exact.a && exact.b && exact.aspect
    && key === `sky.aspect.${exact.a}.${exact.aspect}.${exact.b}`) return null;
  // Compatibility has a separate dynamically keyed loader.
  if (key.startsWith("authored/compat-pair/")) return null;
  if (isLunationHoroscopeKey(key)) return null;
  // Calendar leftover season transitions have a dedicated leftover reader, not the fallback package loader.
  if (key.startsWith("authored/calendar-season-transition/")) return null;
  if (isRegisteredLunarJournalKey(key)) return null;
  // Moon ingresses and transition phrases use dedicated Calendar readers. Admit only registered sources.
  if (isCalendarMoonIngressContentKey(key) || calendarTransitionPhraseRecordForKey(key)) return null;
  // Education articles have a dedicated /learn reader, not the fallback package loader.
  if (row.surface === "education" || key.startsWith("education/astro-101/")) return null;
  if (skyKeys.has(key) || isFallbackDashboardRecordAllowed({ ...record, contentKey: key }, coreKeys)) return null;
  return "This content key has no supported reader route. Save it as a draft; connect it to a supported reader source before publishing.";
}
