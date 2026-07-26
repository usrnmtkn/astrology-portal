# Friend Connections Implementation Plan

**Status:** Draft
**Last updated:** 2026-07-25
**Product requirements:** [friend-connections-prd.md](./friend-connections-prd.md)

## 1. Recommended delivery shape

Build this as a vertical social foundation, then layer feed behavior later:

1. Friend-safe profiles and handles.
2. Canonical friendship and secure invitation storage.
3. Email invitation path end to end.
4. Connected Friends UI and profile reads.
5. SMS/phone authentication and invitation delivery.
6. Safety hardening, beta, and Circle follow-up.

Email should be the first complete channel because the app already supports verified email authentication. SMS requires both a delivery provider and a verified phone OTP authentication path; shipping SMS links without identity matching would make forwarded-link account claims unsafe.

Indicative duration for one full-stack engineer with design and QA support: **5–7 weeks** for email + SMS MVP, or **3–4 weeks** for an email-only dogfood release. Provider approval, SMS registration, privacy review, and deliverability work can extend calendar time.

## 2. Architecture decisions

### Use a canonical friendship edge

Do not extend the current reciprocal-row `connections` behavior for real accounts. Add `friendships` with a canonical pair:

```sql
user_low_id = least(current_user_id, other_user_id)
user_high_id = greatest(current_user_id, other_user_id)
unique (user_low_id, user_high_id)
```

This makes acceptance, removal, blocking, and authorization deterministic. Keep `connections` temporarily for existing manual-chart records, then migrate or replace those records in a later cleanup.

### Separate private persistence from friend-readable profiles

Keep `user_profiles.data` owner-only. Add a typed `member_profiles` table containing only identity fields and a friend-safe derived astrology projection. Exact birth inputs remain in private profile storage.

### Put sensitive contact matching behind the server

The browser submits a contact value to a protected API route. The server:

- Normalizes it.
- Computes an HMAC using a server-only secret.
- Matches it against verified contact identities.
- Creates the invitation.
- Sends the delivery message.

The client must never query `auth.users` or a contact-identity table.

### Hash invitation tokens at rest

Generate at least 32 random bytes. Deliver the URL-safe plaintext token once and store only `SHA-256(token)` or a keyed digest. Preview and acceptance hash the presented token before lookup.

### Require recipient identity match

Targeted invitations are accepted only if the authenticated account has the
same verified email/phone HMAC or is the securely resolved `target_user_id`.
The beta share-link flow is a distinct `link` invitation type: it is a
single-use bearer credential, may be claimed by the first eligible signed-in
recipient, expires after 30 days, and remains subject to self-invite and block
checks.

### Use server routes plus atomic database functions

Use Vercel API routes for:

- Authentication/session verification.
- Contact normalization and matching.
- Provider delivery.
- Rate limiting.
- Redaction and observability.

Use `security definer` Postgres functions for:

- Atomic handle claims when needed.
- Invitation acceptance.
- Friendship removal/block transitions.
- Friend-safe profile authorization.

Every function must set a restricted `search_path`, validate `auth.uid()` or an explicit trusted server identity, and receive adversarial database tests.

## 3. Proposed schema work

Create a new migration after the current latest migration, rather than editing historical files.

### Extensions and enums

- Enable `citext` for case-insensitive handles.
- Prefer constrained text columns over Postgres enums when product statuses may evolve.

### `member_profiles`

```sql
create table public.member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  handle citext not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  profile_visibility text not null default 'friends',
  share_astrology_with_friends boolean not null default true,
  astrology_profile jsonb,
  handle_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add:

- Handle format and length checks.
- Reserved-handle table or deterministic application check plus database enforcement.
- RLS for owner update.
- Friend read policy requiring an accepted canonical friendship and no block.
- Minimal invite-preview access through a narrow server endpoint, not a public select policy.

`astrology_profile` should have a versioned TypeScript schema. Initial projection:

- `version`
- `chartUpdatedAt`
- Big Three
- Derived natal positions, aspects, angles, and houses required by current readers
- Display-safe current location only if the product later chooses to share it

It must not include exact date of birth, time of birth, latitude/longitude, or raw location label.

### `contact_identities`

```sql
create table public.contact_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  contact_hmac text not null,
  verified_at timestamptz not null,
  invite_discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, contact_hmac)
);
```

No authenticated or anonymous select policy. Populate only after the corresponding Supabase auth identity is verified. Add a reconciliation task for email changes, phone changes, account deletion, and identity linking.

### `friend_invitations`

Statuses: `pending`, `sent`, `delivery_failed`, `accepted`, `declined`, `expired`, `revoked`.

Required constraints:

- `inviter_user_id <> target_user_id`.
- Valid channel.
- `expires_at > created_at`.
- One active invitation per inviter/contact/channel.
- Manual chart, if present, belongs to the inviter.
- Terminal statuses have appropriate timestamps.

Fields should include:

- Contact HMAC.
- Optional encrypted destination for retry/support.
- Token digest.
- Provider delivery ID/status.
- Target user ID when securely matched.
- Linked manual chart ID.
- Accepted friendship ID.
- Expiry and terminal timestamps.

Do not reuse the plaintext `invites.invite_token` column for new invitations.

### `friendships`

Accepted friendships only for MVP; pending state lives in invitations.

Constraints:

- Canonical ordering (`user_low_id < user_high_id`).
- Unique pair.
- No self-edge.
- Valid status.

RLS:

- Either member can select their friendship.
- Direct client inserts are disallowed.
- Mutations happen through narrow RPCs or server routes.

### `friend_blocks`

Unique directional pair. Reads may be owner-only; authorization helpers evaluate blocks in either direction. A block transaction:

1. Upserts the block.
2. Revokes pending invitations in both directions.
3. Marks/removes any accepted friendship.
4. Invalidates profile access.

### Audit events

Add `friendship_events` with actor, subject pair, event type, invitation/friendship IDs, and timestamp. Do not store raw contact values or tokens.

## 4. API surface

Names can follow the repository's Vercel function conventions.

### Profiles

- `POST /api/social/profile/handle/check`
- `PUT /api/social/profile`
- `GET /api/social/profiles/:handle`

`GET` returns one of:

- Full friend-safe projection.
- Minimal invite preview projection.
- Private/not-connected response.
- Not found.

Avoid response differences that permit bulk account discovery.

### Invitations

- `POST /api/social/invitations`
- `GET /api/social/invitations`
- `GET /api/social/invitations/preview?token=...`
- `POST /api/social/invitations/accept`
- `POST /api/social/invitations/:id/decline`
- `POST /api/social/invitations/:id/resend`
- `POST /api/social/invitations/:id/revoke`

Create request:

```json
{
  "channel": "email",
  "recipient": "friend@example.com",
  "manualChartId": "optional-uuid"
}
```

Create response:

```json
{
  "status": "queued",
  "invitationId": "uuid"
}
```

Never return `targetUserId`, account-existence state, normalized contact, or token.

### Friendships

- `GET /api/social/friends`
- `DELETE /api/social/friends/:friendshipId`
- `POST /api/social/friends/:friendshipId/block`
- `POST /api/social/profiles/:handle/report`

Use cursor pagination from the start even if the initial UI loads only the first page.

## 5. Client services and types

Add focused modules instead of expanding the already large `App.tsx`:

- `apps/web/src/services/socialProfile.ts`
- `apps/web/src/services/friendInvitations.ts`
- `apps/web/src/services/friendships.ts`
- `apps/web/src/features/friends/AddFriendModal.tsx`
- `apps/web/src/features/friends/FriendRequests.tsx`
- `apps/web/src/features/friends/ConnectedFriendsList.tsx`
- `apps/web/src/features/friends/ConnectedProfile.tsx`
- `apps/web/src/features/invites/InviteLanding.tsx`
- `apps/web/src/features/account/HandleSettings.tsx`

Core TypeScript types:

- `MemberProfileSummary`
- `FriendProfileProjection`
- `Friendship`
- `FriendInvitation`
- `InvitationPreview`
- `InvitationChannel`
- `InvitationStatus`
- `FriendAccessState`

Do not model a connected account as `ManualChart`. Introduce a union for the list:

```ts
type FriendListItem =
  | { kind: "account"; friendship: Friendship; profile: MemberProfileSummary }
  | { kind: "private_chart"; chart: ManualChart };
```

This prevents account-owned data from being accidentally editable through the manual-chart form.

## 6. Routing

Add routes for:

- `/invite/:token` — invitation preview and auth continuation.
- `/friends` — Friends home.
- `/friends/@:handle` — connected profile.

The app currently supports path and hash URL states. During the transition:

- Treat clean paths as canonical for new links.
- Preserve existing `/#friends?...` links.
- Add Vercel SPA rewrites so invitation links survive direct navigation.
- Store the pending invitation in `sessionStorage` using a short-lived opaque continuation ID where possible; do not persist raw tokens in localStorage.
- Set a strict `Referrer-Policy` so invite-token URLs are not leaked to third parties.
- Remove or replace the token in browser history immediately after server validation.

## 7. Authentication changes

### Email dogfood

Reuse:

- Email/password signup.
- Google OAuth only when the verified Google email matches the email invite.

After the auth callback:

1. Rehydrate the secure invite continuation.
2. Confirm the current verified email matches.
3. Require handle completion.
4. Call accept.

### Phone beta

Add Supabase phone OTP:

- `signInWithOtp({ phone })`.
- OTP verification UI.
- E.164 normalization and country-code UX.
- SMS provider and Supabase configuration.
- Recovery and linked-identity behavior for an account that already uses email.

Decide whether email and phone can link to one account before beta. Do not allow one person to accidentally create separate email and phone accounts through different invite channels.

## 8. Delivery providers

Create provider interfaces:

```ts
interface FriendInviteDeliveryProvider {
  send(input: {
    destination: string;
    inviterName: string;
    inviterHandle: string;
    inviteUrl: string;
  }): Promise<{ providerMessageId: string }>;
}
```

Recommended operational requirements:

- Idempotency keys based on invitation ID + send attempt.
- Provider timeouts and bounded retries.
- Webhook verification for delivery/bounce/failure updates.
- Templates that do not include birth or astrology profile data.
- Email unsubscribe/suppression handling appropriate for transactional invitations.
- SMS opt-out language and suppression list.
- Environment separation for test/staging/production.

Provider selection is an owner decision. Keep the code adapter-based so email and SMS vendors can change.

## 9. Phase-by-phase work plan

### Phase 0 — Decisions and threat model (2–3 days)

- Confirm profile visibility defaults.
- Select email and SMS providers.
- Confirm adults-only launch policy.
- Define exact friend-safe chart projection.
- Threat-model account enumeration, forwarded links, replay, self-invites, spam, blocks, and chart privacy.
- Define data retention and support access.
- Write an analytics event dictionary with prohibited PII.

**Exit:** approved PRD decisions, provider accounts in progress, security test cases listed.

### Phase 1 — Handles and profile projection (4–5 days)

- Add schema and RLS for `member_profiles`.
- Add reserved handles and handle-claim RPC.
- Extend profile persistence flow to update the member profile projection.
- Assign a collision-safe default handle from the member's display name, show it read-only on You, and allow editing only in Account.
- Add bounded display-name search for first-name, last-name, and full-name matches; return only minimal social identity and relationship state.
- Add an Account privacy switch that removes a member from discovery while preserving accepted friendships.
- Rate-limit name search and new friend requests per authenticated account.
- Reauthorize every shared-chart read against the canonical friendship row so removing a friend revokes access immediately.
- Add projection builder and versioned validator.
- Add owner and unauthorized-read tests.

**Exit:** every dogfood member can claim a handle; no other member can read the profile without authorized context.

### Phase 2 — Friendship and secure invitations backend (5–7 days)

- Add `contact_identities`, `friend_invitations`, `friendships`, blocks, and events.
- Backfill verified email identities for test/dogfood members.
- Build normalization, HMAC, encryption, token-digest, and redaction helpers.
- Build create/list/preview/accept/decline/revoke/remove/block APIs.
- Build atomic accept and block database functions.
- Add rate limiting and idempotency.
- Add provider adapter and local/test delivery sink.
- Add unit, integration, RLS, replay, concurrency, and enumeration tests.

**Exit:** API tests prove that a matching verified member can accept exactly once and an unrelated token holder cannot.

### Phase 3 — Email flow and Friends UI (5–7 days)

- Add handle gate.
- Add `Add friend` modal.
- Add pending/incoming requests UI.
- Add invite landing and auth continuation.
- Add account friends plus private charts list.
- Add connected profile route.
- Adapt relationship readers to use `FriendProfileProjection`.
- Add remove, block, report, expired, revoked, and delivery-failed states.
- Add accessible keyboard/focus/error behavior.
- Add analytics without PII.

**Exit:** two email-authenticated dogfood accounts can complete the whole flow and view each other's friend-safe profiles.

### Phase 4 — Manual chart reconciliation (3–4 days)

- Add `Invite` action to manual person charts.
- Link invitation to inviter-owned chart.
- Introduce authoritative-source selection in relationship views.
- Show account profile first after acceptance.
- Add invitee review/import prompt without automatic copying.
- Add waiting state when the account chart is incomplete.
- Test that existing manual charts remain usable and editable only by their owner.

**Exit:** existing users do not lose charts, and accepted friends cannot edit or silently claim inviter-entered data.

### Phase 5 — Phone OTP and SMS (4–6 days, plus provider lead time)

- Configure Supabase phone auth and SMS delivery.
- Add phone input with international normalization.
- Add OTP signup/sign-in and account-linking rules.
- Add SMS invitation provider/webhooks.
- Add opt-out/suppression and delivery-state handling.
- Test phone changes, recycled numbers, mismatched identities, resend, expiry, and provider failure.

**Exit:** a verified SMS recipient can safely join or sign in and accept; a forwarded link cannot be claimed by another account.

### Phase 6 — Hardening and beta (4–5 days)

- Security review of RLS, RPCs, token handling, logs, and rate limits.
- Privacy/terms review.
- Abuse and deliverability dashboard.
- Cross-browser/mobile QA.
- Accessibility pass.
- Load and concurrency tests.
- Data cleanup/retention job.
- Feature flags for email, SMS, profile reads, and Circle.
- Run internal dogfood, then a small invite-capped beta.

**Exit:** launch acceptance criteria pass, operations has a rollback/runbook, and guardrail metrics are visible.

## 10. Testing matrix

### Unit

- Email and phone normalization.
- Handle validation and reserved words.
- Canonical user-pair ordering.
- Token digest comparison.
- Friend-safe projection excludes all raw birth/contact fields.
- State-machine transitions.

### Database/RLS

- Owner can update own member profile.
- Stranger cannot read friend profile.
- Accepted friend can read friend-safe profile.
- Removed/blocked friend loses access immediately.
- Browser cannot read contact identities or encrypted destinations.
- Direct client friendship insert fails.
- Invite acceptance requires matching verified identity.
- Concurrent accept produces one friendship.
- Duplicate invitations are idempotent.

### API

- Uniform create response for existing and non-existing contacts.
- Token preview reveals only inviter minimal identity.
- Invalid, expired, revoked, replayed, and mismatched tokens.
- Rate limits by account/contact/IP.
- Provider timeout, retry, webhook replay, bounce, and suppression.
- Log snapshots contain no PII/token.

### Client/E2E

- Handle setup.
- Email invite to new account.
- Email invite to existing account.
- Google sign-in with matching and mismatching email.
- SMS invite and OTP.
- Pending, decline, revoke, expire, accept.
- Friends list and connected profile.
- Profile-sharing off.
- Remove and block.
- Manual chart invite and post-acceptance source selection.
- Offline/retry and multi-tab acceptance.
- Mobile deep link after auth redirect.

## 11. Migration and rollout

### Existing schema

Do not delete `connections` or `invites` in the first release. They may exist in deployed databases and manual-chart creation currently writes `connections`.

Migration approach:

1. Add the new v2 social tables and APIs.
2. Keep manual-chart `connections` reads/writes working.
3. Route all new account friendship behavior to `friendships` and `friend_invitations`.
4. Add observability for old-table use.
5. Once v2 is stable, migrate compatible manual-chart connection metadata or replace it with a typed manual-chart relationship.
6. Deprecate the old plaintext invitation RPC.
7. Revoke execute permission on old `accept_invite(text)` after confirming no active client uses it.
8. Drop or archive old invitation data only in a separately reviewed migration.

### Feature flags

- `social_handles_enabled`
- `social_email_invites_enabled`
- `social_sms_invites_enabled`
- `social_connected_profiles_enabled`
- `social_circle_enabled`

Flags should support account allowlists for dogfood and beta.

### Rollback

- Disable invitation sends without disabling existing friendships.
- Disable connected-profile reads while preserving data.
- Provider failures must not roll back persisted pending invitations; mark delivery failure and allow retry.
- Never roll back by deleting friendships or profiles.

## 12. Observability and operations

Dashboards:

- Sends, delivery success/failure, opens, accepts by channel.
- Acceptance mismatch/replay failures.
- API latency/error rate.
- Rate-limit hits.
- Blocks/reports.
- Friend-profile authorization denials.
- Projection generation failures.

Runbooks:

- Email/SMS provider outage.
- Leaked invitation link.
- Unexpected enumeration signal.
- Incorrect friendship creation.
- User requests account/contact deletion.
- Abuse report and suppression.
- Rotate invite HMAC/encryption secrets.

Use structured logs with invitation/friendship internal IDs. Redact request bodies on social endpoints.

## 13. Definition of done

- Product acceptance criteria in the PRD pass.
- Schema migrations are reversible where practical and tested on a production-like copy.
- All new tables have explicit RLS and policy tests.
- No contact identifier, birth input, or invite token is exposed in friend profile responses, analytics, or logs.
- Invite delivery and auth work on mobile deep links.
- Existing manual-chart flows and relationship views pass regression tests.
- Remove/block authorization changes take effect immediately.
- Provider and feature-flag rollback paths are documented and tested.
- Internal dogfood has completed successfully before enabling broad sends.
