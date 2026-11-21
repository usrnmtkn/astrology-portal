import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import { PassThrough } from "node:stream";
import { createServer } from "vite";

const server = await createServer({
  root: "./apps/web", configFile: false,
  optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true },
  appType: "custom", logLevel: "silent"
});
try {
  const { socialPlacementRows } = await server.ssrLoadModule("/src/components/charts/PlacementRows.tsx");
  const { NatalInsightsSection } = await server.ssrLoadModule("/src/components/charts/NatalInsightsSection.tsx");
  const { NatalInsightProse, NatalInsightGuideBody } = await server.ssrLoadModule("/src/components/charts/NatalInsightReading.tsx");
  const { FriendNatalTab } = await server.ssrLoadModule("/src/features/friends/FriendNatalTab.tsx");
  const unknownSky = { birthTimeKnown: false, ascendant: "", midheaven: "", positions: [
    { planet: "Sun", sign: "Aries", glyph: "☉", degree: 12, house: 0, motion: "direct" }
  ] };
  assert.deepEqual(socialPlacementRows(unknownSky).map(row => row.label), ["Sun"], "Do not rebuild an absent Ascendant before the reader boundary");
  const html = renderToStaticMarkup(React.createElement(NatalInsightsSection, { onOpenTopic() {} }));
  assert.equal((html.match(/data-insight=/g) ?? []).length, 7);
  assert.doesNotMatch(html, /<details|<summary|related readings/);
  const structured = renderToStaticMarkup(React.createElement(NatalInsightProse, { body: "## Home\n\nComplete opening.\n\n### Ruler\n\nComplete ending." }));
  assert.match(structured, /<h2>Home<\/h2>/);
  assert.match(structured, /<h3>Ruler<\/h3>/);
  assert.match(structured, /<p><strong>Complete opening\.<\/strong><\/p>/);
  assert.match(structured, /<p><strong>Complete ending\.<\/strong><\/p>/);
  const emphasized = await new Promise((resolve, reject) => {
    const destination = new PassThrough(); let html = '';
    destination.on('data', chunk => { html += chunk; });
    destination.on('end', () => resolve(html)); destination.on('error', reject);
    const stream = renderToPipeableStream(React.createElement(NatalInsightProse, {
      body: '### Synthetic placement\n\n**The opening introduces the thought.** Its explanation continues in the same paragraph.'
    }), { onAllReady() { stream.pipe(destination); }, onError: reject });
  });

  assert.match(emphasized, /<h2>Synthetic placement<\/h2>/);
  assert.match(emphasized, /<p><strong>The opening introduces the thought\.<\/strong> Its explanation continues in the same paragraph\.<\/p>/);
  assert.equal((emphasized.match(/<p>/gu) ?? []).length, 1, 'No standalone hook or second paragraph');
  const firstPaint = renderToStaticMarkup(React.createElement(NatalInsightProse, { body: "### Placement\n\n**First sentence.** The paragraph continues." }));
  assert.match(firstPaint, /<p><strong>First sentence\.<\/strong> The paragraph continues\.<\/p>/, "Bold openings must render without a raw Markdown fallback");
  const guide = renderToStaticMarkup(React.createElement(NatalInsightGuideBody, { body: "Complete guide opening.\nWhat we look at in your chart:\n- First chart factor.\n- Second chart factor.\n- For example: This is the complete ending." }));
  assert.doesNotMatch(guide, /How this reading works|<h[1-6]/, "The guide begins with its saved introduction, without an added heading");
  assert.match(guide, /Complete guide opening\./);
  assert.match(guide, /<p>What we look at in your chart:<\/p>/, "The chart-factor introduction has its own paragraph");
  assert.equal((guide.match(/<li>/gu) ?? []).length, 3);
  assert.match(guide, /For example: This is the complete ending\./);
  const paragraphGuide = renderToStaticMarkup(React.createElement(NatalInsightGuideBody, { body: "The complete first paragraph.\n\nThe complete second paragraph." }));
  assert.match(paragraphGuide, /<p>The complete first paragraph\.<\/p><p>The complete second paragraph\.<\/p>/);
  assert.doesNotMatch(paragraphGuide, /<h[1-6]|<li>/, "Paragraph guides retain their supplied structure");
  const plain = renderToStaticMarkup(React.createElement(NatalInsightProse, { body: "An exact-chart override.\n\nIts full ending." }));
  assert.doesNotMatch(plain, /<h[1-6]/, "Do not manufacture headings inside exact-chart prose");
  const grouped = renderToStaticMarkup(React.createElement(NatalInsightProse, { body:
    "### Aries rising\n\n**Complete rising.** Kept in full.\n\n### Mars in Leo · chart ruler\n\n**Complete sign passage.** Its complete ending.\n\n### Mars in the 5th house · chart ruler\n\nComplete house opening. Its complete ending.\n\n### Sun in Aries\n\n**Complete Sun passage.** Its complete ending." }));
  assert.equal((grouped.match(/<h2>/gu) ?? []).length, 3);
  assert.equal((grouped.match(/section--band/gu) ?? []).length, 1);
  assert.match(grouped, /href="\/learn\/signs\/leo">Mars in Leo<\/a>, 5th house/);
  assert.match(grouped, /<strong>Complete house opening\.<\/strong> Its complete ending\./);
  assert.equal((grouped.match(/Its complete ending\./gu) ?? []).length, 3, "Every passage keeps its ending");
  const friendLayout = renderToStaticMarkup(React.createElement(NatalInsightProse, { audience: "friend", body: "### Mars in Leo · chart ruler\n\nTheir complete sign passage.\n\n### Mars in the 5th house · chart ruler\n\nTheir complete house passage." }));
  assert.match(friendLayout, /Its sign shows how they act/);
  assert.doesNotMatch(friendLayout, /how you act/);
  const base = {
    bigThreeRows: [], placementRows: [], emptyHouseRows: [], patternItems: [],
    birthTimeUnknown: false, friendName: "Fixture", hasNatalChart: false, isEventChart: false,
    isNatalChartRepairing: false, onOpenInsight() {}, onOpenEmptyHouse() {}, onOpenPattern() {}, onOpenPlacement() {}, patternTitle: "Patterns"
  };
  for (const props of [base, { ...base, isNatalChartRepairing: true }]) {
    const markup = renderToStaticMarkup(React.createElement(FriendNatalTab, props));
    assert.doesNotMatch(markup, /Deeper insights/, "Absent or repairing charts must not expose stale topic navigation");
  }
  console.log("Natal insights render: unknown-time angles, missing charts, unavailable readings and repair state passed.");
} finally {
  await server.close();
}
