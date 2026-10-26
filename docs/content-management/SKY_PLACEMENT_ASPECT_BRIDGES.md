# Personalized placement aspect bridges

“Where it lands for you” keeps its complete house horoscope and existing
Personal Transit aspect sources. An optional, independently published bridge
connects that house to one exact directional contact.

Open **Sky Write-ups → House × aspect bridges**, choose the house, transiting
planet, aspect and natal point, then **Open bridge**. New passages start empty.
Opening an editor does not create a row. Save draft, reopen and normal
**Save & publish** use the existing version-checked package revision workflow.
The bridge is shared across signs for that house/contact; reversing the planets,
changing the house or changing the aspect selects a different source.

The key is:

```text
fallback-hook/sky-house-aspect-bridge/{house}/{transiting}/{aspect}/{natal}
```

The record uses `content_role: fallback_hook`, complete `body` prose and
`render_policy: sky-placement-house-aspect-bridge-v1`. Publication validates the
identity, role, policy, complete nonempty prose, and absence of variables or dated
timing. Bridge dates come from calculated contact timing, not saved prose.
Draft, missing, invalid and retired bridges stay absent. Their absence never
replaces or hides the complete existing aspect source.

Personal Transit publication hydration loads the bridge through the same public
reader projection, pagination, version checks and independent overlay as its
existing aspect sources. It is not a Sky-only package partition. A publication
change invalidates the existing source identity; an unavailable published source
uses the established load error and retry flow. There is no separate prose cache.

The reader retains the existing source `body` unchanged and stores bridge and
timing separately. For an untimed source, it displays calculated timing, bridge,
then the complete original passage. If the source already contains timing, it
does not add another date. An existing opening timing sentence stays first and
the bridge follows that complete sentence. Timing embedded elsewhere in an
authored passage stays in its original position. Existing authored duration
wording is preserved. No source sentence is deleted, shortened or paraphrased.
Grouped nodal contacts retain each member's source and bridge independently.

This implementation adds no generated bridges, automatic publication, source
passage revisions, calculation changes or paid model calls. New wording goes
through the usual owner publication action.

Verification:

- `npm run test:sky-placement-aspect-bridges` exercises the actual Studio and
  public reader handlers, draft privacy, conflict checks, publication, dynamic
  packaging and retirement, plus source integrity and timing composition.
- `tests/visual/sky-house-aspect-bridge-studio.spec.ts` checks discovery,
  new/open/save/reopen/publish/reload and house isolation in both themes at desktop/mobile widths.
- `tests/visual/sky-placement-aspect-bridges.spec.ts` uses a calculated synthetic
  chart, checks draft/publication visibility, full source openings and endings,
  timing counts and persistence after reload through the built reader.
- The existing Sky/You parity regression continues to check all 2,436 contact
  and motion routes against their unchanged aspect `body`.

## Release verification

The isolated feature checkout verifies the complete built reader, integrated
Studio and standalone Studio: 12 browser cases across desktop/mobile and
light/dark themes. The actual-handler regression covers drafts, version
conflicts, publication, reader hydration and retirement. Timing checks include
full and abbreviated dates while retaining the complete original passage.

The independent content-contract adapter now loads the same generated Sky
serving packages as the app, with explicit date fixtures. It also exposes
Friends-only aspect bodies and the weekly contact title supplied by the app.
The immutable contract passes all 815 units; no prose or contract assertion was
changed to obtain that result.

The release PR records the exact revision and the required complete Content
Studio API, content, privacy, build and deployed-browser results. Follow the
[API verification runbook](../qa/content-studio-api-verification.md) before
merging and verify the deployed main revision before reporting the update live.
