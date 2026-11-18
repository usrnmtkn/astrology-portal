# Explicit reusable Moon reading recovery

Archiving a dated Moon horoscope set retires its publication key. That retirement
continues to suppress older dated writing and reusable readings. An owner can now
choose **Use reusable Moon readings** under the archived set's **More actions**.
The confirmation explains that the dated writing remains archived.

The existing authenticated recovery endpoint verifies the calculated event,
installed approved source package, archived source version, dated publication
revision and all twelve independent reusable publication revisions. The new
service-role-only SQL function atomically installs a new live baseline pointer
with no source row. It records an idempotent metadata receipt and never updates,
copies or deletes the archived writing. Unrelated and permanent retirements stay
effective. A lost response persists an operation identity: after reload the owner
can check its result or cancel an unconfirmed operation without replaying it.

## Isolated verification

- Actual owner handler and PGlite migrations: authorization, source/package and
  publication CAS, complete archived-row equality, idempotency, receipts,
  cancellation, stale cached/date rejection and independent retirement guards.
- Six fresh Web browser cases: mobile/desktop, light/dark, explicit confirmation,
  cancellation, lost response and reload. Each compares the complete restored
  general article and three independently available reusable passages with the
  baseline in memory, including a second reload. The other nine synthetic
  reusable identities remain retired. No production account or content is used.
  Two additional lost-response cases remove the synthetic archived source before
  checking or stopping recovery: pending navigation clears, no write replays, and
  the unavailable source is never reported restored. Transient status-read errors
  retain the pending operation until a successful status check.
- Eight existing manual Moon editor cases, four synthetic AI editor cases and
  four existing approved-source recovery cases pass. The latter initially failed
  because the shared fixture applied its recovery migration twice; removing the
  duplicate fixture setup restored all four cases.
- Admin/server types, CSS/token audits, reader-copy boundary, existing dated Moon
  API and generic approved-source API regressions pass.

The initial browser launch was blocked from binding its local preview port and
was rerun with the required local-server permission. An earlier init script
attempted localStorage access on about:blank; it now initializes only HTTP(S)
documents. Neither failure is reported as a product pass.

Screenshot review also found that the recovery confirmation could leave
navigation locked after the pending recovery control disappeared. The Moon
editor now observes the session operation independently. Regressions assert that
navigation becomes available after confirmation while the archived heading/body
controls remain disabled and the complete source/version remains unchanged.
An intermediate eager hook exceeded the raw startup ceiling and was discarded;
the observer stays in the lazy Moon editor. A concurrent local knowledge rebuild
interrupted one Web build prerequisite; the sequential rerun is the evidence.

Matched independent locked-dependency attribution builds use ARM64 Node22.20.0,
zlib1.3.1-470d3a2 and standard CI public Supabase placeholders. After complete
ordinary prerequisites, only top-level generatedAt metadata was normalized;
complete recursive knowledge artifact bytes then matched. Unchanged build bodies
measure main/candidate Admin entry raw 840825/841174, entry gzip244299/244450 and
total gzip921945/922472 bytes. Web total gzip is3759759/3760557. Allocate only
+151 Admin entry gzip, +527 Admin total gzip and +798 Web total gzip, replacing
the earlier provisional allocations and retaining existing headroom and all
other guards. Earlier strict failures remain recorded. Attribution builds are
not release acceptance: ordinary unmodified knowledge prerequisites/builds and
all final-head hosted guards must pass independently. This records feature cost,
not a performance improvement.

The corrected candidate also passes ordinary unmodified Admin and Web builds
and both bundle guards independently of the attribution run. A full privacy scan
initially stopped because archive inspection was unavailable; its subsequent
quiet rerun passed all11883 files. The initial scan is not counted as a pass.

Hosted API CI exposed a pre-existing test assumption: the Astro 101 migration
drift test selected the final entry in the shared migration list. Adding Moon
recovery made it replay the Moon function instead. The test now selects its
named Astro 101 migration and only earlier prerequisites. Its actual handler/SQL
lifecycle regression passes; the production migrations were not relaxed. The
failed hosted run remains failure evidence until the corrected head passes.

Full unfiltered API and content suites passed on1554d41 (896.303s/407.052s
inner), with normal prerequisites, stable source/dependencies/runtime and cleanup.
The subsequent hosted Sky Moon reader failure exposed an invalid browser ledger
fixture: missing API ETag/scoped routing and false successful-empty anonymous
ledger responses despite stored publications. The fixture now serves canonical
API schemas/ETags and actual stored rows under the anonymous range protocol.
All four mobile/desktop light/dark cases pass with the original publication and
retirement assertions intact, verified cached retirement, and real503 outage
responses that cannot resurrect the reading. No production reader code changed.
An API-only fixture correction still failed while anonymous reads falsely
returned empty success; that intermediate failure is retained. A temporary
requirement to refetch all keys after learning retirement was removed because
cached retirement can correctly stop those fetches first. Normal hydration's
retired-source key request was observed in the bounded diagnostic control.
The required final-head API/hosted gates remain mandatory after this correction.

## Accepted-main integration

The 283b266 candidate passed fresh full API/content and all 66 hosted checks
(four conditional skips), but the final-main guard found that main had advanced
to 183083036. No DDL, merge or content write occurred. The rebase retains both
the new main's Memory Graph tests and the Moon recovery suite. On that base,
12 standalone Moon cases and 26 Web recovery/publication cases pass, along with
types, CSS, reader-copy boundary and focused actual handler/SQL regressions.

Matched attribution against 183083036 uses the same runtime, locked dependencies,
CI placeholders and validated metadata-only knowledge normalization described
above. Control/candidate Admin raw entry is 840746/841095, entry gzip 244282/244418
and total gzip 921532/921942. Web total gzip is 3758253/3759038. Replace the earlier
allowances with only +136 Admin entry gzip, +410 Admin total gzip and +785 Web
total gzip. This preserves current control headroom and counts none of the
Memory Graph release cost again. Other prior allowance history and every other
guard remain unchanged. Ordinary unmodified builds/guards and all required
post-integration exact-head gates remain separate release requirements.

Review regressions preserve PostgreSQL microseconds for preview, returned source
versions, status and replay. A same-millisecond/different-microsecond source is
changed, never restored. A validated completed receipt with a missing source also
returns changed; transient storage failures remain unconfirmed. Existing changed
status copy no longer assumes a newer source still exists. SQL evidence covers
sequential stale-CAS, rollback and idempotency; multi-session concurrency is not
claimed. Retained production metadata does not classify the three missing
passages as installed baselines versus exact LIVE independent Studio rows. The
complete original-baseline RAM comparison remains the native acceptance gate.

Full required exact-head API/content gates, hosted CI, schema rollout and actual
signed-in production recovery remain pending. This document does not claim that
the missing production readings have been restored or the every-editor audit is
complete. No original writing or production content was changed by these tests.

## Release order

After the required final-head gates and migration review, install the new SQL
function with its service-role-only grant before releasing the endpoint/UI.
Verify the canonical deployment revision before native acceptance. Production
recovery is a separate explicit owner action against the already archived QA set,
inside a stable release slot with a fresh before/after preservation pair for the
51 originals. Compare the complete restored public passages and general article
to the retained pre-test baseline in memory. Do not reset that baseline, restore
the dated QA set to LIVE, or relax other retirements to obtain a passing result.

## Live preview follow-up

On the canonical #1447 deployment, the isolated signed-in archived editor showed
no reusable recovery action. No restoration was attempted. The exact owned source
metadata and aggregate independent publication counts matched the expected
archived set; the native preview HTTP response remained unobserved. Scoped
runtime logs/errors provided no matching diagnostic, so they establish no cause.

The recovery component swallowed preview failures. Moon preview failures now
show the server's safe message and offer a read-only retry; no recovery write is
offered until a valid plan arrives. The shared generic unsupported-source behavior
stays unchanged. All six Moon browser variants exercise an initial preview outage,
visible error, retry without a write, then the complete recovery/reader lifecycle.

The new calculated-event dependency also lacked an explicit Vercel function rule.
The accepted catch-all contains no installed Swiss WASM asset. Add those assets
and the normal 60-second calculated-event duration explicitly. The actual handler
suite verifies the deployment glob covers every installed ephemeris asset and the
recovery/calculation/baseline modules. This closes a concrete configuration gap;
automatic tracing and the original production HTTP cause remain unverified.
No production content, retired independent sources or protected originals were
changed during this investigation. Native restoration still requires its normal
preview, a fresh preservation check, explicit confirmation and exact reader
comparison after reload.

## Native function import correction

On combined main 83c77bcf, the isolated recovery preview still returned an unreadable
response. An unauthenticated GET confirmed HTTP 500 / text/plain /
FUNCTION_INVOCATION_FAILED, while generated-content and lunation-writing reached
their normal 401 JSON authentication boundary. The connector's log search and
trace lookup yielded no diagnostic. The existing authenticated Vercel CLI with an
exact requestPath filter did: four recovery startup errors reported
ERR_MODULE_NOT_FOUND for `/var/task/src/shared/lunationHoroscopeIdentity`.

The newly server-imported shared identities module used an extensionless relative
import that the browser and TSX test loader resolved. Native emitted ESM did not.
Use its `.js` specifier, preserving all identity and calculation logic. The API
regression now emits the actual two shared TypeScript modules into an isolated
module package and imports them in a native Node child without TSX, NODE_OPTIONS
or inherited private environment. The unchanged production source fails that
reproduction; the corrected source imports and returns all twelve identities.
A deployed preview must reach ordinary authentication as JSON before production
promotion. Actual owner recovery, reload comparison and original51 preservation
remain separate native acceptance requirements.
