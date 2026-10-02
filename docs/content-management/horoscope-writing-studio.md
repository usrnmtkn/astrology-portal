# Horoscope writing in Content Studio

Open **Compose → AI Writing** (`#ai-writing`) to edit the daily, weekly, monthly or seasonal profile. Each profile contains voice guidance, reading structure, source guidance and the prompt that combines them. These are editorial instructions; they are separate from Calendar's collective overview templates and from reader passages.

The weekly starter follows the existing forecast-first horoscope contract. The daily and seasonal starters adapt its scope to the requested period. Starters are proposals, not approved prose, and a first visit does not write rows. Editing or saving a profile does not run a model or publish content.

## Editing

1. Choose **Daily**, **Weekly**, **Monthly** or **Seasonal**, then use the **Voice**, **Structure**, **Sources** and **Prompt** tabs to edit one section at a time. Instructions are plain text. Prompt variable buttons insert at the cursor without changing surrounding text. The prompt must include `{{period}}`, `{{voiceGuidance}}`, `{{structure}}` and `{{sourceGuidance}}`. Unknown variables are rejected. Variables expand once; they cannot be nested inside the guidance fields.
2. Each field supports **32,000 characters**, with a visible counter. Pasting longer text keeps the complete value in the editor and explains how far over the limit it is; saving is blocked until it fits. The editor never silently cuts off a paste or a variable insertion. Open **Preview** to see the assembled editorial instructions. The governed run supplies facts, source evidence, argument approval and the response schema separately.
3. Use the persistent **Save writing profile** action. The save bar shows whether changes are unsaved; saving instructions does not generate or publish readings. A saved profile has its own revision, updated timestamp and SHA-256 digest. Unsaved edits survive period changes and navigation to another Studio section during the session. Leaving or refreshing the browser with unsaved edits triggers its unsaved-work warning.
4. If another editor saved first, reload the stored version for comparison. Expand the fields you want to compare, or choose **Keep my edits** to dismiss the comparison. Your edits remain until you choose **Replace my edits with saved version**.
5. **Export saved profile** downloads the exact saved configuration and its receipt. Save local changes before exporting.

The export is a reproducible configuration snapshot. Its hash detects edits after export; it does not certify owner approval or prove the profile is still the newest stored revision. Export again after changing a profile when the next run should use the new version. Previous revisions are not yet available as a browsable history.

## Writer integration

Writer v11 sends the horoscope editorial authority and shared factual/source
boundaries as its system instructions. It does not also send the generic Sky
article spine, sentence-length quotas, negation-pivot cap or mandatory imperative
sequence. Those instructions competed with the saved horoscope profiles even
when the correct profile revision reached the writer.

Monthly requests include each complete primary essay once. Evidence roles and
the relevant-passage list reference that exact unit, preserving provenance and
use restrictions; supporting passages remain intact. The Monthly starter no
longer sets a 450–700 word target. Length follows the developed interpretation
and the complete owner examples. These changes address request construction,
not an automatic claim of prose quality or approval.

The existing writing harness accepts the export:

```sh
node scripts/run-astro-writing-harness.mjs \
  --request /path/to/governed-request.json \
  --writing-profile /path/to/weekly-horoscope-writing-profile.json \
  --out /path/to/candidate.json
```

Alternatively provide the export as `writingProfile` in the request, but not both. The harness validates it before the pipeline starts. `generateDraft` includes its expanded instructions in the actual writer input and attaches `studioWritingProfile: {id, period, revision, updatedAt, sha256}` to the unapproved candidate. The full prompt is not copied into reader fields. The existing explicit live-call authorization, target/register checks, evidence requirements and owner argument gate remain in force.

The reader and edition editor are documented in [Horoscope editions](horoscope-editions.md). This profile integration does **not** itself generate horoscope prose, schedule writing, or automatically supply unrelated Sky and Calendar generation. The dedicated horoscope mapping in `horoscopeWriting.mjs` supplies the signed period facts, complete owner forecast examples, governed meanings and approved plan to the canonical pipeline. Exporting a profile or edition brief is not a successful generation run.

## Storage and verification

Seasonal writer v9 supplies signed Swiss event-time relational context alongside
the dated developments: major aspects within 3 degrees, applying or separating
state, traditional season/lunation rulers and simultaneous T-squares. Each
participant has its own whole-sign house, or no personal house in the shared
overview. These are selected snapshots, not full-season duration. Historical
recurrences and previous cycle dates remain unavailable and cannot be inferred.
Saved profiles ask for developed connections and consequences rather than lists
of placement topics. Complete owner sources remain intact; prose quality remains
an owner decision.

The explicit no-em-dash requirement blocks accepted horoscope headlines and bodies,
including quotations and encoded HTML forms, across every horoscope period.
Provider output violating it is retained only in the private failure receipt.
**Edit punctuation** opens that response as unsaved text for correction and save
without another paid request. No automatic replacement, retry, regeneration or
publication occurs. Existing stored copy is not rewritten. Unchanged legacy
draft fields remain editable individually; every passage must comply before
publication.

`scripts/test-horoscope-depth.mts` covers the actual handlers and direct Swiss
calculations. Recovery browser coverage includes correction, save, reload,
preserved other readings and unchanged provider call count. Preparing a writing
plan automatically saves the latest profile onto an idle draft edition, without
changing its facts, readings or historical receipts. Rejection/reset still
preserves the exact former writing before preparing replacements.

The authenticated `generated-content?writingProfiles=true` API reads all four profiles and accepts one POST save with `{profile, expectedUpdatedAt}`. Missing periods return unsaved defaults. Profiles use reserved `studio-writing-profile/horoscope/{period}` keys in `generated_interpretations`, with `mode=article`, null target date, `status=DRAFT`, `lane=reference`, and empty reader body/summary. Generic content editing, deletion and publication reject those keys. The existing unique target index prevents concurrent first saves; later saves compare the opened `updated_at` in the database PATCH.

The actual-handler regression is `scripts/test-horoscope-writing-profiles.mts`, included in `test:content-studio-api`. Browser coverage is `npx playwright test --config playwright.horoscope-writing.config.ts`: mobile/desktop, light/dark and green/neutral palettes, starter/saved/empty states, keyboard navigation, cursor insertion, prompt copy and validation, export, recovery, conflict comparison/dismissal, exact text preservation and heading typography parity. Tests use synthetic text and isolated storage; the injected writer makes no billed calls.

Set `STUDIO_PRODUCTION_ENTRY=1` to build and test the actual web entry at `/admin/content`. To verify deployed frontend assets with isolated test storage, also set `PLAYWRIGHT_BASE_URL` to the deployment URL. Production API/storage hydration is a separate authenticated read-only check.

The starter voice guidance includes emotional development: use related details to
show why a supported possibility matters, instead of turning every passage into
activities, administrative tasks or a repeated compromise plot. This remains
editable guidance, not a machine taste test or a template story. Updating a
starter in code preserves saved profiles; an authorized profile update uses the
version-checked API and retains any existing owner edits. Memory Graph decisions
explain the architecture but do not replace these live writing instructions.

## Monthly and seasonal scope

Monthly has its own profile and produces one shared calendar-month overview for
all signs. A new Seasonal edition uses its seasonal profile for a shared
introduction plus twelve sign readings; the introduction excludes personal houses
and receives the full zodiac-season and learning-axis sources. Existing saved
profiles are preserved. Publishing a monthly edition makes the exact same body
available in Horoscopes and Calendar Month. Saving a profile alone does not
rewrite or regenerate either surface.

## Automatic instruction updates

Owner direction in [the horoscope task](thread:01a0ce6e-69e0-7100-bdba-ad413d5c7804)
removes the manual latest-instructions step. Opening an unfinished edition,
reviewing a plan, and preparing replacements adopt the latest saved profile for
that period through the authenticated writing handler. The response returns the
confirmed row version together with its plan, so the next action uses that version.

Generation checks the current saved profile again. If it changed after plan
review, the old approval cannot start a paid request; Studio reloads the plan for
ordinary generation approval. Active requests and polling keep their original
profile and request identity. Saved bodies, per-reading receipts, rejection history,
and published editions are not rewritten by a profile change. Storage failures
stop preparation instead of silently generating with stale instructions.

`test-horoscope-latest-instructions.mts` covers all four periods with the actual
handler and isolated storage/provider fixtures. Monthly browser coverage verifies
automatic adoption after reopening, confirmed-version generation and reload on
desktop/mobile in both themes. These checks incur no model charges.
