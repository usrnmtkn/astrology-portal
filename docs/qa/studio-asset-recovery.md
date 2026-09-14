# Content Studio stale component recovery

Observed 2026-09-14 UTC in the owner's actual production tab. A tab retained an
older dashboard chunk after deployment. Its page recovery screen showed
`TypeError: Cannot read properties of undefined (reading 'default')`. The explicit
Reload page action restored the real Sky Write-ups page and Sun-in-Virgo source.
No content writes or storage clearing were needed.

The existing Vite preload-error listener prevented the import rejection even
when it did not reload the page. Vite consequently resolved an unsuccessful
import as undefined. React.lazy retained the failed result, and Retry page only
remounted the same loader. A browser regression against unchanged production
confirmed that Retry never issued a new document request.

The listener now suppresses the import failure only when a guarded reader reload
actually starts. Studio retains the real asset error. Its explicit Retry page or
Open Review Queue action loads current HTML after an asset failure, while normal
render failures keep the existing remount behavior. Automatic reload remains
excluded from authoring and report paths.

Verification includes fresh production-entry Studio recovery tests using the
saved inventory, fault injection for missing real JavaScript chunks, both
recovery actions, auth preservation, render-error recovery across mobile/desktop
and both themes, and the reader startup reload guard. A Sky article test now
recovers a failed component before inserting variables and completing repeated
save/reopen/publish through the actual API handler with isolated storage.

The existing malformed-status browser assertion expected an obsolete label and
failed identically on unchanged production. It now checks the current saved
editorial label plus the explicit unverified-serving-status tooltip, proving that
the malformed API status was rejected. No status presentation code was changed.

The PR records exact local/CI checks and deployment identity. Reader prose,
source rows, resolver artifacts, API behavior, and database schema are unchanged.
