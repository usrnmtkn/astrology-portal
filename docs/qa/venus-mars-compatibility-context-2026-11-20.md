# Venus–Mars Compatibility restoration

The original #1510 source was based on the older Compatibility dynamics grid.
Current main's approved Friend-profile redesign removed that grid and its
projection. Restoring only the old helper would leave the passage inaccessible
in Compatibility.

The combined candidate restores the specifically approved Venus–Mars square
reading through the current Compatibility card pattern, after the existing
planet-by-planet section. It does not restore the retired grid or promote other
Synastry passages into Compatibility. Both surfaces resolve the complete existing
pair passage through the same renderer, retaining planet ownership, relationship
context and pronouns. The narrow Friend exception applies only to this unordered
pair and square aspect. Family retains calculated contact facts without the
ineligible interpretation. Other romantic eligibility remains unchanged.

All 24 fresh-build browser cases pass with no retries: 390px and 1440px in light
and dark, both planet directions, and Friend/Partner/Family contexts. Positive
cases preserve complete wording and titles in Compatibility, Synastry and detail,
including reload. Family excludes the passage in both views. New section-heading
metrics match the existing planet-by-planet heading. The four theme/width
Compatibility screenshots were inspected: full text remains readable, cards use
the current styles, and no overflow or legacy grid is introduced. Web types and
CSS/token audits pass.

The initial browser run retained two test-maintenance failures: Family's fact-only
Synastry card was incorrectly expected to disappear, and the new readiness test
used an ambiguous Connection heading selector. The corrected assertions preserve
the prose exclusion and target the existing H2; the affected eight cases pass.
The four readiness cases cover desktop/mobile in both themes, GET-only requests,
no automatic request, source/revision metadata, held/unauthorized/invalid responses,
reload reset and no exposed server errors. Their screenshots were inspected.

These are isolated local acceptance results. Combined bundle limits, required
exact-head CI, main deployment and actual production acceptance remain separate.
