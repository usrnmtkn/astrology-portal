export function ownerRejectedExactTexts(corrections = []) {
  return new Set((corrections ?? [])
    .filter((entry) => (
      entry?.positive_evidence_revoked === true
      || /^\[rejected(?:\s|;|\])/iu.test(String(entry?.corrected ?? "").trim())
    ))
    .map((entry) => String(entry?.bad ?? "").trim())
    .filter(Boolean));
}

export function withoutOwnerRejectedEvidence(rows = [], corrections = [], textField = "text") {
  const rejectedTexts = ownerRejectedExactTexts(corrections);
  if (!rejectedTexts.size) return [...rows];
  return (rows ?? []).filter((row) => !rejectedTexts.has(String(row?.[textField] ?? "").trim()));
}
