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
  "packages/astro-knowledge/review/sky-calendar-two-part-composer-v2",
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
  schema: "tldr.sky-calendar.two-part.worked-cards.v2",
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
  `- Six-card shape cap: ${gateReport.batchShapeCap}`,
  "",
  "## What the composer does",
  "",
  "The composer resolves both planet-sign components and the aspect mechanism, plus one modality or element component only when it materially explains the behavior. Before prose, it requires a five-part causal situation: the tension or opening, observable event, practical consequence, persistence or movement behavior, and movable or actionable part.",
  "",
  "The four forecast beats remain traceable, but they may share sentences and have no visible sentence template. Details explains the astrology and stops before repeating the forecast conclusion. A production-mode call fails closed until every selected component is OWNER APPROVED.",
  "",
  "## Shape distribution",
  "",
  `- Opener families: ${Object.entries(gateReport.shapeDistribution.openerFamilies).map(([name, count]) => `\`${name}\` ${count}`).join(", ")}`,
  `- Closing families: ${Object.entries(gateReport.shapeDistribution.closingFamilies).map(([name, count]) => `\`${name}\` ${count}`).join(", ")}`,
  `- Entry modes: ${Object.entries(gateReport.shapeDistribution.entryModes).map(([name, count]) => `\`${name}\` ${count}`).join(", ")}`,
  `- Repeated colon-plus-three-item closing lists: ${gateReport.batchDefects.filter((defect) => defect.code === "repeated_colon_three_item_list").length}`,
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
    `- Argument shape: \`${card.argumentShape.aspect}\``,
    `- Entry mode / opener family: \`${card.entryMode}\` / \`${result.openerFamily}\``,
    `- Closing function: \`${result.closingFamily}\``,
    `- Construction gates: **${result.constructionPass ? "PASS" : "FAIL"}**`,
    `- Governance: \`${result.expectedGovernanceBlock ?? "components_approved"}\``,
    `- Inputs: \`${Object.values(card.inputs.componentKeys).filter(Boolean).join("`, `")}\``,
    `- Causal situation: ${Object.values(card.causalSituation).map((item) => item.value).join(" → ")}`,
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
  "- The Forecast carries all four hidden beats in two to five sentences; Details preserves its three-beat reader order and stops after explanation.",
  "- Opener families, closing families, and entry modes are capped at two in this six-card pilot.",
  "- Repeated `X may Y`, `What can move/change is`, and colon-plus-three-item closing frames fail.",
  "- Details may not repeat or closely paraphrase a Forecast sentence or conclusion.",
  "- Alternative scene menus fail; synonym sets and facets of one question pass.",
  "- Forecast stays collective and contains no astrology vocabulary.",
  "- Generic `people`, vague `capacity` or `material`, invented motives, personified abstractions, repeated modal hedging, and component-stitching language fail.",
  "- Second person, standing-pattern language, generic coaching, non-ASCII text, em dashes, and `steady` fail.",
  "- The stored Forecast body begins lowercase.",
);

fs.writeFileSync(reportPath, `${lines.join("\n")}\n`);
console.log(JSON.stringify({ outputPath, reportPath, counts: output.counts }, null, 2));
