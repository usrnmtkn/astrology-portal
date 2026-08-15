# Solar Return calculation contract

Status: governed calculation decision

Owner ruling: 2026-08-15

The calculation service determines a Solar Return from the geocentric tropical
longitude of the natal Sun and the moving Sun. It scans the sixteen-day window
centered on the requested target date in 0.125-day (three-hour) increments,
finds the bracket where the signed longitude error crosses zero, and bisects
that bracket for at most 64 iterations.

Convergence is reached when the absolute longitude error is at most `0.0001`
degrees. The tolerance is an angular tolerance on the Sun, not a rounded clock
time or a tolerance on an angle. The returned UTC instant is then used to
calculate the return chart.

The return instant itself is geocentric and does not depend on the terrestrial
location. The return chart's angles and houses use `returnLocation` unless
`useBirthplace` is true. If `returnLocation` is absent, the calculation falls
back to the natal subject's stored location. Marie Satori's governed 2026
contract uses the Manhattan borough centroid, latitude `40.7831`, longitude
`-73.9712`, and resolves to:

- return moment: `2026-02-18T01:59:11Z`
- Solar Return Ascendant: `11°00' Libra`
- Solar Return Midheaven: `12°46' Cancer`

The implementation constants live in
`services/tldrastro-api/src/tldrastro_api/services/solar_return.py`; the
calculation-backed regression lives in
`services/tldrastro-api/tests/test_report_colophon_contract.py`.
