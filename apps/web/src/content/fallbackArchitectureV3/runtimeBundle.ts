import fallbackSourceRowsV3 from "./fallback-source-rows-v3.json";
import fallbackTemplatesV3 from "./fallback-templates-v3.json";
import transitSynastryRowsV1 from "./transit-synastry-rows-v1.json";
import {
  createFallbackRenderer,
  type RowsFile,
  type TemplatesFile
} from "./renderFallbackV3";
import {
  createTransitSynastryRenderer,
  type AuthoredCard,
  type TransitLibFile
} from "./renderTransitSynastry";

export type FallbackArchitectureV3Bundle = {
  transitLib: TransitLibFile;
  templatesFile: TemplatesFile;
  rowsFile: RowsFile;
};

function snapshotTransitLib(): TransitLibFile {
  return {
    authoredCards: transitSynastryRowsV1.authoredCards.map((card): AuthoredCard => ({
      contentKey: card.contentKey,
      content_role: card.content_role,
      ...(typeof card.headline === "string" ? { headline: card.headline } : {}),
      body: card.body,
      review_status: card.review_status
    }))
  };
}

const snapshotBundle: FallbackArchitectureV3Bundle = {
  transitLib: snapshotTransitLib(),
  templatesFile: fallbackTemplatesV3,
  rowsFile: fallbackSourceRowsV3
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

