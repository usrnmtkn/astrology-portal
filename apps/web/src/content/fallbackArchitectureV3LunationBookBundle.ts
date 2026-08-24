import lunationBookCardsV1 from "./fallbackArchitectureV3/source-rows/lunation-book-cards-v1.json";
import type {
  AuthoredCard,
  FallbackArchitectureV3Bundle
} from "./fallbackArchitectureV3Runtime";

const cards = lunationBookCardsV1.authoredCards;
const keys = new Set(cards.map((card) => card.contentKey));

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

export const lunationBookFallbackArchitectureV3Bundle: FallbackArchitectureV3Bundle = {
  transitLib: {
    authoredCards: cards as AuthoredCard[]
  },
  templatesFile: { templates: [] },
  rowsFile: { hookRows: [], vocabularyRows: [] }
};
