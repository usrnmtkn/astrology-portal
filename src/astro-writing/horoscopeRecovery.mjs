// Longer than the API's 300-second maximum lifetime. A late handler is also
// fenced by the row version before it can dispatch or save a response.
export const HOROSCOPE_STARTUP_DEADLINE_MS = 310000;

export function horoscopeStartupRecovery(operation, now = Date.now()) {
  if (!operation || operation.workflow || operation.responseId) return null;
  const started = Date.parse(operation.startedAt);
  if (!Number.isFinite(started) || now - started < HOROSCOPE_STARTUP_DEADLINE_MS) return 'waiting';
  return operation.requestHash ? 'uncertain' : 'not_dispatched';
}

export function horoscopePendingReadings(edition, generation) {
  return edition.passages.filter(p => !p.headline.trim() && !p.body.trim() && !generation?.heldRequests?.[p.sign]);
}
