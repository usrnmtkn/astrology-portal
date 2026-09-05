# Sky client-flow assertion refresh — 2026-09-05

This test-only change updates two assertions that were stale relative to current production content authority.

1. The North Node placement hierarchy test no longer requires both `Gifts` and `Lessons` to be present when the selected related-aspect set legitimately contains only one group. It still requires at least one visible group, restricts labels to the approved `Gifts` / `Lessons` vocabulary, prevents duplicate visible group labels, and preserves the established typography comparison.
2. The Sun in Virgo canonical V4 test now asserts exact text from the currently serving owner-approved SKY V4 correction layer rather than the superseded pre-correction article.

No reader code, astrology calculation, content package, approval state, or serving copy is changed by this test repair.
