import assert from "node:assert/strict";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState";
import { missingSkyPlacementPublications } from "../apps/web/src/services/skyPlacementPublicationGuard";

const emptyBundle = {
  transitLib: { authoredCards: [] },
  templatesFile: { templates: [] },
  rowsFile: { hookRows: [], vocabularyRows: [] }
};
const time = "2026-09-17T18:00:00.000Z";
installContentPublications([
  {
    content_key: "sky-placement/article/moon/taurus",
    state: "live",
    revision: 12,
    row_id: "writing-library-moon-taurus",
    row_updated_at: time,
    updated_at: time
  },
  {
    content_key: "sky-placement/article/sun/virgo",
    state: "live",
    revision: 13,
    row_id: "canonical-sun-virgo",
    row_updated_at: time,
    updated_at: time
  }
]);

assert.deepEqual(missingSkyPlacementPublications([emptyBundle]), []);

const overlay = {
  ...emptyBundle,
  rowsFile: {
    hookRows: [{
      contentKey: "sky-placement/article/sun/virgo",
      publicationRowId: "stale-sun-virgo",
      publicationRowUpdatedAt: time
    }],
    vocabularyRows: []
  }
};
assert.deepEqual(missingSkyPlacementPublications([overlay]), ["sky-placement/article/sun/virgo"]);

const matched = {
  ...emptyBundle,
  rowsFile: {
    hookRows: [{
      contentKey: "sky-placement/article/sun/virgo",
      publicationRowId: "canonical-sun-virgo",
      publicationRowUpdatedAt: time
    }],
    vocabularyRows: []
  }
};
assert.deepEqual(missingSkyPlacementPublications([matched]), []);
console.log("PASS: Sky Placement hydration ignores writing-library ledger rows and still guards mismatched overlays.");
