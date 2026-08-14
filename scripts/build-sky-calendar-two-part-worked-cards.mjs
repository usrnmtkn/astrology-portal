#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  auditSkyCalendarTwoPartCards,
  composeSkyCalendarTwoPartCard,
  loadLiveSkyReaderBodies,
  loadSkyCalendarComponentRegistry,
} from "./sky-calendar-two-part-composer.mjs";

const root = process.cwd();
const reviewDir = path.join(
  root,
  "packages/astro-knowledge/review/sky-calendar-two-part-composer-v1",
);
const planPath = path.join(reviewDir, "worked-card-plans.json");
const outputPath = path.join(reviewDir, "worked-cards.json");
const reportPath = path.join(reviewDir, "GATE-REPORT.md");

const plans = JSON.parse(fs.readFileSync(planPath, "utf8"));
const registry = loadSkyCalendarComponentRegistry();
const cards = plans.cards.map((plan) => composeSkyCalendarTwoPartCard(registry, plan, {
  reviewMode: true,
}));
const baselineBodies = loadLiveSkyReaderBodies(root);
const gateReport = auditSkyCalendarTwoPartCards(cards, { baselineBodies });

if (!gateReport.pass) {
  console.error(JSON.stringify(gateReport, null, 2));
  process.exit(1);
}

const publicCards = cards.map(({ componentProseForGate, ...card }) => card);
const output = {
  schema: "tldr.sky-calendar.two-part.worked-cards.v1",
  status: "PENDING OWNER",
  generationAllowed: false,
  notice: "Review-only deterministic compositions. Component approval remains incomplete, so serving is fail-closed.",
  componentRegistry: "packages/astro-knowledge/review/sky-calendar-meaning-components-v1/sky-calendar-meaning-components-v1.json",
  counts: {
    cards: publicCards.length,
    liveBodiesCheckedForSentenceCollision: gateReport.baselineBodyCount,
    constructionPass: gateReport.cardReports.filter((report) => report.constructionPass).length,
    servingEligible: gateReport.cardReports.filter((report) => report.servingEligible).length,
  },
  gateSummary: gateReport,
  cards: publicCards,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

const lines = [
  "# Sky Calendar two-part composer gate report",
  "",
  "Status: **PENDING OWNER.** These are unbilled review examples. Nothing is approved or serving.",
  "",
  `- Worked cards: ${publicCards.length}`,
  `- Construction gates passed: ${gateReport.cardReports.filter((report) => report.constructionPass).length}/${publicCards.length}`,
  `- LIVE reader bodies checked for sentence collisions: ${gateReport.baselineBodyCount}`,
  `- Serving eligible: ${gateReport.cardReports.filter((report) => report.servingEligible).length}/${publicCards.length} (expected 0 while components remain PENDING OWNER)`,
  `- Frame cap: ${gateReport.frameCap}`,
  "",
  "## What the composer does",
  "",
  "The composer resolves exactly four governed inputs: both planet-sign components, the aspect mechanism, and one selected modality or element component. It then assembles owner-review beat text in the required reader order and runs every gate. It does not concatenate component clauses or invent prose from a template.",
  "",
  "A production-mode call fails closed until all four components are OWNER APPROVED. Review mode exists only to inspect these six examples before that approval.",
  "",
  "## Per-card results",
  "",
];

for (const card of publicCards) {
  const result = gateReport.cardReports.find((report) => report.contentKey === card.contentKey);
  lines.push(
    `### ${card.detailsTransitLabel.replace(/\.$/u, "")}`,
    "",
    `- Classification: \`${card.classification}\``,
    `- Construction gates: **${result.constructionPass ? "PASS" : "FAIL"}**`,
    `- Governance: \`${result.expectedGovernanceBlock ?? "components_approved"}\``,
    `- Inputs: \`${Object.values(card.inputs.componentKeys).join("`, `")}\``,
    "",
    "Forecast preview:",
    "",
    `> ${card.forecastRenderedPreview}`,
    "",
    "Details:",
    "",
    `> ${card.details}`,
    "",
  );
}

lines.push(
  "## Gates applied to every card",
  "",
  "- No component meaning is emitted verbatim as a sentence.",
  "- No sentence duplicates another worked card or a current LIVE body.",
  "- Forecast and Details opener/connective frames stay under the cap.",
  "- Forecast and Details beats are present in the required reader order.",
  "- Alternative scene menus fail; synonym sets and facets of one question pass.",
  "- Forecast stays collective and contains no astrology vocabulary.",
  "- Second person, standing-pattern language, coaching, non-ASCII text, em dashes, and `steady` fail.",
  "- The stored Forecast body begins lowercase.",
);

fs.writeFileSync(reportPath, `${lines.join("\n")}\n`);
console.log(JSON.stringify({ outputPath, reportPath, counts: output.counts }, null, 2));
