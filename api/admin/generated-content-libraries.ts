export { STUDIO_VARIABLE_PREFIX, resolveStudioVariableCopy } from "../../apps/web/src/content/studioCustomVariables.mjs";
export {
  isZodiacSeasonSourceKey,
  supportsZodiacSeasonVariables,
  zodiacSeasonVariableNames,
  zodiacSeasonRecordDependencies,
  resolveZodiacSeasonVariables
} from "../../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
export { separateArticleHoroscopeRow } from "../../apps/web/src/content/skyArticleHoroscopes.mjs";
export { assertCleanReaderCopy } from "../../apps/web/src/content/editorialCopyBoundary.mjs";
export { skyWritingIssues } from "../../apps/web/src/content/contentReviewReadiness.js";
export { packagePublicationAdmissionIssue } from "../_lib/content-studio-package-admission.js";
export { astro101PublicationIssue } from "../../apps/web/src/content/astro101.ts";
export { fillAstro101EphemerisSlots } from "../../apps/web/src/content/astro101Ephemeris.ts";
export { isRetiredCompositionKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";
export { skySummaryTemplateErrors } from "../../apps/web/src/content/skyDailySummaryCatalog.js";
export { skyDebilityTemplateErrors } from "../../apps/web/src/content/skyDebilityCatalog.ts";
export { isSkyPlacementVariableField, skyPlacementVariableIssues } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";
export {
  isSkyPlacementArticleField,
  skyPlacementArticleVariableIssues,
  skyPlacementArticlePublicationIssues
} from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";
export {
  isSkyEvergreenSource,
  skyEvergreenEditableFields,
  skyEvergreenFields,
  skyEvergreenSectionText,
  skyEvergreenSectionFragments,
  validateSkyEvergreenSections,
  SKY_EVERGREEN_SECTIONS_PATH
} from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs";
export {
  validateSkyIngressComposition,
  skyIngressPublicationIssues,
  ingressTextIssues
} from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs";
export { isContentStudioReferenceSource } from "../../apps/web/src/content/contentStudioSourceRole.js";
export {
  assertCompiledSkyArticleEdition,
  hasExactSkyArticleOwnerApproval,
  reviseSkyArticleEdition,
  skyArticleEditableFields,
  skyArticleEditionFieldChanges,
  skyArticleEditionRecord
} from "../../apps/web/src/content/skyArticleTemplateCompiler.js";
export { validateCmsTemplate } from "../../apps/web/src/content/cmsTemplateValidation.js";
import calendarAspectDraftCatalog from "../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/calendar-aspect-consequence-first-drafts-v1.json" with { type: "json" };
import skyV4ReaderCopyOwnerApproval from "../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-reader-copy-280-owner-approval-v1.json" with { type: "json" };
import skyV4ReaderCopyServingRelease from "../../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-reader-copy-280-serving-release-v1.json" with { type: "json" };

export { calendarAspectDraftCatalog };

export const skyV4OwnerApprovedReaderCopyKeys = new Set(skyV4ReaderCopyOwnerApproval.approved_keys);
export const skyV4ServingReleasedReaderCopyKeys = skyV4ReaderCopyServingRelease.serving_enabled === true
  ? skyV4OwnerApprovedReaderCopyKeys
  : new Set<string>();
