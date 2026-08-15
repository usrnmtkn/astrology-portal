# General 12-month report structure contract

Status: implementation contract, owner benchmark and rulings through 2026-08-15.

The authoritative structural benchmark is
`artifacts/marie-satori-year-ahead-2026-FINAL.md`. General 12-month reports use
the nine persisted units declared by `reportUnitIds("general", "12_months")`.
The rendered chapter order must byte-for-byte match that declaration. Key
dates are data owned by their season and are not a standalone unit. Money is
not a fixed unit. The chart-earned domain unit stores the exact Solar Return
factor IDs, coverage-gate tier, and inspection note that earned it.

Calculation-service periods are half-open intervals: `[startsAt, endsAt)`.
Adjacent season headings display their shared local calendar boundary. The
report's exclusive end instant is rendered as the preceding local calendar
date, so the 2026 report cover ends February 17, 2027 and the closing season is
`Dec 21 - Feb 17`. The first report date remains the purchased report start,
February 18, rather than the prior-evening local clock time of the exact Solar
Return.

The customer handle is required before any General 12-month writer call. No
fallback has been approved. A missing handle fails closed with
`REPORT_PROFILE_HANDLE_REQUIRED`; generation waits until the customer profile
contains one.

Season attributions are runtime-composed from eligible canonical Package 1
event IDs. Every dated clause uses one parenthetical with an abbreviated month.
Two bodies sharing one aspect/target share a single parenthetical. Saturn pass
language follows `the first of three sextiles`, `its second sextile`, and `its
third and final sextile`; retrograde phrasing follows `Saturn, retrograde,
makes` and `Jupiter retrograde opposes`. Eclipses use the same abbreviated-month
parentheticals as every other dated clause. Writers do not author these lines.

The facts engine and facts hash remain stored as internal review metadata.
They are not customer-facing colophon copy.
