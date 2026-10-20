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

## Preserve unsaved drafts during optional downloads

Optional Studio panels use `studioLazy` so a rejected module download renders a
local error below the component that owns the draft. The message asks the editor
to save before reloading. A failed formatting editor also offers Back to plain
text, retaining the complete value for editing and saving. Retrying the same
cached JavaScript import is not presented as a working recovery action.

The authoring boundary records the exact Vite error without replacing the page
from the preload event alone. Locally caught action imports, including save
conflict reconciliation, keep their existing error and unsaved state. If an
initial React.lazy import rejects into the page boundary, its recorded error
still makes explicit Retry fetch current HTML. Ordinary render failures retain
remount recovery, and the reader reload policy is unchanged.

If access expires before the sign-in panel has ever loaded, that optional panel
also recovers locally. Its failure keeps the dashboard-owned draft in memory,
hides the editor while access is denied, and offers sign-in in another tab.
A renewed authorized session restores the complete draft without a page reload;
only an explicit subsequent save writes it.

`tests/visual/content-studio-recovery.spec.ts` verifies the real missing-module
responses, a successful-download control, full saved and new unsaved passages,
actual-handler saves and version conflicts, delayed failures after navigation,
and emergency-key rotation with a declined discard prompt. Rotation does not
authorize discarding the retained dirty edition. The existing clean-edition
credential regression separately verifies a fresh authorized read.

Run the suite from fresh builds with `playwright.studio-recovery.config.ts`,
using `STUDIO_PRODUCTION_ENTRY=1` for the web entry and `0` for standalone Admin.
Both width/theme pairs cover failed panels, formatting, and render recovery.
The standalone root path retains the shared shell's one guarded startup retry;
the explicit `/admin/content` path requires manual startup recovery. No form
has mounted before that entry-script failure. API writes in these tests use
isolated synthetic storage; they do not establish production publication proof.

The measured standalone feature cost and unchanged remaining performance limits
are recorded in `scripts/admin-bundle-budgets.json`. The PR records final
commit-specific test and deployment results.
