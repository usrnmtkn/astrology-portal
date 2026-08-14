# Email confirmation and friend-invite handoff QA

## Objective

An email signup that requires confirmation must not enter the authenticated app until Supabase establishes a verified session. If signup began from a friend-invite link, the chart form and invitation must survive the confirmation tab and resume after sign-in.

## Root-cause regression

1. Open a valid `/i/{code}` invitation while signed out.
2. Complete the profile form with email and password.
3. Return a successful Supabase signup response containing a user but no session.
4. Verify that the app renders `Confirm your email` instead of the `You` profile.
5. Verify that no social profile, handle, invitation claim, or friendship request is attempted.
6. Verify that the pending profile form remains available for post-confirmation hydration.

## Confirmation handoff

1. Confirm that an invite token is initially stored in session storage only.
2. Trigger the email-confirmation-required result.
3. Verify that the app creates a 24-hour cross-tab handoff for that invite.
4. Open the confirmation redirect in a new tab with a verified session.
5. Verify that the pending form hydrates the authenticated profile.
6. Verify that the invite preview appears and names the inviter.
7. Accept the invitation and verify that the handoff token is cleared.
8. Verify that the resulting friendship appears in both members' Circle views.

## Alternate paths

1. Email signup with an immediately established session proceeds directly to the authenticated profile.
2. Existing-member email login remains unchanged.
3. Google and verified phone signup remain unchanged.
4. Email signup without an invite shows confirmation copy without mentioning a friend invitation.
5. An expired 24-hour handoff is discarded and cannot be claimed.
6. `Use a different email` returns to the populated form without clearing the pending chart details.

## Existing pending-account recovery

1. Attempt to log in with a valid account whose email is not yet confirmed.
2. Verify that the Supabase `email_not_confirmed` response opens the confirmation screen.
3. Select `Resend confirmation email` and verify that exactly one signup-confirmation request is made.
4. Verify that the resend uses the configured live-app redirect.
5. Verify that a successful request shows `A new confirmation email was sent.` and disables duplicate submission.
6. Confirm the email, reopen the original invitation link, and accept the invitation.

## Automated gates

1. Run the social Friends/auth contract.
2. Run phone-auth regression coverage.
3. Run TypeScript type checking.
4. Build the knowledge package and web app.
5. Run the focused client authentication browser flow at desktop and mobile widths.
6. Run the Friends database/loading contract suite.

## Production verification

1. Confirm the merge commit is present on `origin/main`.
2. Confirm Vercel reports the `main` deployment as ready.
3. Repeat the unconfirmed-email case on production with a disposable account.
4. Confirm the user cannot reach `You` until confirmation and that the invitation resumes afterward.
