# Sky article draft save and published-revision recovery

Verified on 2026-09-14 UTC. Release commit, CI result, and deployment are recorded
on the fix PR. The owner authorized merging and deploying the fix in the ongoing
Content Studio task. Production inspection read metadata only; all write tests
use isolated storage and synthetic copy.

## Reproduction

A LIVE Sky source has `owner_approved` and `serving_enabled` set to true. The
editor clones that record into its proposal. Saving forks a DRAFT revision and
sets the revision record's flags to false, but previously retained true flags in
its saved proposal. Reusing that returned proposal on the next save produced:

> Package proposals cannot change read-only fields: owner_approved, serving_enabled.

An actual-handler regression reproduced this 400 before the fix. The Sun in
Virgo production metadata also showed an archived published revision with false
record flags and true proposal flags. A latest-first content-key lookup returned
that archived revision before its LIVE target.

## Behavior

Save validation admits unchanged legacy flag values only when they match the
already-saved proposal. New flag changes remain rejected. After validation, the
server synchronizes proposal flags with the revision record, including edit
history. Drafts remain non-serving until the explicit owner publish action.

Sky source hydration follows a completed revision to its current target, and
the composition map excludes published revision history from active sources.
An old tab can still save its unsaved changes: the API applies only copy changes
relative to its saved proposal onto the current LIVE source, retaining current
metadata and disjoint changes. Conflicting passage edits return 409. The new
revision records the current target version; publication still checks both row
versions and existing phrase/hash/review requirements.

## Verification

- Full `npm run test:content-studio-api`, including real-handler repeated saves,
  reopened proposals, legacy flags, archived-tab recovery, direct flag tampering,
  competing-copy rejection, and explicit publication.
- Existing actual reader loader and installed renderer tests still check phrase
  resolution, missing values, motion variants, source scope, and stale hashes.
- Fresh `playwright.sky-article.config.ts`: eight insertion/preview cases plus
  four actual-handler Sun-in-Virgo cases at mobile/light and desktop/dark sizes.
  The four save cases start from either mismatched DRAFT flags or a newer
  ARCHIVED revision, insert a phrase, save twice, reload, publish, reload, and
  edit/publish again. The LIVE fixture is byte-identical while drafting.
- Admin and web builds, API TypeScript check, CSS/token/Studio architecture audit,
  admin bundle budget, and staged/tracked/public-build privacy scans.

No approved source prose, package resolver, generated content, database schema,
or production content rows are changed by this release.
