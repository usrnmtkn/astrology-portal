import fallbackSourceRowsV3 from "./fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
import fallbackTemplatesV3 from "./fallbackArchitectureV3/templates/fallback-templates-v3.json";
import transitSynastryRowsV1 from "./fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json";
// The package ships a prebuilt ESM bundle. Keep resolver logic package-owned.
// @ts-ignore Package bundle is JavaScript-only; app-facing types live below.
import { createFallbackRenderer, createTransitSynastryRenderer, normalizeAspect, SourceGapError } from "./fallbackArchitectureV3/dist/tldr-content.js";

export { normalizeAspect, SourceGapError };

export type ReviewStatus = "approved" | "approved_reuse" | "reviewed" | string;

export type AuthoredCard = {
  contentKey: string;
  content_role?: string | null;
  headline?: string | null;
  body?: string | null;
  tag?: string | null;
  review_status?: ReviewStatus | null;
  [key: string]: unknown;
};

export type HookRow = {
  contentKey: string;
  content_role?: string | null;
  title?: string | null;
  body?: string | null;
  body_you?: string | null;
  body_they?: string | null;
  question?: string | null;
  review_status?: ReviewStatus | null;
  [key: string]: unknown;
};

export type VocabRow = {
  contentKey: string;
  content_role?: string | null;
  body?: string | null;
  review_status?: ReviewStatus | null;
  [key: string]: unknown;
};

export type TemplateRow = {
  contentKey: string;
  content_role?: string | null;
  body?: string | null;
  body_you?: string | null;
  body_they?: string | null;
  requiredSlots?: string[];
  review_status?: ReviewStatus | null;
  [key: string]: unknown;
};

export type TransitLibFile = {
  authoredCards: AuthoredCard[];
};

export type RowsFile = {
  hookRows?: HookRow[];
  vocabularyRows?: VocabRow[];
};

export type TemplatesFile = {
  templates: TemplateRow[];
};

export type FallbackArchitectureV3Bundle = {
  transitLib: TransitLibFile;
  templatesFile: TemplatesFile;
  rowsFile: RowsFile;
};

export type SkyEvent = {
  type: string;
  a?: string;
  b?: string;
  aspect?: string;
  sign?: string;
  aSign?: string;
  bSign?: string;
  dateLine?: string;
  [key: string]: unknown;
};

export type AngleFacts = {
  angle: "ascendant" | "descendant" | "midheaven" | "imum-coeli";
  sign: string;
  voice?: "you" | string;
  [key: string]: unknown;
};

export type AspectFacts = {
  planetA: string;
  planetB: string;
  aspect: "conjunction" | "opposition" | "square" | "trine" | "sextile";
  voice?: "you" | string;
  [key: string]: unknown;
};

const snapshotBundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: transitSynastryRowsV1.authoredCards as AuthoredCard[]
  },
  templatesFile: fallbackTemplatesV3 as TemplatesFile,
  rowsFile: fallbackSourceRowsV3 as RowsFile
};

export let fallbackRendererV3 = createFallbackRenderer(snapshotBundle.templatesFile, snapshotBundle.rowsFile);
export let transitSynastryFallbackRendererV3 = createTransitSynastryRenderer(
  snapshotBundle.transitLib,
  snapshotBundle.templatesFile,
  snapshotBundle.rowsFile
);

export function installFallbackArchitectureV3Bundle(bundle: FallbackArchitectureV3Bundle) {
  fallbackRendererV3 = createFallbackRenderer(bundle.templatesFile, bundle.rowsFile);
  transitSynastryFallbackRendererV3 = createTransitSynastryRenderer(
    bundle.transitLib,
    bundle.templatesFile,
    bundle.rowsFile
  );
}
