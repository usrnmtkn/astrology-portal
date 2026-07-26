# Friend Connections and Social Profiles PRD

**Status:** Draft
**Owner:** Product / Engineering
**Last updated:** 2026-07-25
**Related plan:** [friend-connections-implementation-plan.md](./friend-connections-implementation-plan.md)

## 1. Summary

TLDR Astro should let a signed-in member invite a friend by email address or phone number. The recipient can join or sign in, accept the invitation, choose a unique profile handle, and become a mutual connection. Once connected, both people can open each other's TLDR Astro profile and use the existing natal, compatibility, synastry, composite, and timing experiences with an account-owned chart rather than a chart one person manually maintains for the other.

This is the first social foundation for the product. The first release is intentionally private and relationship-centered: a mutual friend graph, connected profiles, and astrology experiences between friends. It is not a public social network, contact uploader, messaging product, or user-generated post feed.

## 2. Why this matters

Today, the Friends area is a useful private chart notebook:

- Members can manually add another person's birth chart.
- The app can render that person's natal chart and relationship views.
- The Circle tab has a feed-like presentation.
- Manual charts sync to Supabase when the member is authenticated.

However, a "friend" is not currently another TLDR Astro account:

- There is no handle.
- There is no mutual connection state.
- There is no invite UI or delivery service.
- There is no runtime code for accepting the invite schema already present in the repository.
- A member cannot safely read a friend's account-owned profile.
- The Circle experience is not backed by a real social graph.

Connecting real accounts makes the relationship content more trustworthy and lower-maintenance, gives members a reason to invite others, and creates a base for future private social experiences.

## 3. Product principles

1. **Mutual and consent-based.** Entering someone's contact information sends a request; it never silently creates an account-to-account friendship.
2. **Astrology profile, not contact directory.** Email addresses and phone numbers are only used for private invite matching and delivery. They are never displayed to other members or searchable from the client.
3. **Account-owned identity wins.** Once a person joins, their profile name, handle, avatar, and chart-sharing choices are authoritative. A chart previously entered by an inviter must not silently overwrite the new member's profile.
4. **Private by default.** Full astrology profiles are visible only to accepted connections. Exact birth date, time, and location remain private unless a later, explicit sharing feature is added.
5. **Safe failure and non-enumeration.** The sender sees the same confirmation whether or not the contact already has an account.
6. **Useful before a feed.** The social foundation is successful if friends can connect and meaningfully explore each other's profiles. Posting, comments, and direct messages are not required for the first release.

## 4. Goals

### Member goals

- Create and claim a unique, readable profile handle.
- Invite one person using an email address or mobile phone number.
- See that an invitation is pending, accepted, expired, or revoked.
- Accept or decline a friend request after joining or signing in.
- See accepted friends in the existing Friends area.
- Open a friend's account-owned profile.
- View the friend's shared astrology profile and relationship experiences.
- Remove or block a connection.
- Control whether the member can be matched through verified email/phone and whether accepted friends can see their astrology profile.

### Business and product goals

- Increase invite-driven signup and activation.
- Increase repeat use of the Friends area.
- Establish a secure account-to-account graph that can support a future Circle feed.
- Reuse the app's existing relationship content and manual chart workflows.

## 5. Non-goals for the first release

- Public profiles readable by anyone on the web.
- A suggested-people directory or contact-based discovery.
- Uploading or syncing an address book.
- Follower/following relationships.
- Public posts, likes, comments, reposts, or direct messages.
- Group chats or group synastry.
- Automatic social graph imports from Google, Apple, or Meta.
- Sharing exact birth date, birth time, or birth location with friends.
- Multiple profile personas per account.
- A child/minor social experience. The launch policy should be adults-only until age, guardian, and safety requirements are defined.

## 6. Users and key jobs

### Existing member inviting a friend

"I already use TLDR Astro and want my friend here so we can see each other's profiles and relationship astrology without me managing their chart."

### New recipient

"A friend invited me. I want to understand who invited me, join safely, create my own identity, and control what they can see."

### Existing member receiving a request

"Someone I know invited my verified email or phone. I want to accept or decline without exposing my account's existence or contact details."

### Existing manual-chart user

"I already created a chart for this person. I want to invite them without losing my current compatibility history, while letting them own their real profile after they join."

## 7. Core experience

### 7.1 Handle creation

Every member must have a handle before sending or accepting a friend invitation.

Handle rules:

- 3–24 characters.
- Lowercase Latin letters, numbers, and underscores.
- Must start with a letter.
- Case-insensitively unique.
- Reserved system, support, astrology, and brand words are unavailable.
- `@tldrastro` is reserved for an account whose trusted app role is `admin`.
- Displayed with `@`, but stored without it.
- A member can change it from Account; the new handle is applied immediately.
- Account identity and friendship records always use immutable user IDs, never handles.
- A handle change does not break a friendship.

The app assigns a readable default from the member's display name. If that handle is already owned, it appends the next available numeric suffix (`name_2`, `name_3`, and so on). The Account editor is the only place a member can change their handle; You displays it read-only. Friends finds discoverable people by first name, last name, or full display name and shows the unique handle on each result so duplicate names remain distinguishable. A member can make their account private in Account, removing it from discovery without disconnecting accepted friends. Friends does not show a separate card for the member's own handle. Account reports taken handles without losing the draft, and availability is revalidated atomically on save.

### 7.2 Send an invitation

Entry points:

- Primary `Add friend` action in Friends.
- `Invite to TLDR Astro` action on an existing manual person chart.
- Empty state in the Friends list.

The sender:

1. Selects Email or Text.
2. Enters one email address or mobile number.
3. Optionally selects an existing manual person chart to associate with the invitation.
4. Reviews a short disclosure: accepting creates a mutual connection and permits friend-profile astrology views.
5. Sends the invitation.

The UI always responds with neutral copy such as:

> Invite sent. If this contact can receive TLDR Astro invitations, they'll get a private link.

It must not reveal whether the contact already has an account.

### 7.3 Recipient opens the invite

The private link opens a lightweight invitation page showing:

- Inviter display name, handle, and avatar.
- "invited you to connect on TLDR Astro."
- What accepting shares.
- `Join and accept`, `Sign in and accept`, and `Not now`.
- Expired, revoked, already-used, and blocked states.

The preview never displays the recipient email or phone.

If the recipient is not authenticated:

- Email invitations can continue through verified email signup/sign-in.
- SMS invitations can continue through verified phone OTP.
- The verified authentication identity must match the invitation recipient.
- The invite token survives the authentication redirect in short-lived, secure state.

If the recipient is already authenticated but their verified identity does not match the invitation, the app asks them to switch accounts or verify the invited contact method. Forwarding a targeted invite must not let an unrelated account claim it.

### 7.4 Accept or decline

Acceptance is atomic:

1. Validate the token, expiry, recipient identity, block state, and rate limits.
2. Ensure both members have handles.
3. Create one canonical mutual friendship.
4. Mark the invitation accepted.
5. Write an auditable friendship event.
6. Offer the new member a review of any inviter-created manual chart, without automatically importing it.
7. Route both members to the connected profile experience.

If both people independently invited each other, acceptance resolves to one friendship and closes both pending invitations.

Declining:

- Marks the invitation declined.
- Does not notify the inviter with a reason.
- Leaves no profile access.
- Allows a later invitation unless the recipient also blocks the sender.

### 7.5 Friends home

The existing Friends area should evolve to:

- **Friends list:** accepted account connections first, then private manual charts in a clearly labeled section.
- **Requests:** incoming requests and sent/pending invitations.
- **Circle:** retained as a product surface, but it should not imply user-authored activity until a real feed is launched.
- **Add friend:** always available from the top-level Friends page.

Each accepted friend row shows:

- Avatar.
- Display name.
- `@handle`.
- Sun, Moon, and Rising when shared.
- A compact connection status or recently viewed signal, not presence.

Manual charts remain supported and are visually labeled `Private chart`.

### 7.6 Connected profile

Route concept: `/friends/@handle`, with compatibility for the app's existing hash routing during migration.

An accepted friend can read:

- Display name, handle, avatar, and optional short bio.
- Shared Big Three and natal placements derived from the member's authoritative chart.
- Existing natal interpretation surfaces.
- Existing compatibility, synastry, composite, and friend timing surfaces between viewer and friend.

An accepted friend cannot read:

- Email address or phone number.
- Exact birth date, time, or location.
- Account provider or account settings.
- Private notes.
- Private manual charts.
- Draft or unshared profile data.

The profile header menu includes `Remove friend`, `Block`, and `Report`.

### 7.7 Manual chart transition

Inviting from a manual chart links the invitation to that chart for continuity, but the chart remains owned by its creator.

After acceptance:

- The connected friend's account-owned chart becomes the source for friend-profile and relationship views when available.
- The inviter's manual chart is retained as a private archived/draft record until the inviter chooses to delete it.
- The invitee may review an "A friend created a chart for you" comparison and explicitly import missing birth details.
- No birth data entered by another person is silently copied into the invitee's account.
- If the invitee has not completed a chart, the relationship UI can show a clear `Waiting for @handle to finish their chart` state rather than falling back invisibly to the inviter's private data.

## 8. Profile visibility and consent

### Visibility levels

For the first release:

- **Minimal identity:** display name, handle, and avatar can be returned only in the context of a valid invitation or accepted friendship.
- **Friend profile:** astrology profile projection available only to accepted, non-blocked friends.
- **Private account:** contact details, raw birth details, preferences, private charts, and notes remain owner-only.

### Settings

- `Let people invite me using my verified email/phone` — on by default, independently configurable per channel.
- `Share my astrology profile with accepted friends` — explained during handle/onboarding setup and on by default for a social connection.
- `Show my avatar to invitation recipients` — on by default.

Turning off astrology-profile sharing preserves the friendship but shows a private-profile state. Removing a friendship removes both members' profile access immediately.

## 9. Functional requirements

### Identity and handles

- The system stores a unique handle separately from the current JSON profile payload.
- Handle reservation is atomic and protected from race conditions.
- The handle appears in Account and Friends UI.
- All APIs return only the minimum profile projection needed for the current relationship.

### Invitation delivery

- Support one recipient per send for MVP.
- Normalize email by trimming and lowercasing. Do not apply provider-specific dot or plus-address rewriting.
- Normalize phone numbers to E.164 before sending.
- Use separate provider adapters for email and SMS.
- Persist provider delivery ID and coarse delivery state.
- Do not put recipient contact information in client logs, analytics, error messages, or URLs.
- Invitation links are single-use and expire after 7 days.
- Resending rotates the token and invalidates the prior token.
- A sender may revoke a pending invite.

### Requests and friendship

- Friendship is mutual and represented once.
- Duplicate sends are idempotent.
- Self-invites are rejected without disclosing account lookup details.
- A block supersedes invitations and friendship.
- Removing a friend is mutual.
- Blocking prevents future invitations and connected-profile reads in both directions.
- Unblocking does not restore a previous friendship.

### Profiles and charts

- Connected-profile reads use an explicit friend-safe projection.
- The friend-safe projection includes derived chart data needed for natal and relationship rendering, not raw birth inputs.
- A profile update is reflected for connected friends without copying data into each friendship.
- If either member disables sharing, relationship views requiring that chart are unavailable.

### States

The UI must cover:

- No friends.
- Friends plus private charts.
- Incoming request.
- Pending outgoing email invite.
- Pending outgoing SMS invite.
- Accepted.
- Declined.
- Expired.
- Revoked.
- Delivery failed.
- Profile incomplete.
- Profile sharing disabled.
- Removed.
- Blocked.
- Offline/retry state.

## 10. Safety, privacy, and abuse requirements

- Never expose an endpoint that answers "does this email/phone have an account?"
- Store only an HMAC of normalized contact identifiers for matching. If the delivery address must be retained for retry/support, store it encrypted with a separate key and a defined retention period.
- Store only a digest of invite tokens. The plaintext token is returned once for delivery.
- Redact contact data and invite tokens from logs.
- Match acceptance to a verified authentication identity.
- Rate limit per sender account, recipient contact HMAC, IP, device, and time window.
- Suggested initial limits: 5 sends/hour, 20/day per account, and 3 sends/7 days to the same recipient. These are launch defaults to tune with data.
- Add CAPTCHA or equivalent bot protection after suspicious activity, not necessarily for every send.
- Require reauthentication for changing verified contact methods.
- Keep an audit trail for sent, delivered, accepted, declined, revoked, removed, blocked, and reported actions.
- Provide report and block actions on every connected profile.
- Do not use friend contact data for marketing consent.
- Establish retention: delete encrypted recipient contact after acceptance or 30 days after terminal/expired status; retain non-PII audit records according to policy.
- Complete a privacy and terms review before production SMS/email launch.

## 11. Data model direction

The implementation plan contains migration detail. The intended product entities are:

### `member_profiles`

Friend-safe identity and derived astrology projection.

- `user_id`
- `handle` (`citext`, unique)
- `display_name`
- `avatar_url`
- `bio`
- `profile_visibility`
- `share_astrology_with_friends`
- `astrology_profile` (`jsonb`, derived; no exact birth inputs)
- `handle_changed_at`
- timestamps

The existing `user_profiles.data` remains private account/profile persistence and must not become friend-readable.

### `contact_identities`

Server-only mapping for verified invite matching.

- `user_id`
- `kind` (`email` or `phone`)
- `contact_hmac`
- `verified_at`
- `invite_discoverable`
- timestamps

No browser-select policy.

### `friendships`

One canonical undirected edge.

- `id`
- `user_low_id`
- `user_high_id`
- `status` (`accepted`, `removed`)
- `created_from_invite_id`
- `accepted_at`
- timestamps

A unique constraint on the canonical user pair prevents duplicates.

### `friend_invitations`

- `id`
- `inviter_user_id`
- `target_user_id` when securely resolved
- `contact_kind`
- `contact_hmac`
- optional encrypted delivery destination
- `token_digest`
- `manual_chart_id`
- `status`
- `provider_message_id`
- `expires_at`
- terminal timestamps
- timestamps

### `friend_blocks`

- `blocker_user_id`
- `blocked_user_id`
- `reason_code`
- timestamps

Block records are directional but enforced bidirectionally for invitations, friendships, and profile reads.

### `friendship_events`

Private audit/event source for connection lifecycle. It can later support a Circle feed, but feed eligibility and copy should be added in a separate phase.

## 12. Existing repository foundation

Reusable:

- Supabase authentication with email/password and Google.
- Private `user_profiles` JSON persistence.
- Manual charts with local-first sync.
- Existing Friends routes, styles, charts list, friend profile, compatibility, synastry, composite, and timing UI.
- Existing Supabase migrations for `manual_charts`, `connections`, `invites`, and `accept_invite`.

Gaps to address:

- `UserProfile` has no handle or friend-safe projection.
- `user_profiles` is owner-readable only, correctly preventing friend reads but offering no alternative projection.
- The existing `connections` model is directional and creates reciprocal rows; product friendship should be canonical and mutual.
- The current invitation token is stored in plaintext.
- Existing `accept_invite` allows any signed-in token holder to accept; it does not require the verified recipient identity to match.
- There is no invite send, preview, accept, decline, list, revoke, remove, or block client service.
- There is no email or SMS delivery integration.
- Current auth has no phone OTP flow.
- Manual-chart claim behavior needs explicit consent and an authoritative-chart rule.

## 13. Success metrics

### Activation funnel

- Percent of eligible members who claim a handle.
- Percent of handled members who open Add friend.
- Invite send success rate by channel.
- Invitation open rate.
- Invitation acceptance rate.
- New-account completion rate from an invitation.
- Median time from send to acceptance.

### Social value

- Percent of weekly active members with at least one accepted friend.
- Weekly connected-profile viewers.
- Connected-profile views per connected member.
- Relationship-view starts and completions between accepted friends.
- Week-4 retention difference between members with and without an accepted friend.

### Guardrails

- Delivery complaint/bounce rate.
- Block and report rate per 1,000 invitations.
- Duplicate or mismatched acceptance attempts.
- Profile authorization failures.
- Rate-limited send rate.
- Support contacts about unwanted invitations or exposed information.

Instrumentation must use internal IDs and channel type, never raw email, phone, or invite tokens.

## 14. Launch acceptance criteria

The MVP is ready when:

1. Every member receives a unique default handle and can change it in Account; the current value appears in Account and You.
2. A member can send one invitation by email or SMS without learning whether the contact already has an account.
3. A matching existing member or new signup can open, authenticate, and accept the invite.
4. A forwarded invite cannot be accepted by a non-matching, unverified account.
5. Acceptance creates exactly one mutual friendship under retries and concurrent requests.
6. Both members appear in each other's Friends list.
7. Each can open the other's shared profile by handle.
8. Relationship views use the connected member's friend-safe chart projection.
9. Exact birth inputs and contact details are not returned to the friend.
10. Pending invites can be revoked; friendships can be removed; members can be blocked.
11. Removing or blocking immediately revokes connected-profile access.
12. Existing manual charts still work and are visibly distinct from account friends.
13. Inviting from a manual chart preserves it but does not silently import its data into the recipient's account.
14. Authorization, idempotency, expiry, rate-limit, and profile-privacy tests pass.
15. Logs and analytics contain no raw contact data or invitation tokens.

## 15. Release stages

### Stage 0: Internal dogfood

- Handles.
- Email invitations only.
- Mutual friendships and connected profiles.
- Manual chart association.
- Remove/block.

### Stage 1: Limited beta

- Phone OTP and SMS invitations.
- Delivery-state UI and resend/revoke.
- Requests inbox.
- Abuse monitoring and operational dashboard.

### Stage 2: Social value

- Astrology-first Circle cards generated only from consented, friend-safe events.
- Notification preferences.
- Optional handle-based requests if privacy and abuse metrics are healthy.

## 16. Open product decisions

These should be resolved before UI implementation, but do not block schema prototyping:

1. Which transactional email and SMS providers will be used in production?
2. Is the initial launch adults-only through policy/attestation, or is a more complete age gate required?
3. Should a minimal handle page be visible to any signed-in member, or only in invitation/friendship context? This PRD recommends invitation/friendship context only.
4. Should astrology-profile sharing be required to accept a friendship or permitted to be off? This PRD permits it to be off while preserving the connection.
5. What friend-derived events are appropriate for a future Circle feed, and which require per-event consent?
6. Should handle renames reserve the old handle for redirects? This PRD treats redirects as post-MVP.
