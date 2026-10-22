# Why the ingress report structure survived

The earlier fixes were incomplete. They added voice guidance while retaining
the instructions and code that divided the article into technical sections.
The preceding local proposal then introduced a new format but left the old
format callable. Its tests explicitly preserved the old writing behavior.
Those constraints did not have to be reintroduced: the old path still had them.
The owner authorized committing, merging and deploying this repair on 2026-10-22.

The release candidate is on `codex/ingress-narrative-prompt-20261022`, rebased
onto refreshed main `4b7e9b8d895881913b3a10e317141687bbdd81a8`. The integration
preserves the Synastry request preparation and its API regressions alongside
the ingress guards. Hosted checks and deployment receipts belong to the release PR.

## Active controls found

| Location | Earlier behavior | Current local repair |
| --- | --- | --- |
| `apps/web/src/content/skyIngressEssay.mjs` | Field descriptions prescribed section word ranges; the format instructions required Summary and technical transit sections | Old prose instructions removed. Old names/layout retained for saved editions only. Current authoring descriptions come from the server contract |
| `api/_lib/content-generation.ts` | Multiple ingress prompt branches and general article entry points could accept dated ingress identities | One dedicated ingress builder. General OpenAI/Claude article generators reject dated ingress requests |
| `api/_lib/sky-ingress-writing.ts` | Converted major transits into three independent provider fields, then inserted exact headings and position lines | Legacy schema/assembler removed. One body is preserved intact; exact Key dates are assembled separately |
| `src/astro-writing/transitIngressEditorialAuthority.cjs` | System prose guidance could coexist with different local schema and assembly directions | Owns the versioned system authority, task, craft, layout policy, source roles, field descriptions, coverage guidance and final reading check |
| `api/admin/sky-article-template-slots.ts` | Old format remained a valid generation request; omitted format selected a different template writer | Explicit format required. Old ingress generation returns 409 before storage, calculation or provider work |
| Studio editor | Old format could still invoke Generate unfinished fields | Saved ingress layouts remain editable/compilable; their generation button is disabled. New articles use the current format |
| Preview without saving | Uses the same generation endpoint | Continues to use that same current ingress format and contract, without persistence |

The current provider schema has one article body, plus article metadata and
optional verified history. It cannot request old transit-fragment fields or ask
the model to replace calculated title/timing fields. Complete calculation
context, the saved reference and Sun-season KB/Calendar meaning are checked
before dispatch. Source passages are retained in full.

## One active ingress writer, distinct other writers

- **Dated ingress article:** the current whole-article contract, used by both
  the edition generator and unsaved Preview.
- **Saved ingress layout:** historical field names and rendering, with no
  model generation. Existing text remains available for editing and compilation.
- **Saved guide template:** an explicit separate mode using its own immutable
  guide variables and structure. It is not a fallback ingress writer.
- **Evergreen placement/season writer:** `sky-article-writing.ts`; it deliberately
  excludes a specific year's dates and transits. Its contract is unchanged.
- **Short Sky cards:** `sky-draft-writing.ts`; separate card generation/review
  and persistence behavior, not the dated article or unsaved Preview.

The shared Ghostwriter skill, contextual rhetorical policy and scoped effective
rules remain active. The actual requests are checked for the absence of the
generic natal article spine, forced opening sequence, transit fragments and
section quotas. Complete Libra, Scorpio and eligible original author passages
remain unchanged and voice-only. KB/Calendar establish meaning; calculations
establish dates and placements. Saved editions and private references were not
rewritten.

## Preventing a silent return

`INGRESS_WRITER_CONTRACT` is the shared source for both providers and the
server adapters. Its current version is `ingress-article/v4-2026-10-22`.
The read-only authenticated inspection endpoint and generation receipts expose
the same version, format and SHA-256 of the contract plus current layout.
This verifies more than the presence of an approved voice reference.

Regression cases exercise the actual boundaries:

1. A stale old-format HTTP request returns 409 with zero network calls.
2. Direct old-format generation and both general provider generators stop.
3. Missing calculation/season sources and old or calculated field names stop.
4. Both providers receive the same canonical authority and field descriptions,
   complete meaning sources and unchanged full voice references.
5. The complete body passes through intact, with all calculated dates covered.
6. Saved old layouts still edit, reopen and compile without generation.
7. Preview remains owner-only, sends one intercepted generation and does not
   persist the synthetic result through discard or reload.

These checks verify routing, instruction delivery and bounded factual rules.
They do not prove a new draft's literary quality or grant owner approval.

## Verification

| Check | Result |
| --- | --- |
| Stale HTTP requests, missing explicit mode, direct old-format requests, both general provider entry points, missing calculation/season sources, fragment/calculated field names | Passed; zero network calls in the authority fixture |
| Actual ingress HTTP handlers, OpenAI and Claude request assembly, complete sources and exact full voice references, matching inspection/generation contract receipts | Passed |
| Complete Content Studio API suite | Passed, exit 0 |
| Current writer and saved-layout browser flow in all four width/theme combinations | 8 passed; saved-layout generation disabled |
| Owner-login and unsaved Preview, including discard/reload, error recovery, expiration and one-call protection | 15 passed |
| Plain Node deployment import, current/old calculated-field contracts and Swiss assets | Passed |
| Server/admin/web TypeScript, CSS/token audits, source/admin/web privacy and bundle budgets | Passed |

The plain Node import fixture was updated to include the newly shared server
module. The complete API suite was then rerun successfully; no functional
assertion was waived. Server-only prose controls remain out of browser assets.
Existing bundle limits were not raised: admin entry raw bytes are 796,058,
entry gzip 229,737 and aggregate JavaScript gzip 799,773 across 81 files.

The verified local contract/layout SHA-256 is
`897913891743c2a64424ec66bdeea23138f9986ff7a5cbc8e24073914ae745c5`.
This is an expected release receipt, not a claim that production has it.

These pre-release checks used no paid generation, owner draft save or
publication. Release checks must run on the integrated PR head, and production
must return the expected contract receipt before deployment is verified. The
next generated article's literary quality remains untested.
