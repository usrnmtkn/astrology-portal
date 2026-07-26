# Supabase Schema

Migrations for TLDR astro's Supabase database live here.

## Profile Persistence

`migrations/20260603190000_harden_profiles_and_invites.sql` adds the base `user_profiles` table used by the web app for remote profile/preferences persistence, with user-scoped row level security.

## Manual Charts + Social Invites

`migrations/20260603010000_manual_charts_social_invites.sql` adds:

- `manual_charts`: birth details and cached natal chart data manually entered for another person.
- `connections`: relationship records between a user and either another account or a manual chart.
- `invites`: email, SMS, and social-link invites that can convert a manual chart into a real account connection.
- `accept_invite(invite_token)`: an authenticated RPC for accepting an invite after signup/sign-in.

`migrations/20260603190000_harden_profiles_and_invites.sql` also hardens invite ownership checks and invite acceptance so linked manual charts/connections must belong to the inviter and cannot be claimed twice.

Intended flow:

1. User manually adds someone's natal chart.
2. App creates a `manual_charts` row and a `connections` row.
3. User sends an invite, creating an `invites` row linked to that chart/connection.
4. Invitee creates or signs into their account and calls `accept_invite(token)`.
5. Supabase marks the invite accepted, links the manual chart to the invitee, and creates the reciprocal connection.

## Social Handles + Account Friends

`migrations/20260725190000_social_handles_friendships.sql` adds the first
handle-based account friendship flow:

- `social_profiles`: unique handles, display identity, and a friend-safe derived
  natal chart projection. Raw birth inputs remain in owner-only
  `user_profiles`.
- `social_friend_requests`: pending, accepted, declined, and cancelled requests.
- `social_friendships`: one canonical mutual row per accepted account pair.
- Exact-handle lookup, request, response, list, and remove RPCs.

`migrations/20260725215000_social_default_handles.sql` adds
`ensure_own_social_profile`, which assigns a default handle from the member's
display name and retries with numeric suffixes when another member already owns
that handle. Existing member-chosen handles are preserved.

`migrations/20260725220000_reserve_admin_handle.sql` reserves `@tldrastro` for
an account with `app_metadata.role = admin`. A database trigger rejects the
handle for every other account, including direct table writes.

`migrations/20260725234500_social_blocks_audit.sql` adds the launch safety
boundary:

- Blocking immediately removes an existing friendship, cancels pending
  requests, and hides both accounts from one another.
- Every discovery, request, acceptance, and shared-chart read re-checks the
  block boundary.
- Privacy-safe audit events record social state changes without storing birth,
  chart, email, or phone data.
- `apps/web/supabase/tests/social_friend_authorization.sql` is a rollback-only
  two-account authorization regression test.

Apply this migration before enabling the Social friends UI. The client shows a
safe unavailable state while the schema is not present.

Intended flow:

1. Each signed-in member receives a unique default handle and may change it in Account.
2. One member looks up the other's exact handle and selects `Add as friend`.
3. The recipient accepts the request in the Requests card.
4. Both members can open each other's account-owned chart from Friends.
5. Only the redacted derived natal chart is shared; email, phone, exact birth
   date, time, and location are not returned.
6. Either member can remove the friendship or block the other to revoke chart
   access immediately.

The Account page also provides a JSON data export and a permanent deletion
flow. Production deletion requires `SUPABASE_SERVICE_ROLE_KEY` on the server;
the browser sends its access token to `/api/account`, and the server verifies
that token before deleting exactly that authenticated user.

Apply with Supabase CLI:

```sh
supabase db push
```

Or paste the migration SQL into the Supabase SQL editor.

## Generated Interpretations

`migrations/20260604183000_generated_interpretations.sql` adds `generated_interpretations`, the review queue for server-rendered OpenAI content.

The browser should not write to this table directly. The Vercel API routes use:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` optional, defaults to `gpt-4.1-mini`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CONTENT_GENERATION_SECRET`
- `CRON_SECRET`

Suggested flow:

1. Apply the migration.
2. Add the environment variables in Vercel.
3. Call `POST /api/generate-content` for manual drafts.
4. Let Vercel Cron call `GET /api/cron/generate-sky` daily.
5. Review rows in `generated_interpretations` before changing `status` to `LIVE`.

Review workflow:

- Generated rows are created as `DRAFT`.
- Human review can happen in the internal dashboard at `/admin/content` or `/admin/generated-content`.
- Paste `CONTENT_GENERATION_SECRET` into the dashboard session gate, then use filters to review drafts by surface/status.
- Use `Generate` to create a new OpenAI draft from the visible facts/source JSON.
- Use `Save` for edits, `Reviewed` for editorial pass, `Publish Live` when the public app should display it, and `Archive` or `Delete` when a row should not be used.
- Use `GET /api/admin/generated-content?status=DRAFT&surface=sky` with `Authorization: Bearer CONTENT_GENERATION_SECRET` to list review candidates.
- Use `POST`, `PATCH`, and `DELETE /api/admin/generated-content` with the same authorization to create, edit, or remove rows programmatically.
- Mark a row `REVIEWED` after editorial review.
- Mark a row `LIVE` only when it is approved for regular users.
- Browser reads are limited by RLS to `status = 'LIVE'`, so drafts and reviewed-but-unpublished rows remain hidden.

The app reads `LIVE` Sky content first, keyed by `content_key`, then falls back to the local knowledge bundle if no approved generated row exists.
