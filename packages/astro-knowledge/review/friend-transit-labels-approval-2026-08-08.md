# Friend transit labels approval — 2026-08-08

Scope: PR #96 reader-facing strings and render behavior.

Owner rulings on PR #96's held wording, 2026-08-08 — amend the branch, record, proceed.

- REJECTED: the directedDailyGlanceAdvice function ("You should {verb}" rewrites). Delete it and every call site; owner-approved daily-glance wording serves verbatim, imperatives untouched. No render-time modification of settled text, ever.
- APPROVED as-is: "Today for {name}".
- APPROVED as-is: "Between you two" and the kicker "Between you two right now".
- APPROVED as-is: "Active for {name}" and "Active for a few days".
- REPLACED: "Life areas in motion" becomes "Where it lands" (exact owner wording).
- APPROVED as-is on 2026-08-08: the technical transit caption assembled as `${transitPosition} is ${aspect} ${natalPosition} at a ${orb} orb. The aspect is ${direction}.`

The owner approved the exact caption after reviewing this rendered example: "Saturn in Aries is square Alex's natal Moon in Cancer in the 4th house at a 1° orb. The aspect is applying."
