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
