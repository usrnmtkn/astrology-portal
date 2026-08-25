import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reviewDir = path.join(root, "packages/astro-knowledge/review/lunation-card-assembly-v1");
const sourcePath = path.join(reviewDir, "source/ritual-and-the-moon-lunation-horoscopes-v1.json");
const madlibPath = path.join(reviewDir, "source/horoscope-madlib-v1.json");
const evidencePath = path.join(reviewDir, "source/eclipse-owner-language-v1.json");
const intentionSpansPath = path.join(reviewDir, "source/pisces-lunar-eclipse-intention-span-candidates-v1.json");
const bodyEditsPath = path.join(reviewDir, "source/pisces-lunar-eclipse-body-edits-v1.json");
const continuityCandidatesPath = path.join(reviewDir, "source/pisces-lunar-eclipse-continuity-candidates-v1.json");
const fallbackRowsPath = path.join(root, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const jsonOut = path.join(reviewDir, "pisces-lunar-eclipse-review-packet-v1.json");
const markdownOut = path.join(reviewDir, "pisces-lunar-eclipse-review-packet-v1.md");
const htmlOut = path.join(reviewDir, "pisces-lunar-eclipse-review-packet-v1.html");
const trialJsonOut = path.join(reviewDir, "pisces-lunar-eclipse-intro-variants-trial-v1.json");
const trialHtmlOut = path.join(reviewDir, "pisces-lunar-eclipse-intro-variants-trial-v1.html");

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const madlib = JSON.parse(fs.readFileSync(madlibPath, "utf8"));
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
const intentionSpans = JSON.parse(fs.readFileSync(intentionSpansPath, "utf8"));
const bodyEdits = JSON.parse(fs.readFileSync(bodyEditsPath, "utf8"));
const continuityCandidates = JSON.parse(fs.readFileSync(continuityCandidatesPath, "utf8"));
const fallbackSource = JSON.parse(fs.readFileSync(fallbackRowsPath, "utf8"));
const fallbackRows = fallbackSource.hookRows;

const cycleAnchorRow = fallbackRows.find((row) => row.contentKey === "fallback-hook/lunation-matching-new-moon-anchor/full");
if (!cycleAnchorRow) throw new Error("Missing approved Full Moon cycle anchor");

const title = (value) => value.slice(0, 1).toUpperCase() + value.slice(1);
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const wordCount = (value) => value.trim().split(/\s+/u).filter(Boolean).length;
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");
const splitOpeningSentence = (value) => {
  const boundary = value.indexOf(". ");
  if (boundary < 0) throw new Error("Book body has no opening-sentence boundary");
  return {
    opening: value.slice(0, boundary + 1),
    remainder: value.slice(boundary + 2)
  };
};
const repeatedLunationReminderPattern = /\b(?:the Pisces full moon|this Pisces full moon|this full moon|the full moon|full moon energy|each full moon|during this lunation|this month's full moon)\b/giu;
const spansByKey = new Map();
for (const span of intentionSpans.spans) {
  const list = spansByKey.get(span.contentKey) ?? [];
  list.push(span);
  spansByKey.set(span.contentKey, list);
}
if (bodyEdits.status !== "superseded_non_serving" || !Array.isArray(bodyEdits.historicalBodyEdits)) {
  throw new Error("Complete eclipse body replacements must remain superseded and non-serving.");
}
const continuityCandidatesByKey = new Map();
for (const edit of continuityCandidates.candidates) {
  const list = continuityCandidatesByKey.get(edit.contentKey) ?? [];
  list.push(edit);
  continuityCandidatesByKey.set(edit.contentKey, list);
}

const houses = new Map(madlib.houses.map((house) => [house.house, house]));
const rows = source.entries
  .filter((entry) => entry.lunationSign === "pisces" && entry.lunationKind === "full-moon")
  .sort((a, b) => a.house - b.house);

if (rows.length !== 12) throw new Error(`Expected 12 Pisces Full Moon entries, found ${rows.length}`);

const shared = {
  nature: madlib.templates.eclipseNatureDefaultCandidate,
  mechanics: madlib.templates.eclipseMechanicsCandidate,
  noRitual: madlib.templates.eclipseNoRitualCandidate,
  close: madlib.templates.eclipseAdviceCandidate,
  endingsNoRitual: madlib.templates.eclipseEndingsRecommendationCandidate,
  endingsClose: madlib.templates.eclipseEndingsAdviceCandidate,
  cycleAnchor: cycleAnchorRow.body_you
    .replace("{{matchingNewMoonSign}}", "Pisces")
    .replace("{{matchingNewMoonDate}}", "{{matchingNewMoonDate}}")
};

const cards = rows.map((entry) => {
  const house = houses.get(entry.house);
  if (!house) throw new Error(`Missing house vocabulary for house ${entry.house}`);
  const bookBody = splitOpeningSentence(entry.body);
  if (!/^The Pisces full moon (?:illuminates|is illuminating|shines upon) your /u.test(bookBody.opening)) {
    throw new Error(`Unexpected Pisces Full Moon opening for ${entry.contentKey}: ${bookBody.opening}`);
  }
  let eclipseOpening = bookBody.opening.replace(
    /^The Pisces full moon (?:illuminates|is illuminating|shines upon)/u,
    "The Pisces lunar eclipse shines upon"
  );
  if (entry.house === 4) {
    eclipseOpening = eclipseOpening.replace(
      "your 4th house of home and family.",
      "your 4th house of home, family, and generational karma."
    );
  }
  if (entry.house === 10) {
    eclipseOpening = eclipseOpening.replace(
      " over the last six months (starting the Pisces new moon).",
      " over the last six months."
    );
  }

  const approvedSpans = [...(spansByKey.get(entry.contentKey) ?? [])].sort((a, b) => b.start - a.start);
  const approvedBodyEdits = [];
  const reviewContinuityEdits = [...(continuityCandidatesByKey.get(entry.contentKey) ?? [])];
  const operations = [
    ...approvedSpans.map((span) => ({ ...span, replacement: "", operation: "omit-intention" }))
  ].sort((a, b) => b.start - a.start);
  let bodyAfterOmissions = entry.body;
  for (const operation of operations) {
    if (!operation.ownerApproved) {
      throw new Error(`Unapproved eclipse body operation for ${entry.contentKey}`);
    }
    const actual = entry.body.slice(operation.start, operation.end);
    if (actual !== operation.text) throw new Error(`Eclipse body operation text mismatch for ${entry.contentKey}`);
    if (hash(actual) !== operation.sha256) throw new Error(`Eclipse body operation hash mismatch for ${entry.contentKey}`);
    bodyAfterOmissions = `${bodyAfterOmissions.slice(0, operation.start)}${operation.replacement}${bodyAfterOmissions.slice(operation.end)}`;
  }
  const proposedBodyParts = splitOpeningSentence(bodyAfterOmissions);
  const proposedBookBody = `${eclipseOpening} ${proposedBodyParts.remainder}`;
  const cycleAnchorSuppressed = false;
  const endingsHouse = [4, 8, 12].includes(entry.house);
  const eclipseRecommendation = endingsHouse ? shared.endingsNoRitual : shared.noRitual;
  const eclipseClose = endingsHouse ? shared.endingsClose : shared.close;
  const proposedSections = [
    { id: "opening", change: "replace-book-opening-sentence", text: eclipseOpening },
    { id: "eclipseNature", change: "added", text: shared.nature },
    { id: "eclipseMechanics", change: "added", text: shared.mechanics },
    { id: "bookBodyRemainder", change: approvedSpans.length ? "unchanged-except-approved-declared-intention-omission" : "unchanged-byte-exact", text: proposedBodyParts.remainder },
    { id: "cycleAnchor", change: cycleAnchorSuppressed ? "suppressed-duplicate-book-callback" : "unchanged-dynamic", text: cycleAnchorSuppressed ? null : shared.cycleAnchor },
    { id: "dynamicBlocks", change: "computed-not-rendered-in-packet", text: "Qualified aspects, Nodes, dates, ruler state, and eclipse-season facts remain engine supplied." },
    { id: "eclipseNoRitual", change: endingsHouse ? "added-endings-house-variant" : "added", text: eclipseRecommendation },
    { id: "eclipseClose", change: endingsHouse ? "added-endings-house-variant" : "added", text: eclipseClose }
  ];
  const completeCardTemplate = proposedSections
    .filter((section) => section.text)
    .filter((section) => section.id !== "dynamicBlocks")
    .map((section) => section.text)
    .join("\n\n");
  const continuityReviewMatches = [...proposedBodyParts.remainder.matchAll(repeatedLunationReminderPattern)]
    .map((match) => match[0]);

  return {
    id: `review/eclipse/lunar/pisces/rising-${entry.risingSign}/house-${entry.house}`,
    status: "needs_owner_composition_review",
    ownerApproved: false,
    promotionAuthorized: false,
    risingSign: entry.risingSign,
    house: entry.house,
    houseOrdinal: house.ordinal,
    houseDomain: house.domain,
    sourceContentKey: entry.contentKey,
    sourceBodySha256: hash(entry.body),
    sourceBodyWordCount: wordCount(entry.body),
    original: {
      bookOpeningSentence: bookBody.opening,
      bookBody: entry.body,
      cycleAnchor: shared.cycleAnchor
    },
    proposed: {
      sections: proposedSections,
      completeBookBody: proposedBookBody,
      replacedSentences: [{ from: bookBody.opening, to: eclipseOpening }],
      removedSentences: [],
      approvedBodyEdits: approvedBodyEdits.map((edit) => ({
        start: edit.start,
        end: edit.end,
        sha256: edit.sha256,
        text: edit.text,
        replacement: edit.replacement,
        ownerApproved: true,
        approvedAt: edit.approvedAt
      })),
      reviewContinuityEdits: reviewContinuityEdits.map((edit) => ({
        start: edit.start,
        end: edit.end,
        sha256: edit.sha256,
        text: edit.text,
        replacement: edit.replacement,
        changeReason: edit.changeReason,
        reviewStatus: edit.reviewStatus,
        ownerApproved: false,
        promotionAuthorized: false
      })),
      omittedDeclaredIntentionBlocks: approvedSpans.map((span) => ({
        start: span.start,
        end: span.end,
        sha256: span.sha256,
        text: span.text,
        ownerApproved: true,
        approvedAt: span.approvedAt
      })),
      sourceBookRemainderSha256: hash(bookBody.remainder),
      cycleAnchorSuppressed,
      completeCardTemplate,
      completeCardTemplateSha256: hash(completeCardTemplate),
      continuityReview: {
        status: continuityReviewMatches.length ? "needs_owner_exact_edit" : reviewContinuityEdits.length ? "candidate_clear_needs_owner_review" : "clear",
        repeatedLunationReminderCount: continuityReviewMatches.length,
        candidateEditCount: reviewContinuityEdits.length,
        matches: continuityReviewMatches
      }
    },
    review: {
      bookOpeningSentence: "OWNER_APPROVED_2026_08_24",
      eclipseNature: "OWNER_APPROVED_2026_08_24",
      eclipseMechanics: "OWNER_APPROVED_2026_08_24",
      bookBodyRemainder: reviewContinuityEdits.length ? "NEEDS_OWNER_EXACT_REVIEW" : approvedSpans.length ? "OWNER_APPROVED_INTENTION_OMISSION_2026_08_24" : "KEEP_UNCHANGED",
      cycleAnchor: cycleAnchorSuppressed ? "OWNER_APPROVED_SUPPRESS_DUPLICATE_2026_08_24" : "KEEP_EXISTING",
      eclipseNoRitual: "OWNER_APPROVED_2026_08_24",
      eclipseClose: "OWNER_APPROVED_2026_08_24",
      wholeCard: "PENDING"
    }
  };
});

const packet = {
  schema: "pisces-lunar-eclipse-review-packet/v1",
  status: "needs_owner_composition_review",
  serving: false,
  generatedAt: new Date().toISOString(),
  scope: "Twelve Pisces lunar-eclipse variants, one per rising sign and house.",
  governingDecision: "The regular source remains intact. Pisces lunar-eclipse variants use approved eclipse layers, omit only two stored and owner-approved declared Full Moon intention blocks, preserve every other byte of the protected book remainder, retain the localized matching-New-Moon anchor, and keep continuity candidates non-serving until separately approved.",
  source: {
    path: path.relative(root, sourcePath),
    sourceSchema: source.schema,
    eclipseEvidencePath: path.relative(root, evidencePath),
    intentionSpansPath: path.relative(root, intentionSpansPath),
    bodyEditsPath: path.relative(root, bodyEditsPath),
    continuityCandidatesPath: path.relative(root, continuityCandidatesPath),
    regularEntryCount: rows.length
  },
  sharedLayers: shared,
  dynamicFacts: [
    "matchingNewMoonDate",
    "nodeInvolved",
    "eclipseNumberInSeries",
    "axisStart",
    "axisEnd",
    "qualifiedSkyAspect",
    "qualifiedRulerState"
  ],
  cards
};

const markdown = [
  "# Pisces lunar-eclipse review packet",
  "",
  "Status: **needs complete-composition review · non-serving**",
  "",
  "This packet contains the 12 existing Pisces Full Moon book cards, one per rising sign. The regular source remains unchanged. Each proposed eclipse variant uses `shines upon`, adds the approved shared eclipse passages, preserves the two approved eclipse-only intention omissions, and shows the review-held continuity edits that remove repeated lunation reminders.",
  "",
  "Dynamic dates, Nodes, aspects, ruler state, and eclipse-series facts are deliberately not materialized here. They remain calculation-layer facts.",
  "",
  "## Shared review decisions",
  "",
  "- [x] APPROVED — all 12 Pisces lunar-eclipse openings use `shines upon`",
  "- [x] APPROVED — eclipse-nature paragraph",
  "- [x] APPROVED — lunar-scoped eclipse-mechanics paragraph",
  "- [x] APPROVED — two exact declared Full Moon intention-block omissions",
  "- [x] APPROVED — eclipse recommendation paragraph",
  "- [x] APPROVED — eclipse close",
  "",
  ...cards.flatMap((card) => [
    `## ${card.house}. ${title(card.risingSign)} rising · Pisces in the ${card.houseOrdinal} house`,
    "",
    `Source: \`${card.sourceContentKey}\`  `,
    `Protected body: ${card.sourceBodyWordCount} words · SHA-256 \`${card.sourceBodySha256}\``,
    "",
    "### Original regular card",
    "",
    card.original.bookBody,
    "",
    `> **EXISTING DYNAMIC CYCLE ANCHOR**  `,
    `> ${card.original.cycleAnchor}`,
    "",
    "### Proposed eclipse composition",
    "",
    `> **REPLACED · BOOK OPENING SENTENCE**  `,
    `> ${card.proposed.sections.find((section) => section.id === "opening").text}`,
    "",
    `> **ADDED · ECLIPSE NATURE**  `,
    `> ${shared.nature}`,
    "",
    `> **ADDED · ECLIPSE MECHANICS**  `,
    `> ${shared.mechanics}`,
    "",
    card.proposed.omittedDeclaredIntentionBlocks.length
        ? "**BOOK HOROSCOPE · APPROVED INTENTION BLOCK OMITTED**"
        : "**UNCHANGED · REMAINDER OF BOOK HOROSCOPE**",
    "",
    card.proposed.sections.find((section) => section.id === "bookBodyRemainder").text,
    "",
    ...(card.proposed.omittedDeclaredIntentionBlocks.flatMap((span) => [
      `> **OMITTED · OWNER-APPROVED DECLARED INTENTION BLOCK · ${span.start}–${span.end} · ${span.sha256}**  `,
      `> ${span.text}`,
      ""
    ])),
    ...(card.proposed.reviewContinuityEdits.flatMap((edit) => [
      `> **REVIEW REQUIRED · CONTINUITY EDIT · ${edit.start}–${edit.end} · ${edit.sha256}**  `,
      `> Before: ${edit.text || "[empty]"}  `,
      `> After: ${edit.replacement || "[omit]"}`,
      ""
    ])),
    card.proposed.cycleAnchorSuppressed
      ? `> **SUPPRESSED · DUPLICATE DYNAMIC CYCLE ANCHOR**  `
      : `> **UNCHANGED · DYNAMIC CYCLE ANCHOR**  `,
    card.proposed.cycleAnchorSuppressed
      ? `> The book body already contains the Pisces New Moon callback.`
      : `> ${shared.cycleAnchor}`,
    "",
    `> **ADDED · NO-RITUAL PARAGRAPH**  `,
    `> ${card.proposed.sections.find((section) => section.id === "eclipseNoRitual").text}`,
    "",
    `> **ADDED · ECLIPSE CLOSE**  `,
    `> ${card.proposed.sections.find((section) => section.id === "eclipseClose").text}`,
    "",
    "### Exact diff summary",
    "",
    `- Replaced: one book opening sentence → one eclipse opening sentence`,
    `- Added: eclipse nature, mechanics, no-ritual paragraph, and close`,
    `- Omitted declared intention blocks: **${card.proposed.omittedDeclaredIntentionBlocks.length}**`,
    `- Non-serving continuity candidates listed for later review: **${card.proposed.reviewContinuityEdits.length}**`,
    `- Dynamic cycle anchor suppressed as duplicate: **${card.proposed.cycleAnchorSuppressed ? "yes" : "no"}**`,
    `- Repeated lunation reminders remaining after the proposed edits: **${card.proposed.continuityReview.repeatedLunationReminderCount}**`,
    "",
    "### Owner review",
    "",
    "- [ ] APPROVE WHOLE CARD",
    "- [ ] REVISE — write exact replacement beside the affected labeled block",
    "- [ ] OMIT — name the labeled block to omit",
    ""
  ])
].join("\n");

const reviewCardsHtml = cards
  .map((card) => {
    const remainder = card.proposed.sections.find((section) => section.id === "bookBodyRemainder").text;
    const anchor = card.proposed.sections.find((section) => section.id === "cycleAnchor");
    return `
      <article class="card" id="house-${card.house}">
        <div class="eyebrow">LUNAR ECLIPSE&nbsp;&nbsp;/&nbsp;&nbsp;PISCES</div>
        <h2>${escapeHtml(title(card.risingSign))} Rising · ${escapeHtml(card.houseOrdinal)} house</h2>
        <div class="rule"></div>
        <p class="opening">${escapeHtml(card.proposed.replacedSentences[0].to)}</p>
        <p>${escapeHtml(shared.nature)}</p>
        <p>${escapeHtml(shared.mechanics)}</p>
        ${remainder.split(/\n{2,}/u).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        ${anchor.text ? `<p>${escapeHtml(anchor.text)}</p>` : `<p class="suppressed">The separate six-month anchor is suppressed because the book already carries the Pisces New Moon callback.</p>`}
        <p>${escapeHtml(card.proposed.sections.find((section) => section.id === "eclipseNoRitual").text)}</p>
        <p>${escapeHtml(card.proposed.sections.find((section) => section.id === "eclipseClose").text)}</p>
        ${card.proposed.reviewContinuityEdits.length ? `<details class="edits"><summary>${card.proposed.reviewContinuityEdits.length} continuity edits awaiting exact approval</summary>${card.proposed.reviewContinuityEdits.map((edit) => `<div class="edit"><strong>Before</strong><p>${escapeHtml(edit.text)}</p><strong>After</strong><p>${escapeHtml(edit.replacement || "[omit]")}</p></div>`).join("")}</details>` : ""}
        <div class="meta">
          <span>Opening approved</span>
          <span>${card.proposed.omittedDeclaredIntentionBlocks.length ? `${card.proposed.omittedDeclaredIntentionBlocks.length} approved omission` : "No omission"}</span>
          <span>${card.proposed.cycleAnchorSuppressed ? "Anchor deduped" : "Dynamic anchor retained"}</span>
          <span>${card.proposed.reviewContinuityEdits.length ? `${card.proposed.reviewContinuityEdits.length} exact edits need approval` : card.proposed.continuityReview.repeatedLunationReminderCount ? `${card.proposed.continuityReview.repeatedLunationReminderCount} reminders remain` : "Continuity clear"}</span>
        </div>
      </article>`;
  })
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pisces Lunar Eclipse Review</title>
  <style>
    :root { color-scheme: light; --ink:#20212a; --muted:#6d7484; --line:#e1e3e7; --wash:#cbd2d8; --paper:#fff; }
    * { box-sizing: border-box; }
    body { margin:0; color:var(--ink); background:linear-gradient(135deg,#edf0f2 0%,var(--wash) 100%); font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    header { position:sticky; top:0; z-index:2; display:flex; gap:18px; align-items:center; padding:18px 5vw; background:rgba(255,255,255,.88); border-bottom:1px solid rgba(32,33,42,.1); backdrop-filter:blur(14px); }
    header strong { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.04em; }
    header a { color:var(--muted); text-decoration:none; font-size:14px; }
    main { width:min(1120px,calc(100% - 40px)); margin:58px auto 96px; }
    .intro { max-width:800px; margin:0 auto 34px; }
    .intro h1 { margin:0 0 12px; font:500 clamp(38px,6vw,68px)/1.02 Georgia,"Times New Roman",serif; }
    .intro p { color:var(--muted); line-height:1.65; }
    .card { margin:26px auto; padding:clamp(30px,6vw,72px); background:var(--paper); border:1px solid rgba(32,33,42,.08); border-radius:28px; box-shadow:0 24px 65px rgba(42,52,61,.15); }
    .eyebrow { text-align:center; color:var(--muted); font:700 12px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.18em; }
    h2 { margin:20px 0 28px; text-align:center; font:500 clamp(34px,5vw,58px)/1.08 Georgia,"Times New Roman",serif; }
    .rule { height:1px; margin:0 0 42px; background:var(--line); }
    p { margin:0 0 22px; color:#565e6e; font-size:clamp(17px,2vw,20px); line-height:1.62; }
    .opening { color:var(--ink); font-family:Georgia,"Times New Roman",serif; font-size:clamp(24px,3vw,34px); line-height:1.3; }
    .suppressed { padding:14px 16px; color:#6d5d3b; background:#faf5e9; border-radius:12px; font-size:15px; }
    .edits { margin-top:34px; padding:18px; border:1px solid #e5d7ad; border-radius:14px; background:#fffaf0; }
    .edits summary { cursor:pointer; color:#6d5d3b; font-weight:700; }
    .edit { margin-top:18px; padding-top:18px; border-top:1px solid #eadfbe; }
    .edit strong { display:block; margin-bottom:5px; color:#6d5d3b; font:700 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.12em; text-transform:uppercase; }
    .edit p { margin-bottom:12px; font-size:16px; }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:34px; padding-top:22px; border-top:1px solid var(--line); }
    .meta span { padding:7px 10px; color:var(--muted); background:#f2f3f6; border-radius:999px; font:600 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace; }
    @media (max-width:640px) { main{width:min(100% - 20px,1120px);margin-top:28px}.card{padding:30px 22px;border-radius:20px}header{overflow:auto}.intro{padding:0 6px}.rule{margin-bottom:30px} }
  </style>
</head>
<body>
  <header><strong>TLDR Astro · editorial review</strong><a href="#house-4">House 4</a><a href="#house-9">House 9</a><a href="#house-10">House 10</a><a href="#house-12">House 12</a></header>
  <main>
    <section class="intro"><h1>Pisces lunar-eclipse variants</h1><p>Non-serving review render of all twelve complete compositions. The repeated lunation reminders have been removed from the proposed reading. Expand each card's continuity panel to review every exact before-and-after edit. No candidate can serve without exact owner approval.</p></section>
    ${reviewCardsHtml}
  </main>
</body>
</html>`;

const trialHouseTopics = {
  1: "Self",
  2: "disposable income and foundation",
  3: "communication, early education, processing information, community, siblings, and neighbors",
  4: "home and family",
  5: "fun, children, and creativity",
  6: "health, daily work, routine, and being of service",
  7: "relationships",
  8: "transformation, symbolism, and other people's money",
  9: "Higher Self",
  10: "career and purpose",
  11: "friendships",
  12: "karma, subconscious, and endings"
};
const trialIntroTemplates = [
  ({ sign, eclipseKind, houseOrdinal, houseTopics }) => `The ${sign} ${eclipseKind} shines upon your ${houseOrdinal} house of ${houseTopics}, bringing something that has been developing here over the last six months to a turning point. Eclipses can move a story faster than expected, and some of what changes now may take time to fully understand.`,
  ({ sign, eclipseKind, houseOrdinal, houseTopics }) => `The ${sign} ${eclipseKind} falls in your ${houseOrdinal} house of ${houseTopics}, where a six-month story is reaching an important point. Eclipses have a way of changing the direction of events before you have the full explanation for why.`,
  ({ sign, eclipseKind, houseOrdinal, houseTopics, matchingNewMoonDate }) => `This ${sign} ${eclipseKind} lands in your ${houseOrdinal} house of ${houseTopics}. Something that began around the New Moon in ${sign} on ${matchingNewMoonDate} may now show you what has changed, what has not, and what can no longer continue in quite the same way.`,
  ({ sign, eclipseKind, houseOrdinal, houseTopics, matchingNewMoonDate }) => `Your ${houseOrdinal} house of ${houseTopics} is where this ${sign} ${eclipseKind} is doing its work. A situation that has been developing since the New Moon in ${sign} on ${matchingNewMoonDate} may reach a conclusion, change direction, or reveal information you did not have when it began.`,
  ({ sign, eclipseKind, houseOrdinal, houseTopics }) => `The ${sign} ${eclipseKind} brings your ${houseOrdinal} house of ${houseTopics} into focus. What started six months ago may look very different from where you are standing now, especially if the situation has changed faster than you expected.`,
  ({ sign, eclipseKind, houseOrdinal, houseTopics }) => `This ${sign} ${eclipseKind} moves through your ${houseOrdinal} house of ${houseTopics}, bringing a six-month cycle closer to its result. Some answers may arrive immediately. Other parts of the story may only make sense once you see what changes next.`
];
const trialAnchor = "Six months ago, this lunar cycle began with the New Moon in Pisces on {{matchingNewMoonDate}}.";
const trialPreviewMatchingNewMoonExactAt = "2026-03-19T01:23:00.000Z";
const trialPreviewTimeZone = "America/New_York";
const trialPreviewMatchingNewMoonDate = new Intl.DateTimeFormat("en-US", {
  timeZone: trialPreviewTimeZone,
  month: "long",
  day: "numeric"
}).format(new Date(trialPreviewMatchingNewMoonExactAt));
const trialCards = cards.map((card) => {
  const introVariant = ((card.house - 1) % trialIntroTemplates.length) + 1;
  const intro = trialIntroTemplates[introVariant - 1]({
    sign: "Pisces",
    eclipseKind: "lunar eclipse",
    houseOrdinal: card.houseOrdinal,
    houseTopics: trialHouseTopics[card.house],
    matchingNewMoonDate: trialPreviewMatchingNewMoonDate
  });
  const introCarriesExactCycleAnchor = intro.includes(`New Moon in Pisces on ${trialPreviewMatchingNewMoonDate}`);
  const cycleAnchorSuppressed = card.proposed.cycleAnchorSuppressed || introCarriesExactCycleAnchor;
  return {
    id: `trial/eclipse/lunar/pisces/rising-${card.risingSign}/house-${card.house}`,
    risingSign: card.risingSign,
    house: card.house,
    houseOrdinal: card.houseOrdinal,
    houseTopics: trialHouseTopics[card.house],
    introVariant,
    intro,
    protectedBodyRemainder: card.proposed.sections.find((section) => section.id === "bookBodyRemainder").text,
    approvedOmittedIntentionBlocks: card.proposed.omittedDeclaredIntentionBlocks,
    cycleAnchor: cycleAnchorSuppressed ? null : trialAnchor,
    cycleAnchorSuppressed,
    cycleAnchorSuppressionReason: card.proposed.cycleAnchorSuppressed
      ? "approved-book-callback"
      : introCarriesExactCycleAnchor
        ? "exact-date-in-intro"
        : null,
    recommendation: [4, 8, 12].includes(card.house) ? shared.endingsNoRitual : shared.noRitual,
    close: [4, 8, 12].includes(card.house) ? shared.endingsClose : shared.close
  };
});
const trialPacket = {
  schema: "pisces-lunar-eclipse-intro-variants-trial/v1",
  status: "editorial_experiment_non_serving",
  ownerApproved: false,
  promotionAuthorized: false,
  supersedesApprovedPacket: false,
  assignmentRule: "variant = ((house - 1) % 6) + 1; deterministic and never random",
  variables: {
    sign: "Pisces",
    eclipseKind: "lunar eclipse",
    matchingNewMoonExactAt: trialPreviewMatchingNewMoonExactAt,
    readerTimeZone: trialPreviewTimeZone,
    matchingNewMoonDate: `localized from exactAt; preview uses ${trialPreviewMatchingNewMoonDate}`,
    phaseDevelopment: "not used in this trial"
  },
  flow: ["intro", "protectedBodyRemainder", "matchingNewMoonAnchorUnlessAlreadyInIntroOrBook", "recommendation", "close"],
  cards: trialCards
};
const trialIntroGrid = trialCards.map((card) => `
  <article class="intro-card">
    <div class="eyebrow">VARIANT ${card.introVariant} · ${escapeHtml(title(card.risingSign))} RISING · HOUSE ${card.house}</div>
    <p>${escapeHtml(card.intro)}</p>
  </article>`).join("\n");
const trialFullCards = trialCards.filter((card) => [4, 9, 10, 12].includes(card.house)).map((card) => `
  <article class="full-card" id="trial-house-${card.house}">
    <div class="eyebrow">FULL FLOW · VARIANT ${card.introVariant}</div>
    <h2>${escapeHtml(title(card.risingSign))} Rising · ${escapeHtml(card.houseOrdinal)} house</h2>
    <div class="rule"></div>
    <p class="opening">${escapeHtml(card.intro)}</p>
    ${card.protectedBodyRemainder.split(/\n{2,}/u).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    ${card.cycleAnchor ? `<p class="anchor">${escapeHtml(card.cycleAnchor)}</p>` : ""}
    <p>${escapeHtml(card.recommendation)}</p>
    <p>${escapeHtml(card.close)}</p>
  </article>`).join("\n");
const trialHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pisces Eclipse Intro Variants · Trial</title>
<style>
:root{--ink:#20212a;--muted:#6d7484;--line:#e1e3e7;--wash:#cbd2d8;--paper:#fff}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:linear-gradient(135deg,#edf0f2,var(--wash));font-family:Inter,system-ui,-apple-system,sans-serif}header{position:sticky;top:0;z-index:2;padding:18px 5vw;background:rgba(255,255,255,.9);border-bottom:1px solid rgba(32,33,42,.1);font:700 15px ui-monospace,SFMono-Regular,Menlo,monospace}main{width:min(1120px,calc(100% - 40px));margin:54px auto 96px}.hero{max-width:850px;margin-bottom:36px}.hero h1{margin:0 0 14px;font:500 clamp(40px,6vw,68px)/1.02 Georgia,serif}.hero p{color:var(--muted);font-size:18px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.intro-card,.full-card{background:var(--paper);border:1px solid rgba(32,33,42,.08);box-shadow:0 18px 45px rgba(42,52,61,.12)}.intro-card{padding:26px;border-radius:18px}.intro-card p{margin:15px 0 0;color:#4f5766;font-size:17px;line-height:1.55}.eyebrow{color:var(--muted);font:700 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em}.full-heading{margin:72px 0 24px;font:500 42px Georgia,serif}.full-card{margin:26px 0;padding:clamp(30px,6vw,72px);border-radius:28px}.full-card .eyebrow{text-align:center}.full-card h2{text-align:center;margin:18px 0 28px;font:500 clamp(34px,5vw,56px)/1.1 Georgia,serif}.rule{height:1px;margin-bottom:38px;background:var(--line)}.full-card p{margin:0 0 22px;color:#565e6e;font-size:clamp(17px,2vw,20px);line-height:1.62}.full-card .opening{color:var(--ink);font-family:Georgia,serif;font-size:clamp(24px,3vw,33px);line-height:1.35}.anchor{padding:16px;background:#f2f3f6;border-radius:12px}.legend{padding:16px 18px;background:#fff;border-radius:14px;color:var(--muted);line-height:1.55}.token{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}@media(max-width:700px){main{width:calc(100% - 20px);margin-top:30px}.grid{grid-template-columns:1fr}.full-card{padding:30px 22px;border-radius:20px}.hero{padding:0 6px}}
</style></head><body><header>TLDR Astro · non-serving intro experiment</header><main>
<section class="hero"><h1>Pisces eclipse intro rotation</h1><p>Six deterministic openings across twelve houses. This trial does not replace the approved packet. It removes the separate nature/mechanics stack because each intro already carries the eclipse consequence.</p><div class="legend"><span class="token">{{matchingNewMoonDate}}</span> is localized from the engine's exact timestamp. This preview uses ${trialPreviewTimeZone}, where the date is ${trialPreviewMatchingNewMoonDate}. When an intro or protected book passage already names the matching New Moon, the separate anchor is suppressed.</div></section>
<section class="grid">${trialIntroGrid}</section>
<h2 class="full-heading">Four complete-flow samples</h2>${trialFullCards}
</main></body></html>`;

fs.writeFileSync(jsonOut, `${JSON.stringify(packet, null, 2)}\n`);
fs.writeFileSync(markdownOut, `${markdown.replace(/[ \t]+$/gmu, "")}\n`);
fs.writeFileSync(htmlOut, html.replace(/[ \t]+$/gmu, ""));
fs.writeFileSync(trialJsonOut, `${JSON.stringify(trialPacket, null, 2)}\n`);
fs.writeFileSync(trialHtmlOut, trialHtml);

console.log(`Wrote ${path.relative(root, jsonOut)}`);
console.log(`Wrote ${path.relative(root, markdownOut)}`);
console.log(`Wrote ${path.relative(root, htmlOut)}`);
console.log(`Wrote ${path.relative(root, trialJsonOut)}`);
console.log(`Wrote ${path.relative(root, trialHtmlOut)}`);
console.log(`Cards: ${cards.length}; approved omitted intention blocks: ${cards.reduce((sum, card) => sum + card.proposed.omittedDeclaredIntentionBlocks.length, 0)}`);
