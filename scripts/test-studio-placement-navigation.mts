import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { skyPlacementBrowseIdentity } from "../apps/admin/src/skyPlacementBrowse";
import type { RelatedHousePassage } from "../apps/admin/src/skyWriteupRelations";
import Companions, { SkyPlacementEditorNav } from "../apps/admin/src/SkyPlacementCompanions";

const row = { id: "fixture", headline: "Synthetic season article", content_key: "sky-article/sun/libra/2026/2026-09-22" };
assert.deepEqual(skyPlacementBrowseIdentity(row, "Sun in Libra"), { title: "Synthetic season article", kind: "Dated article · 2026-09-22" });
assert.equal(skyPlacementBrowseIdentity({ ...row, content_key: "sky-article-workspace/sun/libra/2026/ingress-essay-v2/2026-09-22" }, "Sun in Libra")?.kind, "Writing workspace · 2026-09-22");
assert.equal(skyPlacementBrowseIdentity({ ...row, event_type: "sky-article-edition-revision" }, "Sun in Libra")?.kind, "Article revision · 2026-09-22");
assert.equal(skyPlacementBrowseIdentity({ ...row, content_key: "sky/article-template/sun/libra" }, "Sun in Libra")?.kind, "Reusable article template");
const houses: RelatedHousePassage<typeof row & { body: string }>[] = [1, 10].map(house => ({ house, kind: "Sky house horoscope" as const, availability: "Reader-ready" as const,
  row: { ...row, id: `house-${house}`, content_key: `house-horoscope-core/sun/libra/house-${house}`, body: `Complete house ${house} opening. Complete house ${house} ending.` } }));
houses.push({ house: 10, kind: "House introduction", availability: "Source candidate",
  row: { ...row, id: "support", content_key: "authored/transit-house-intro/sun/10", body: "Synthetic supporting text." } });
const base = { house: 10, houses, aspects: [], query: "", onHouse() {}, onQuery() {}, onEdit() {}, title: (value: typeof row) => value.headline };
const html = renderToStaticMarkup(createElement(Companions, { ...base, view: "houses" }));
assert(html.includes("Complete house 10 opening. Complete house 10 ending."), "Preserve the complete selected horoscope.");
assert(!html.includes("Complete house 1 opening."), "Do not bury the chosen horoscope below unrelated houses.");
assert(html.includes("Supporting passages (1)"));
assert(html.includes('aria-label="Choose horoscope house"'));
assert(renderToStaticMarkup(createElement(Companions, { ...base, house: 12, view: "houses" })).includes("No complete horoscope is saved for House 12."));
assert(renderToStaticMarkup(createElement(Companions, { ...base, view: "aspects", query: "missing" })).includes("No personal aspects match this search."));
const navigation = renderToStaticMarkup(createElement(SkyPlacementEditorNav, { section: "houses", onSection() {}, onSkyAspects() {} }));
assert.match(navigation, /aria-pressed="true"[^>]*>House horoscopes<\/button>/u, "The active section must be exposed to assistive technology.");
assert(navigation.indexOf(">Article</button>") < navigation.indexOf(">House horoscopes</button>"));
assert(navigation.includes("Sky &amp; Calendar aspects"), "Sky aspects need a separate, explicitly named destination.");
console.log("Studio placement navigation: article identities, house selection, complete copy and empty states passed.");
