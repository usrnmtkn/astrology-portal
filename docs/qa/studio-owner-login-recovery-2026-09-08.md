# Content Studio owner sign-in recovery — 2026-09-08

The reported production screen combined an authenticated storage timeout (HTTP 504) with an owner sign-in prompt. The owner sign-in link also opened the reader app without a return destination, leaving an already signed-in owner on You.

## Changes

- Keep database/network failures in the connection-error state. Only an actual access denial shows the access-denied state.
- Keep the attempted owner session or emergency credential in memory so Retry uses that same credential after a storage timeout.
- Do not retry a saved emergency key merely because an owner-session request encountered a storage error.
- Return owner sign-in to the exact Studio path and hash, including the selected filters. Restrict return destinations to same-origin Content Studio paths, and preserve that destination through the configured authentication callback.
- Exclude authentication links from the Studio rule that opens reader previews in a new tab.
- Leave server-side owner authorization unchanged. The return destination does not grant access.
- Load the sign-in form only when access is needed, with visible loading feedback. Keep shared return-path code in the existing authentication chunk to avoid an extra preload dependency across reader routes.

## Verification

- Admin authentication and safe-return unit checks passed.
- Content Studio link-routing and editor-usability checks passed.
- TypeScript and CSS/token audits passed.
- Performance contracts and unchanged reader/Studio bundle budgets passed.
- Reviewed mobile and desktop sign-in screenshots from the Linux CI build, including the current Studio navigation. Updated only those three expected images for the shorter sign-in instructions and finished form. Screenshot checks now wait for the sign-in action; pixel tolerances and load-time budgets remain unchanged.
- A fresh production build with synthetic authentication passed all three browser regressions: owner-session timeout/Retry, emergency-code timeout/Retry, and owner sign-in returning to the selected Studio page. The suite lives outside the general visual-test directory because it requires its dedicated synthetic-authentication build configuration; CI runs that configuration explicitly.

## Separate database incident

Production returned `Content storage did not respond within 8 seconds.` after server-side authorization. Supabase's own SQL connection and query-performance report also timed out. Its database dashboard reported unhealthy status, repeated statement timeouts, and elevated CPU usage. This is a separate availability problem; the UI changes do not claim to repair an unresponsive database.

The owner explicitly approved Supabase's Fast database reboot during this task. The reboot was performed, but subsequent simple connection checks still timed out and the dashboard remained unhealthy. A Nano-to-Micro compute upgrade with the required 8 GB disk minimum was prepared separately; Supabase's review showed no price increase. It has not been applied without separate owner approval. Recovery and production-release verification are recorded after they complete.

## Signed-out production follow-up

PR #699 deployed successfully at merge commit `16c5cf363d716477fcf5d879d2fb0db84d5e43fb`. Checking its owner link in the production browser exposed an additional case: without a usable session, saved Sky navigation could override the login request. A cached reader profile could also hide the sign-in form.

A valid pending Studio return now opens the login surface regardless of saved navigation. It shows the sign-in form instead of the cached profile, without deleting that profile. Successful authentication still returns to the exact Studio destination and leaves server-side authorization unchanged.

Two new browser regressions failed before this correction, reproducing saved Sky navigation with and without a cached profile. Both now pass through email/password sign-in using synthetic credentials and return to the selected Studio page. All five recovery tests passed against a fresh build (28.8 seconds); TypeScript, authentication unit checks, and CSS/token audits passed. The production database availability incident remains separate.
