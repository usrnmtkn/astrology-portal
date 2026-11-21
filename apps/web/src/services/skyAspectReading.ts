import { resolveCmsSurfaceOverride } from "../content/cmsSurfaceOverrideRendering.js";
import { contentPublication, publicationAllowsContent, publicationRestoresBaseline, type ContentPublication } from "../content/contentPublicationState.js";
import { isRetiredCompositionKey } from "../content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";
import { resolveCalendarAspectPublication } from "../features/calendar/calendarAspectPublication.js";
import { withCalendarAspectRetrograde } from "./calendarAspectRetrogradeContent.js";
import type { LiveGeneratedContent } from "./generatedContent.js";
import { calendarAspectPublicationKeys, contentStudioExactSkyAspectKeys, contentStudioExactRow, resolveSkyAspectContentStudioExact,
  resolveSkyAspectGeneratedContent, resolveSkyAspectOwnerAuthoredSigned } from "./skyAspectContent.js";
import { resolveApprovedExactSkyAspectCopy, resolveComposedSkyCalendarCard, selectSkyAspectCopyByPrecedence,
  type ApprovedExactSkyAspectLookup, type SkyCalendarComposedCardLookup } from "./skyAspectRouting.js";
import type { TemplateSlotValues } from "./templateInterpolation.js";
import { slugContentPart } from "./generatedContentKeys.js";

export type SkyAspectReading = {
  body: string;
  details?: string;
  layer: "authored" | "fallback" | "generated";
  sourceKeys: string[];
  tier: string;
};

type AspectOptions = Parameters<typeof resolveSkyAspectContentStudioExact>[0];
type ReadingOptions = AspectOptions & {
  dateLine: string;
  exactLookup?: ApprovedExactSkyAspectLookup | null;
  composedLookup?: SkyCalendarComposedCardLookup | null;
  signSpecific?: SkyAspectReading | null;
  phrasebook?: SkyAspectReading | null;
  publications?: ReadonlyMap<string, ContentPublication>;
};

/** PA-092's final selected master supersedes its earlier signed publication. */
export function resolveSkyAspectMasterOverride(options: AspectOptions, publications?: ReadonlyMap<string, ContentPublication>) {
  const contentKey = "sky.aspect.mercury.square.mars";
  if (!contentStudioExactSkyAspectKeys(options.first, options.aspect, options.second).includes(contentKey)
    || !resolveCmsSurfaceOverride(options.generatedContent, [contentKey], {}, publications?.get.bind(publications))) return null;
  const exact = resolveSkyAspectContentStudioExact(options);
  if (!exact || !publicationAllowsContent(contentKey, exact.content.id, exact.content.updatedAt, undefined, publications)) {
    return { sourceKeys: [contentKey], content: null, body: "" };
  }
  return { sourceKeys: [contentKey], ...exact };
}

/** One complete reading for Calendar, Sky cards/articles, and calendar feeds.
 * Inputs are calculated facts, admitted public rows, and approved package lookups.
 * A surface must not run its own competing prose precedence after this selection. */
export function resolveSkyAspectReading(options: ReadingOptions): SkyAspectReading | null {
  const { generatedContent, first, second, aspect, dateLine, publications } = options;
  const heading = `${first} ${aspect} ${second}`;
  const slots: TemplateSlotValues = { planetA: first, planetB: second, signA: options.firstSign,
    signB: options.secondSign, aspect: slugContentPart(aspect), dateLine };
  const publicationFor = (key: string) => publications ? publications.get(key) : contentPublication(key);
  const retired = (key: string) => isRetiredCompositionKey(key) || publicationFor(key)?.state === "retired";
  const exactKeys = contentStudioExactSkyAspectKeys(first, aspect, second);
  const calendarKeys = calendarAspectPublicationKeys(options);
  if (exactKeys.slice(0, 1).some(retired)) return null;

  const master = resolveSkyAspectMasterOverride(options, publications);
  if (master) return master.body ? { body: master.body, layer: "authored",
    tier: "content-studio-exact-sky-aspect-v1", sourceKeys: master.sourceKeys } : null;
  if (calendarKeys.some(retired)) return null;

  const allowed = (reading: SkyAspectReading | null) => reading?.sourceKeys.every(key =>
    publicationAllowsContent(key, undefined, undefined, undefined, publications)) ? reading : null;
  const bundledComposed = allowed(resolveComposedSkyCalendarCard({ first, second, aspect, heading, slots, lookup: options.composedLookup }));
  const publication = resolveCalendarAspectPublication(options);
  if (!publication && calendarKeys.some(key => {
    const pin = publicationFor(key);
    return pin?.state === "live" && !publicationRestoresBaseline(pin);
  })) return null;
  // A published replacement is complete. Do not append the older card's details.
  const composed: SkyAspectReading | null = publication ? { body: publication.body,
    layer: "authored", tier: "content-studio-calendar-publication-v1", sourceKeys: [publication.content.contentKey] } : bundledComposed;
  const signed = resolveSkyAspectOwnerAuthoredSigned(options);
  const studio = resolveSkyAspectContentStudioExact(options);
  // A missing pinned version must never expose an older baseline underneath it.
  if (!composed && !signed && exactKeys.some(key => {
    const pin = publicationFor(key);
    const [, , a, relation, b] = key.split(".");
    return pin?.state === "live" && (pin.row_id || pin.row_updated_at)
      && !contentStudioExactRow(generatedContent, { a, aspect: relation, b });
  })) return null;
  const studioSelected = signed ?? studio;
  const exact: SkyAspectReading | null = studioSelected
    ? { body: studioSelected.body, layer: "authored",
        tier: signed ? "content-studio-signed-sky-aspect-v1" : "content-studio-exact-sky-aspect-v1",
        sourceKeys: [studioSelected.content.contentKey] }
    : allowed(resolveApprovedExactSkyAspectCopy({ first, second, aspect, heading, slots, lookup: options.exactLookup }));
  const generated = resolveSkyAspectGeneratedContent(options);
  const selected = selectSkyAspectCopyByPrecedence<SkyAspectReading>({ composed, exact,
    signSpecific: options.signSpecific, phrasebook: options.phrasebook,
    generated: generated ? { body: generated.body, layer: "generated", tier: "generated-sky-aspect-lint-v1",
      sourceKeys: [generated.content.contentKey, generated.pairSource] } : null });
  if (!selected) return null;

  const packageSelected = selected === options.signSpecific || selected === bundledComposed;
  const source = packageSelected ? selected.sourceKeys.map(key => generatedContent.get(key)).find(Boolean) : undefined;
  const motion = source ? withCalendarAspectRetrograde(source, options) : null;
  return motion && motion !== source ? { ...selected, body: motion.body } : selected;
}
