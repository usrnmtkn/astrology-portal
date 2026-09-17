import assert from "node:assert/strict";
import {
  articleAppDestination,
  isAstro101ContentRow,
  isSkyWriteupContentRow
} from "../apps/admin/src/articleWorkspace.ts";

const skyRows = [
  { content_key: "sky-article/jupiter/leo/2026", block_type: "sky_article", mode: "article" },
  { content_key: "sky/article-template/jupiter", block_type: "sky_article", mode: "article" },
  { content_key: "sky.placement.jupiter.leo", block_type: "sky_placement", mode: "feed" },
  { content_key: "authored/sky-lunation-macro/full-moon/pisces", block_type: "essay", mode: "article" }
];

for (const row of skyRows) {
  assert.equal(isSkyWriteupContentRow(row), true, `${row.content_key} must stay in Sky Write-ups`);
}

assert.equal(isSkyWriteupContentRow({
  content_key: "article/manual/boundaries-and-belonging",
  block_type: "essay",
  mode: "article"
}), false);

assert.equal(isAstro101ContentRow({
  content_key: "education/astro-101/sign/aries",
  facts: { slug: "/learn/signs/aries" }
}), true);

assert.deepEqual(articleAppDestination({
  content_key: "education/astro-101/sign/aries",
  status: "LIVE",
  facts: { slug: "/learn/signs/aries" }
}), {
  detail: "Readers open this page at /learn/signs/aries.",
  label: "/learn/signs/aries",
  state: "connected"
});

assert.deepEqual(articleAppDestination({
  content_key: "article/manual/draft",
  status: "DRAFT"
}), {
  detail: "Readers cannot currently receive this article.",
  label: "Draft",
  state: "draft"
});

assert.equal(articleAppDestination({
  content_key: "article/manual/published",
  status: "LIVE"
}).state, "unconnected");

assert.deepEqual(articleAppDestination({
  content_key: "article/manual/connected",
  status: "LIVE",
  source_snapshot: { appDestination: "Learn / Astrology basics" }
}), {
  detail: "The article declares Learn / Astrology basics as its reader destination.",
  label: "Learn / Astrology basics",
  state: "connected"
});

console.log("Admin Articles workspace tests passed: Sky write-ups are excluded and app destinations are explicit.");
