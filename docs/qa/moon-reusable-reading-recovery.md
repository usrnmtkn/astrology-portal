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
- Four fresh Web browser cases: mobile/desktop, light/dark, explicit confirmation,
  cancellation, lost response and reload. Each compares the complete restored
  general article and three independently available reusable passages with the
  baseline in memory, including a second reload. The other nine synthetic
  reusable identities remain retired. No production account or content is used.
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

Matched independent locked-dependency builds use ARM64 Node22.20.0,
zlib1.3.1-470d3a2, identical normalized complete knowledge and standard CI public
Supabase placeholders. Main/candidate Admin entry raw is 840825/841172, entry
gzip 244299/244415 and total gzip 921945/922450 bytes. Web total gzip is
3759778/3760482. Allocate only +116 Admin entry gzip, +505 Admin total gzip and
+704 Web total gzip, retaining existing headroom and all other guards. Earlier
strict failures remain recorded. Both final bundle guards pass locally. This is
measured feature cost, not a performance improvement or hosted acceptance.

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
