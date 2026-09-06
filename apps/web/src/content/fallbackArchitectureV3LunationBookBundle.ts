import bundledLunationBookV3 from "./fallbackArchitectureV3/bundled-lunation-book-cards-v3.json";
import bundledLunationEclipseSectionsV3 from "./fallbackArchitectureV3/bundled-lunation-eclipse-sections-v3.json";
import bundledLunationEclipseHouseLayersV3 from "./fallbackArchitectureV3/bundled-lunation-eclipse-house-layers-v3.json";
import lunationAstrologyBoundaryOverridesV1 from "./fallbackArchitectureV3/source-rows/lunation-astrology-boundary-overrides-v1.json";
import type {
  AuthoredCard,
  FallbackArchitectureV3Bundle
} from "./fallbackArchitectureV3Runtime";
import { fallbackArchitectureV3PackageVersion } from "./fallbackArchitectureV3Runtime";

const cards = bundledLunationBookV3.authoredCards;
const eclipseSections = bundledLunationEclipseSectionsV3.authoredCards;
const eclipseHouseLayers = bundledLunationEclipseHouseLayersV3.authoredCards;
const astrologyBoundaryOverrides = lunationAstrologyBoundaryOverridesV1.authoredCards;
const keys = new Set(cards.map((card) => card.contentKey));
const eclipseSectionKeys = new Set(eclipseSections.map((card) => card.contentKey));
const eclipseHouseLayerKeys = new Set(eclipseHouseLayers.map((card) => card.contentKey));
const requiredSharedLunarEclipseSectionKeys = new Set([
  "nature",
  "mechanics",
  "recommendation",
  "close",
  "recommendation-endings",
  "close-endings"
].map((section) => `authored/lunation-eclipse-section/shared/lunar/${section}`));
const eclipseEvergreenBodies = eclipseSections.filter((card) => card.eclipse_section === "evergreen-body");
const isSha256 = (value: unknown): value is string => (
  typeof value === "string" && /^[a-f0-9]{64}$/u.test(value)
);

if (
  bundledLunationBookV3.schema !== "tldrastro-approved-lunation-book-cards/v1"
  || bundledLunationBookV3.packageVersion !== fallbackArchitectureV3PackageVersion
  || bundledLunationBookV3.source.schema !== "lunation-book-cards/v1"
  || bundledLunationBookV3.source.count !== 288
  || cards.length !== 288
  || keys.size !== 288
  || cards.some((card) => (
    card.content_role !== "full_copy"
    || card.review_status !== "approved"
    || card.owner_authored !== true
    || card.protected_content.policy !== "byte-exact-owner-authored"
    || card.protected_content.char_count !== card.body.length
    || !/^[a-f0-9]{64}$/u.test(card.protected_content.body_sha256)
  ))
) {
  throw new Error("Lunation book bundle must contain all 288 protected owner-approved exact cells.");
}

if (
  bundledLunationEclipseSectionsV3.schema !== "tldrastro-approved-lunation-eclipse-sections/v1"
  || bundledLunationEclipseSectionsV3.packageVersion !== fallbackArchitectureV3PackageVersion
  || bundledLunationEclipseSectionsV3.source.schema !== "lunation-eclipse-sections/v1"
  || bundledLunationEclipseSectionsV3.source.count !== 30
  || eclipseSections.length !== 30
  || eclipseSectionKeys.size !== 30
  || [...requiredSharedLunarEclipseSectionKeys].some((key) => !eclipseSectionKeys.has(key))
  || eclipseEvergreenBodies.length !== 12
  || eclipseEvergreenBodies.some((card) => (
    !isSha256(card.protected_content.source_body_sha256)
    || !isSha256(card.protected_content.source_opening_sha256)
    || !isSha256(card.protected_content.source_remainder_sha256)
    || !isSha256(card.protected_content.preservedBookRemainderSha256)
    || !Array.isArray(card.protected_content.approved_omissions)
  ))
  || [...eclipseSectionKeys].some((key) => key.includes("/pisces/shared/"))
  || eclipseSections.some((card) => (
    card.content_role !== "full_copy"
    || !["approved", "approved_reuse"].includes(card.review_status)
    || card.owner_authored !== true
    || card.approval.approvalLevel !== "exact_owner_approved"
    || card.approval.payloadSha256 !== card.protected_content.body_sha256
    || card.protected_content.char_count !== card.body.length
    || !/^[a-f0-9]{64}$/u.test(card.protected_content.body_sha256)
  ))
) {
  throw new Error("Lunation eclipse section bundle must contain 30 protected owner-approved sections.");
}

if (
  bundledLunationEclipseHouseLayersV3.schema !== "tldrastro-approved-lunation-eclipse-house-layers/v1"
  || bundledLunationEclipseHouseLayersV3.packageVersion !== fallbackArchitectureV3PackageVersion
  || bundledLunationEclipseHouseLayersV3.source.schema !== "lunation-eclipse-house-layers/v1"
  || bundledLunationEclipseHouseLayersV3.source.count !== 12
  || eclipseHouseLayers.length !== 12
  || eclipseHouseLayerKeys.size !== 12
  || eclipseHouseLayers.some((card) => (
    card.content_role !== "full_copy"
    || card.review_status !== "approved_reuse"
    || card.owner_authored !== true
    || card.approval.approvalLevel !== "exact_owner_approved"
    || card.approval.payloadSha256 !== card.protected_content.body_sha256
    || card.protected_content.char_count !== card.body.length
    || !/^[a-f0-9]{64}$/u.test(card.protected_content.body_sha256)
  ))
) {
  throw new Error("Lunation eclipse house-layer bundle must contain 12 protected owner-approved solar sections.");
}

if (
  lunationAstrologyBoundaryOverridesV1.schema !== "lunation-astrology-boundary-overrides/v1"
  || lunationAstrologyBoundaryOverridesV1.count !== 1
  || astrologyBoundaryOverrides.length !== 1
  || astrologyBoundaryOverrides.some((card) => (
    card.contentKey !== "authored/book-ritual-and-the-moon/lunation-horoscope/new-moon/virgo/rising-gemini/house-4"
    || card.reader_content_type !== "astrology"
    || card.review_status !== "approved"
    || card.owner_authored !== true
    || card.approval.approvalLevel !== "exact_owner_approved"
    || card.approval.payloadSha256 !== card.protected_content.body_sha256
    || card.protected_content.char_count !== card.body.length
    || !isSha256(card.protected_content.body_sha256)
  ))
) {
  throw new Error("Lunation astrology-boundary override must contain the exact owner-approved Virgo/Gemini correction.");
}

export const lunationBookFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    // Overrides are intentionally last. Production reader projection selects the
    // latest eligible row for a duplicate contentKey, preserving the historical
    // source cell while serving the corrected astrology-only copy.
    authoredCards: [...cards, ...eclipseSections, ...eclipseHouseLayers, ...astrologyBoundaryOverrides] as AuthoredCard[]
  },
  templatesFile: { templates: [] },
  rowsFile: { hookRows: [], vocabularyRows: [] }
};
