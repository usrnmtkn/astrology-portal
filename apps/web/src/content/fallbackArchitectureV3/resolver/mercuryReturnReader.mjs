export const MERCURY_RETURN_CONTACT_KEY = "authored/transit-aspect/mercury/mercury/conjunction";

/** Exact personal-return copy: select a stored audience field and substitute only its date. */
export function mercuryReturnCopy(row, voice, window, SourceGapError) {
  const audience = voice === undefined || voice === "you" ? "you" : "they";
  const field = audience === "you" ? "body_you" : "body_they";
  const source = row[field];
  if (typeof source !== "string" || !source.trim()) {
    throw new SourceGapError(`SOURCE_GAP: Mercury return missing ${field}`);
  }
  const untilDate = typeof window === "string" ? window.replace(/^until\s+/i, "").trim() : "";
  if (source.includes("{{untilDate}}") && !untilDate) {
    throw new SourceGapError("SOURCE_GAP: Mercury return missing calculated end date");
  }
  const body = source.replaceAll("{{untilDate}}", () => untilDate);
  if (/\{\{|\}\}/u.test(body)) {
    throw new SourceGapError("SOURCE_GAP: Mercury return unresolved placeholder");
  }
  return { body, audience, field };
}
