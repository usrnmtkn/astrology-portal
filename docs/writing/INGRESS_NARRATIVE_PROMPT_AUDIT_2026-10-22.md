# Ingress narrative prompt and template audit

This initial proposal was incomplete: it left the old format callable for
generation. The [follow-up authority audit](INGRESS_SINGLE_AUTHORITY_AUDIT_2026-10-22.md)
records the surviving paths, their closure and the current local repair. Results
below describe the preceding proposal, not the follow-up's final verification.

Owner request: compare the rejected result with the approved Libra benchmark
and Scorpio writing, repair the prompt and template, and show the changes.
No additional paid generation, judge, draft save or publication is authorized.

Base: `b92acb911d2ff37ac25a403820d9f6c70326c4c3`.
Branch: `codex/ingress-narrative-prompt-20261022`.
Changes are local and have not been deployed.

Final remote refresh found main at
`4b7e9b8d895881913b3a10e317141687bbdd81a8`: this uncommitted proposal is
0 commits ahead and 1 behind. That newer commit changes Synastry ownership,
feedback and voice routing; its ingress functions, template and scoped
editorial authority are unchanged. This audit's tests refer to the local
candidate on the stated base, not a merged or deployed revision.

## Comparison with the approved writing

The complete approved references were read, not reduced to sample sentences.
The Libra benchmark develops what people want from one another, how an
arrangement can become difficult, why a person may resist changing it, and
what cooperation or enjoyment makes possible. Scorpio develops the
relationship between identity, investment and continued commitment. The
astrology helps that thought develop instead of interrupting it with a new
definition.

The Libra benchmark also contains aspect headings and calculated position
lines. Headings alone therefore do not explain the failed result. The conflict
is that the application made separate technical sections the writing task,
despite earlier instructions to write a connected article. This is an editorial
diagnosis, not a measured causal result from another paid A/B run.

| Runtime instruction or behavior | Change for new articles |
| --- | --- |
| Separate 120–180-word overview, three 100–180-word transit bodies and 60–100-word close | One complete `articleBody`, with no section word quotas or compulsory closing assignment |
| App inserts an event/date heading and degree, motion and dignity line before each transit body | Contacts remain factual evidence and required interpretation; the app no longer inserts a technical preface into each prose section |
| Summary repeats When, What and Takeaway before the overview | Exact When remains; What and Takeaway become metadata rather than required opening copy |
| Overview must repeat the exact entry date and time even after When | Establish the actual season early; integrate timing naturally from the supplied facts |
| A debility disclaimer sits among reader-writing instructions | Dignity remains factual evidence; explaining or disclaiming a label is not a reader paragraph requirement |
| Late coverage instructions restore independent transit fragments after the voice references | Whole-body coverage instructions come before the complete positive voice passages |
| Historical template structure can compete with the new layout | New declared layout governs; the complete saved article remains a reference, without importing old wording or dates |

## Prompt change

The provider now receives this task, rather than three independent transit
body assignments:

> Write one complete dated ingress article in articleBody. Use the complete
> supplied KB and Calendar for meaning and the complete approved Libra
> benchmark, original author article and Scorpio reference for voice.
> Metadata fields are separate from the article, not opening paragraphs to
> repeat. Write the article as a whole rather than filling a sequence of
> explanations.

Its positive craft direction is to follow how the references develop a thought:
what people want, why something can become difficult or rewarding, and what
that helps us understand. An astrological explanation belongs where it
illuminates that thought. The references supply neither a required hook nor a
collection of scenarios to transplant.

The scoped system authority follows the declared format rather than imposing
Summary/overview/transits/close on every article. Personal Transit authority
and the shared Ghostwriter skill are unchanged.

## New template

`ingress-essay-v3` uses:

```markdown
# {{articleTitle}}

**When:** {{when}}

{{articleBody}}

{{priorOccurrenceSection}}

{{otherDatesSection}}
```

`articleBody` can contain useful headings. The writer may connect or group
the selected contacts as the thought requires. It must retain their distinct
source-supported meaning. `otherDatesSection` is assembled by the application
as **Key dates**, containing all selected and remaining required events once,
chronologically, with later events labeled **Follow through**.

The provider's normal new-article schema requests `what`, `takeaway` and
`articleBody`. The application supplies the calculated title, When and Key
dates. A verified optional history section remains supported. There is still
one existing writer call, with no automatic judge, rewrite or retry.

## Preserved source and factual contracts

- Complete KB, learning-axis and Calendar season passages supply meaning.
- Complete collective planet/sign, aspect and lunar-phase sources are retained.
- The primary Libra benchmark and supporting Scorpio remain complete,
  voice-only sources with their existing hashes and authorship labels.
- The complete eligible original author article remains in paragraph order;
  its separate rising-sign companion is excluded.
- Swiss calculation, event selection, exact entry/exit, ET formatting, lunar
  events, ruler stations and later follow-through are unchanged.
- Full participant degrees, motion and dignity remain in Studio's facts and
  the new generation receipt. They are evidence, not compulsory prose lines.
- Existing `ingress-essay-v2` format, eleven fields, template and format
  instructions are byte-for-byte unchanged. New requests default to v3;
  existing v2 workspaces remain accessible through the format selector.
- Opening or revising a stored edition continues to use its stored complete
  wording. No stored rows, approved text or private voice sources were changed.

## Offline test cases

| Case | Evidence sought |
| --- | --- |
| Libra 2026 whole-body contract | One intact body, no transit fragment fields, no inserted technical headings |
| Complete transit dates | Every selected and remaining required event once; both Moons, Venus retrograde and later Venus follow-through retained |
| Wrong date/time, numeric degree, missing date or personal house | Candidate held by the applicable factual checks |
| Actual OpenAI and Claude handlers | Full body schema, complete meaning sources and exact full voice references delivered once |
| Rejected provider copy | Original candidate returned for review; no second call or storage write |
| Legacy compiler and reader | Existing v2 field/template contract and complete stored text retained |
| Owner-only Preview | New format, one intercepted generation, complete body displayed, no persistence, discard/reload and error states |
| Synthetic saved workspace | Both versions save/reopen/compile in isolated fixtures, without changing the source article |

Mechanical checks establish source delivery, structure and bounded factual
validation. They cannot certify literary quality, full semantic accuracy or
owner approval. No new model output exists for a prose-quality claim.

## Verification results

| Check | Result |
| --- | --- |
| Whole-body contract, valid and invalid timing, required event list, optional empty history, Taurus 2027 isolation, compiler and exact reader body | Passed |
| Actual authenticated facts and generation handlers, both providers, complete source delivery, unchanged hashes, rejected-copy recovery and GET-only storage | Passed |
| Existing editorial cases, including legacy degree/motion, omission, dignity and house guards | Passed |
| Synthetic saved workspace browser flow, v2 and v3, mobile light and desktop dark | 4 passed |
| Owner login and unsaved Preview, including four width/theme variants, computed styles, no persistence, discard/reload, failures and one-call protection | 15 passed |
| Server, admin and web TypeScript | Passed |
| CSS and token audits | Passed; no styles or tokens added |
| Source, admin and web asset privacy | Passed |
| Admin and web bundle budgets | Passed with existing limits unchanged |
| Complete Content Studio API suite | Passed, exit 0, including the new ingress contract test; all providers intercepted |

Matched independent baseline/candidate builds used Node 22.20.0 and the same
synthetic public environment. Admin entry raw bytes changed from 795,957 to
796,124 (+167), entry gzip from 229,698 to 229,738 (+40), and total JavaScript
gzip from 799,772 to 799,873 (+101). Asset count stays 81. Server-only prompt
descriptions are absent from the browser assets. The initial implementation's
avoidable field-array coupling was removed; no budget limit was raised.

The initial complete API attempt reached and passed the ingress cases, then
stopped at a sandbox denial of the test runner's local IPC socket. The full
suite was restarted with local socket access and the same isolated providers
and storage fixtures. No functional assertion was waived.

Paid calls: **0**. Owner drafts saved or published: **0**. No production changes
were made. Literary quality remains untested by a new model output.
