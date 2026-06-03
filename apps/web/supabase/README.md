# Supabase Schema

Migrations for TLDR astro's Supabase database live here.

## Manual Charts + Social Invites

`migrations/20260603010000_manual_charts_social_invites.sql` adds:

- `manual_charts`: birth details and cached natal chart data manually entered for another person.
- `connections`: relationship records between a user and either another account or a manual chart.
- `invites`: email, SMS, and social-link invites that can convert a manual chart into a real account connection.
- `accept_invite(invite_token)`: an authenticated RPC for accepting an invite after signup/sign-in.

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
