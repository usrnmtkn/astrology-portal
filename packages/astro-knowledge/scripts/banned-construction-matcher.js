const CC_SD_LITERAL_PATTERNS = new Map([
  ["Great question.", ["Great question."]],
  ["Welcome to another powerful week", ["Welcome to another powerful week"]],
  ["Let's dive into what the stars have in store", ["Let's dive into what the stars have in store"]],
  ["You got this. / There's no finish line.", ["You got this"]]
]);

function findBannedConstructions(text, constructions) {
  const haystack = String(text || "");
  const lowered = haystack.toLowerCase();
  const findings = [];

  for (const construction of constructions || []) {
    const pattern = String(construction?.pattern || "").trim();
    if (!pattern) continue;

    if (construction.source === "CC" || construction.source === "SD") {
      // Pattern families need editorial judgment. Mechanically match only the
      // corpus-verbatim tics approved for literal enforcement.
      if (pattern.includes("[") || !CC_SD_LITERAL_PATTERNS.has(pattern)) continue;
      for (const literal of CC_SD_LITERAL_PATTERNS.get(pattern)) {
        if (lowered.includes(literal.toLowerCase())) {
          findings.push({
            severity: "fail",
            source: "banned-constructions",
            term: pattern,
            match: literal,
            reason: construction.reason
          });
          break;
        }
      }
      continue;
    }

    // Preserve the established loose-prefix behavior for the legacy list.
    const probe = pattern.replace(/\[[^\]]*\]/g, "").trim();
    if (probe && lowered.includes(probe.toLowerCase().slice(0, 24))) {
      findings.push({ severity: "warn", source: "banned-constructions", term: pattern });
    }
  }

  return findings;
}

module.exports = { CC_SD_LITERAL_PATTERNS, findBannedConstructions };
