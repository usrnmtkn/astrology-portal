export const MERCURY_RETURN_CONTACT_KEY = "authored/transit-aspect/mercury/mercury/conjunction";

/** Exact personal-return copy: select a stored audience field and substitute only its date. */
export function mercuryReturnCopy(row, field, window, SourceGapError) {
  const fail = reason => { throw new SourceGapError(`SOURCE_GAP: ${reason}`); };
  const source = row[field];
  if (typeof source !== "string" || !source.trim()) {
    fail(`missing ${field}`);
  }
  const body = source.replace(/\{\{untilDate\}\}/g, () => {
    const untilDate = typeof window === "string" ? window.replace(/^until\s+/i, "").trim() : "";
    return untilDate || fail("missing calculated end date");
  });
  if (/\{\{|\}\}/u.test(body)) {
    fail("unresolved placeholder");
  }
  return body;
}
