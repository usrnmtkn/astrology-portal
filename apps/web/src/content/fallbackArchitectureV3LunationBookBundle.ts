import lunationBookCardsV1 from "./fallbackArchitectureV3/source-rows/lunation-book-cards-v1.json";
import lunationEclipseSectionsV1 from "./fallbackArchitectureV3/source-rows/lunation-eclipse-sections-v1.json";
import lunationEclipseHouseLayersV1 from "./fallbackArchitectureV3/source-rows/lunation-eclipse-house-layers-v1.json";
import type {
  AuthoredCard,
  FallbackArchitectureV3Bundle
} from "./fallbackArchitectureV3Runtime";

const cards = lunationBookCardsV1.authoredCards;
const eclipseSections = lunationEclipseSectionsV1.authoredCards;
const eclipseHouseLayers = lunationEclipseHouseLayersV1.authoredCards;
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
  lunationBookCardsV1.schema !== "lunation-book-cards/v1"
  || lunationBookCardsV1.count !== 288
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
  lunationEclipseSectionsV1.schema !== "lunation-eclipse-sections/v1"
  || lunationEclipseSectionsV1.count !== 30
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
  lunationEclipseHouseLayersV1.schema !== "lunation-eclipse-house-layers/v1"
  || lunationEclipseHouseLayersV1.count !== 12
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

export const lunationBookFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: [...cards, ...eclipseSections, ...eclipseHouseLayers] as AuthoredCard[]
  },
  templatesFile: { templates: [] },
  rowsFile: { hookRows: [], vocabularyRows: [] }
};
