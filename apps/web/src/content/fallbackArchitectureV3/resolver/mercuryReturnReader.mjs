export const MERCURY_RETURN_CONTACT_KEY = "authored/transit-aspect/mercury/mercury/conjunction";

/** Exact personal-return copy: select a stored audience field and substitute only its date. */
export function mercuryReturnCopy(row, voice = "you", window, SourceGapError) {
  const audience = voice === "you" ? "you" : "they";
  const field = `body_${audience}`;
  const source = row[field];
  if (typeof source !== "string" || !source.trim()) {
    throw new SourceGapError(`SOURCE_GAP: Mercury return missing ${field}`);
  }
  const body = source.replaceAll("{{untilDate}}", () => {
    const untilDate = typeof window === "string" ? window.replace(/^until\s+/i, "").trim() : "";
    if (!untilDate) throw new SourceGapError("SOURCE_GAP: Mercury return missing calculated end date");
    return untilDate;
  });
  if (/\{\{|\}\}/u.test(body)) {
    throw new SourceGapError("SOURCE_GAP: Mercury return unresolved placeholder");
  }
  return { body, audience, field };
}
