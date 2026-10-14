/** Accept explicit ISO dates/instants without Date's silent calendar rollover. */
export function parseCalculationDate(value: string | null): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d))?$/u.test(value)) {
    throw new Error("Calculation date must be an ISO date or timestamp with a time zone.");
  }
  const day = value.slice(0, 10);
  const calendarDate = new Date(`${day}T12:00:00Z`);
  const instant = new Date(value);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== day
    || !Number.isFinite(instant.getTime())) {
    throw new Error("Calculation date must name a valid calendar day.");
  }
  return instant;
}
