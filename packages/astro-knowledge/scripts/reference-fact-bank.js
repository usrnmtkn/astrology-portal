const fs = require("fs");
const path = require("path");
const { buildAcKnowledgeContext, queryAcReference } = require("./ac-reference-corpus.js");

const bankPath = path.resolve(
  __dirname,
  "../../../apps/web/src/content/fallbackArchitectureV3/source-rows/editorial-source-bank-v1.json"
);

function readBank() {
  return JSON.parse(fs.readFileSync(bankPath, "utf8"));
}

function flattenReferenceFacts(bank = readBank()) {
  const facts = bank.facts;
  if (!facts || facts.lane !== "reference" || facts.reader_serving !== false) {
    throw new Error("Editorial fact bank must remain in the non-serving reference lane.");
  }
  return (facts.entries || []).map((entry) => ({
    ...entry,
    factKey: `reference-fact/editorial/${entry.id}`,
    lane: facts.lane,
    reader_serving: false,
    source_document: facts.source_document
  }));
}

function searchTerms(value) {
  return String(value || "")
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((term) => term.length >= 3) || [];
}

function queryReferenceFacts(query, bank = readBank()) {
  const terms = [...new Set(searchTerms(query))];
  if (!terms.length) return [];
  return flattenReferenceFacts(bank)
    .map((fact) => {
      const searchable = JSON.stringify(fact).toLowerCase();
      const score = terms.filter((term) => searchable.includes(term)).length;
      return { fact, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.fact.id.localeCompare(b.fact.id))
    .map(({ fact }) => fact);
}

function checkReferenceClaim(claim, bank = readBank()) {
  const text = String(claim || "");
  const findings = [];
  for (const fact of flattenReferenceFacts(bank)) {
    if (fact.status === "quarantined-source-claim") continue;
    let hasConflict = false;
    for (const source of fact.conflictPatterns || []) {
      const pattern = new RegExp(source, "i");
      const match = text.match(pattern);
      if (!match) continue;
      findings.push({
        severity: "fail",
        source: "reference-facts",
        factId: fact.id,
        factKey: fact.factKey,
        status: fact.status,
        match: match[0],
        reason: fact.statement
      });
      hasConflict = true;
      break;
    }
    if (hasConflict) continue;
    for (const source of fact.reviewPatterns || []) {
      const pattern = new RegExp(source, "i");
      const match = text.match(pattern);
      if (!match) continue;
      findings.push({
        severity: "warn",
        source: "reference-facts",
        factId: fact.id,
        factKey: fact.factKey,
        status: fact.status,
        match: match[0],
        reason: `${fact.statement} Qualify whether the sentence describes the app's 1-degree policy or the traditional 17-arcminute primary.`
      });
      break;
    }
  }
  return findings;
}

function buildReferenceFactContext(text, { limit = 12 } = {}) {
  const facts = queryReferenceFacts(text)
    .filter((fact) => fact.status !== "quarantined-source-claim")
    .slice(0, limit);
  if (!facts.length) return "";
  return [
    "REFERENCE FACTS (non-serving QA lane):",
    ...facts.map((fact) => (
      `- [${fact.status}] ${fact.id}: ${fact.statement}`
      + (fact.values ? ` Values: ${JSON.stringify(fact.values)}` : "")
    )),
    "Use verified-reference entries to check numerical and doctrinal claims. Treat prohibited-error and blocked-unverified entries as unusable. Quarantined source claims are excluded from judge context until independently sourced."
  ].join("\n");
}

module.exports = {
  bankPath,
  buildAcKnowledgeContext,
  buildReferenceFactContext,
  checkReferenceClaim,
  flattenReferenceFacts,
  queryAcReference,
  queryReferenceFacts,
  readBank
};
