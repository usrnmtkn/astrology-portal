import type { SkyAspectReading } from "./skyAspectReading.js";
import type { resolveSkyAspectContentStudioExact } from "./skyAspectContent.js";
import { slugContentPart } from "./generatedContentKeys.js";
import { fullDetailReaderFacingCopy } from "../content/readerSafety.js";

// Lightweight calculated facts and package candidates. Selection stays in the deferred reader.
export function skyAspectPackageCandidates(
  facts: Pick<Parameters<typeof resolveSkyAspectContentStudioExact>[0], "first" | "second" | "aspect" | "firstSign" | "secondSign"> & { dateLine?: string },
  render: (input: { a: string; b: string; aspect: string; aSign?: string; bSign?: string; dateLine?: string }) => { contentKey?: string; parts: string[] },
  SourceGap: typeof Error
): { signSpecific?: SkyAspectReading; phrasebook?: SkyAspectReading } {
  try {
    const rendered = render({ a: slugContentPart(facts.first), b: slugContentPart(facts.second), aspect: slugContentPart(facts.aspect),
      aSign: facts.firstSign ? slugContentPart(facts.firstSign) : undefined,
      bSign: facts.secondSign ? slugContentPart(facts.secondSign) : undefined, dateLine: facts.dateLine });
    const key = rendered.contentKey;
    const body = key?.startsWith("fallback-hook/sky-aspect-") ? fullDetailReaderFacingCopy(rendered.parts) : null;
    if (!key || !body) return {};
    const reading: SkyAspectReading = { body, layer: "fallback", sourceKeys: [key], tier: "reviewed-sky-aspect-phrasebook-v1" };
    return key.startsWith("fallback-hook/sky-aspect-sign/") ? { signSpecific: reading } : { phrasebook: reading };
  } catch (error) {
    if (!(error instanceof SourceGap)) throw error;
    return {};
  }
}

export function skyAspectReadingDateLine(instant: string, timeZone: string) {
  return `On ${new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(new Date(instant))}`;
}
