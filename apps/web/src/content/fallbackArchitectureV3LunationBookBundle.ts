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
  "close"
].map((section) => `authored/lunation-eclipse-section/shared/lunar/${section}`));

if (
  lunationBookCardsV1.schema !== "lunation-book-cards/v1"
  || lunationBookCardsV1.count !== 266
  || cards.length !== 266
  || keys.size !== 266
  || cards.some((card) => (
    card.content_role !== "full_copy"
    || card.review_status !== "approved"
    || card.owner_authored !== true
    || card.protected_content.policy !== "byte-exact-owner-authored"
    || card.protected_content.char_count !== card.body.length
    || !/^[a-f0-9]{64}$/u.test(card.protected_content.body_sha256)
  ))
) {
  throw new Error("Lunation book bundle must contain 266 protected owner-approved exact cells.");
}

if (
  lunationEclipseSectionsV1.schema !== "lunation-eclipse-sections/v1"
  || lunationEclipseSectionsV1.count !== 28
  || eclipseSections.length !== 28
  || eclipseSectionKeys.size !== 28
  || [...requiredSharedLunarEclipseSectionKeys].some((key) => !eclipseSectionKeys.has(key))
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
  throw new Error("Lunation eclipse section bundle must contain 28 protected owner-approved sections.");
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
