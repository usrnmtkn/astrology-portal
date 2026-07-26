import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260725190000_social_handles_friendships.sql"
);
const defaultHandlesMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260725215000_social_default_handles.sql"
);
const reservedHandlesMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260725220000_reserve_admin_handle.sql"
);
const nameSearchMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260725223000_social_name_search.sql"
);
const privacyMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260725224500_social_privacy_revocation_limits.sql"
);
const prefixNameSearchMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260725231500_social_prefix_name_search.sql"
);
const nameHandleSearchMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260725233000_social_name_handle_search.sql"
);
const launchSafetyMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260725234500_social_blocks_audit.sql"
);
const chartSharingMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260726001500_social_chart_sharing_controls.sql"
);
const sunSignDiscoveryMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260726093000_social_sun_sign_discovery.sql"
);
const realtimeRequestMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260726110000_social_realtime_request_management.sql"
);
const contactInvitationsMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260726111500_social_contact_invitations.sql"
);
const searchVolatilityFixMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260726113000_social_search_volatility_fix.sql"
);
const rankedSearchMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260726120000_social_search_ranking_requests.sql"
);
const invitationManagementMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260726123000_social_invitation_management.sql"
);
const shareLinksMigrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260726180000_social_share_links.sql"
);
const servicePath = path.join(repoRoot, "apps/web/src/services/socialFriends.ts");
const authServicePath = path.join(repoRoot, "apps/web/src/services/auth.ts");
const accountApiPath = path.join(repoRoot, "api/account.ts");
const appPath = path.join(repoRoot, "apps/web/src/App.tsx");
const youPagePath = path.join(repoRoot, "apps/web/src/features/you/YouPage.tsx");
const socialFriendsPanelPath = path.join(repoRoot, "apps/web/src/features/friends/SocialFriendsPanel.tsx");
const blockedAccountsSettingsPath = path.join(
  repoRoot,
  "apps/web/src/features/settings/BlockedAccountsSettings.tsx"
);
const friendsPageShellPath = path.join(repoRoot, "apps/web/src/components/FriendsPageShell.tsx");
const friendDetailPath = path.join(repoRoot, "apps/web/src/features/friends/FriendDetail.tsx");
const friendCircleFeedPath = path.join(repoRoot, "apps/web/src/features/friends/FriendCircleFeed.tsx");
const authorizationTestPath = path.join(
  repoRoot,
  "apps/web/supabase/tests/social_friend_authorization.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");
const defaultHandlesMigration = fs.readFileSync(defaultHandlesMigrationPath, "utf8");
const reservedHandlesMigration = fs.readFileSync(reservedHandlesMigrationPath, "utf8");
const nameSearchMigration = fs.readFileSync(nameSearchMigrationPath, "utf8");
const privacyMigration = fs.readFileSync(privacyMigrationPath, "utf8");
const prefixNameSearchMigration = fs.readFileSync(prefixNameSearchMigrationPath, "utf8");
const nameHandleSearchMigration = fs.readFileSync(nameHandleSearchMigrationPath, "utf8");
const launchSafetyMigration = fs.readFileSync(launchSafetyMigrationPath, "utf8");
const chartSharingMigration = fs.readFileSync(chartSharingMigrationPath, "utf8");
const sunSignDiscoveryMigration = fs.readFileSync(sunSignDiscoveryMigrationPath, "utf8");
const realtimeRequestMigration = fs.readFileSync(realtimeRequestMigrationPath, "utf8");
const contactInvitationsMigration = fs.readFileSync(contactInvitationsMigrationPath, "utf8");
const searchVolatilityFixMigration = fs.readFileSync(searchVolatilityFixMigrationPath, "utf8");
const rankedSearchMigration = fs.readFileSync(rankedSearchMigrationPath, "utf8");
const invitationManagementMigration = fs.readFileSync(invitationManagementMigrationPath, "utf8");
const shareLinksMigration = fs.readFileSync(shareLinksMigrationPath, "utf8");
const service = fs.readFileSync(servicePath, "utf8");
const authService = fs.readFileSync(authServicePath, "utf8");
const accountApi = fs.readFileSync(accountApiPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");
const youPage = fs.readFileSync(youPagePath, "utf8");
const socialFriendsPanel = fs.readFileSync(socialFriendsPanelPath, "utf8");
const blockedAccountsSettings = fs.readFileSync(blockedAccountsSettingsPath, "utf8");
const friendsPageShell = fs.readFileSync(friendsPageShellPath, "utf8");
const friendDetail = fs.readFileSync(friendDetailPath, "utf8");
const friendCircleFeed = fs.readFileSync(friendCircleFeedPath, "utf8");
const authorizationTest = fs.readFileSync(authorizationTestPath, "utf8");

assert.match(
  migration,
  /create table if not exists public\.social_profiles/,
  "Social friends require a dedicated handle/profile projection table."
);
assert.match(
  migration,
  /handle text[\s\S]*social_profiles_handle_format[\s\S]*\^\[a-z\]\[a-z0-9_\]\{2,23\}\$/,
  "Handles must be normalized and constrained at the database boundary."
);
assert.match(
  migration,
  /create unique index if not exists social_profiles_handle_unique_idx[\s\S]*lower\(handle\)/,
  "Handle uniqueness must be case-insensitive."
);
assert.match(
  defaultHandlesMigration,
  /create or replace function public\.ensure_own_social_profile[\s\S]*candidate_index[\s\S]*unique_violation/,
  "Default handle assignment must retry collisions atomically."
);
assert.match(
  defaultHandlesMigration,
  /on conflict on constraint social_profiles_pkey do update[\s\S]*coalesce\(profile\.handle, excluded\.handle\)/,
  "Profile synchronization must preserve a handle the member already chose."
);
assert.match(
  reservedHandlesMigration,
  /values \('tldrastro', 'admin'\)/,
  "@tldrastro must be reserved for the admin app role."
);
assert.match(
  reservedHandlesMigration,
  /auth\.jwt\(\) -> 'app_metadata' ->> 'role'[\s\S]*current_app_role <> required_role/,
  "Reserved handles must be enforced from trusted app metadata, not client input."
);
assert.match(
  reservedHandlesMigration,
  /before insert or update of handle on public\.social_profiles/,
  "Reserved handles must be enforced on every social-profile handle write."
);
assert.match(
  migration,
  /create unique index if not exists social_friend_requests_active_pair_idx[\s\S]*requester_user_id < recipient_user_id[\s\S]*where status = 'pending'/,
  "Opposite-direction concurrent requests must collapse onto one active canonical pair."
);
assert.match(
  migration,
  /constraint social_friendships_canonical_pair[\s\S]*user_low_id < user_high_id/,
  "Accepted friendships must use one canonical mutual row."
);
assert.match(
  migration,
  /alter table public\.social_profiles enable row level security/,
  "Social profiles must have RLS enabled."
);
assert.match(
  migration,
  /create or replace function public\.lookup_social_profile/,
  "Handle lookup must go through the narrow lookup RPC."
);
assert.doesNotMatch(
  migration.match(/create or replace function public\.lookup_social_profile[\s\S]*?\$\$;/)?.[0] ?? "",
  /natal_chart/,
  "Pre-friend handle lookup must not return natal chart data."
);
assert.match(
  nameSearchMigration,
  /create or replace function public\.search_social_profiles\(name_input text\)[\s\S]*position\([\s\S]*normalized_name[\s\S]*profile\.display_name[\s\S]*limit 20/,
  "Friend discovery must support bounded first-name, last-name, and full-name matching."
);
assert.doesNotMatch(
  nameSearchMigration,
  /natal_chart|birth_date|birth_place|email|phone/,
  "Name search must expose only minimal social identity."
);
assert.match(
  privacyMigration,
  /add column if not exists discoverable boolean not null default true/,
  "Social profiles must have an explicit discovery preference."
);
assert.match(
  privacyMigration,
  /profile\.user_id = current_user_id[\s\S]*or profile\.discoverable/,
  "Private accounts must be omitted from name search for other members."
);
assert.match(
  privacyMigration,
  /not target_profile\.discoverable[\s\S]*not already_friends[\s\S]*pending_request\.id is null[\s\S]*return/,
  "Private handles must remain inaccessible except to the member, friends, and active request participants."
);
assert.match(
  privacyMigration,
  /consume_social_rate_limit\('profile-search-minute', 60, 30\)[\s\S]*consume_social_rate_limit\('profile-search-day', 86400, 250\)/,
  "Name search must be rate-limited per authenticated member."
);
assert.match(
  prefixNameSearchMigration,
  /regexp_split_to_table\(normalized_name, '\\s\+'\)[\s\S]*profile_token like query_token \|\| '%'\s+or query_token like profile_token \|\| '%'/,
  "Name search must tolerate shorter or longer name-token prefixes."
);
assert.match(
  prefixNameSearchMigration,
  /profile\.user_id = current_user_id[\s\S]*or profile\.discoverable/,
  "Forgiving name search must preserve the private-account discovery boundary."
);
assert.match(
  prefixNameSearchMigration,
  /consume_social_rate_limit\('profile-search-minute', 60, 30\)[\s\S]*consume_social_rate_limit\('profile-search-day', 86400, 250\)/,
  "Forgiving name search must preserve rate-limit protections."
);
assert.doesNotMatch(
  prefixNameSearchMigration,
  /natal_chart|birth_date|birth_place|email|phone/,
  "Forgiving name search must expose only minimal social identity."
);
assert.match(
  nameHandleSearchMigration,
  /lower\(profile\.handle\) = normalized_handle[\s\S]*\(lower\(profile\.handle\) = normalized_handle\) desc/,
  "The unified finder must support and prioritize exact handle matches."
);
assert.match(
  nameHandleSearchMigration,
  /profile\.user_id = current_user_id[\s\S]*or profile\.discoverable/,
  "Exact handle discovery must preserve the private-account boundary."
);
assert.match(
  nameHandleSearchMigration,
  /consume_social_rate_limit\('profile-search-minute', 60, 30\)[\s\S]*consume_social_rate_limit\('profile-search-day', 86400, 250\)/,
  "Exact handle discovery must preserve rate-limit protections."
);
assert.doesNotMatch(
  nameHandleSearchMigration,
  /natal_chart|birth_date|birth_place|email|phone/,
  "Exact handle search must expose only minimal social identity."
);
assert.match(
  privacyMigration,
  /social_friend_requests_rate_limit[\s\S]*before insert on public\.social_friend_requests/,
  "Friend-request creation must be protected from spam."
);
assert.match(
  migration,
  /create or replace function public\.list_social_friends[\s\S]*friend_profile\.natal_chart/,
  "Only the accepted-friends list RPC should return the friend-safe natal projection."
);
assert.match(
  migration,
  /sfr\.recipient_user_id = current_user_id[\s\S]*sfr\.status = 'pending'[\s\S]*for update/,
  "Only the request recipient may atomically accept or decline a pending request."
);
assert.match(
  service,
  /export function friendSafeNatalChart[\s\S]*label: "Private birth location"[\s\S]*generatedAt: ""/,
  "The social chart projection must redact birth location and source timestamp."
);
assert.match(
  service,
  /birthDate: ""[\s\S]*birthPlace: "Private birth details"/,
  "Connected account charts must not fabricate or expose raw birth inputs."
);
assert.match(
  app,
  /onEdit=\{isSocialFriendChart\(selectedChart\) \? undefined/,
  "Accepted account charts must remain read-only in the manual chart editor."
);
assert.match(
  app,
  /syncOwnSocialProfile\(\{[\s\S]*natalChart: profileNatalSky/,
  "The owner's derived natal projection must stay synchronized for accepted friends."
);
assert.match(
  app,
  /function AccountView[\s\S]*loadOwnSocialProfile\(\)[\s\S]*saveSocialHandle\(\{/,
  "The account page must load and save the member's social handle."
);
assert.match(
  app,
  /const handleDraftValid = socialHandleIsValid\(normalizedHandleDraft\)/,
  "Account handle editing must use the shared handle validation rules."
);
assert.match(
  app,
  /id="account-social-handle"/,
  "The account page must expose an accessible handle input."
);
assert.match(
  app,
  /Handle updated to @/,
  "Account handle editing must report a successful update."
);
assert.match(
  service,
  /\.rpc\("ensure_own_social_profile"[\s\S]*display_name_input/,
  "Social profile synchronization must assign a default handle through the database."
);
assert.match(
  service,
  /message\.toLowerCase\(\)\.includes\("handle is reserved"\)[\s\S]*That handle is reserved\./,
  "The client must explain reserved-handle rejections."
);
assert.match(
  app,
  /profileHandle=\{ownSocialProfile\?\.handle\}/,
  "The profile page must receive the member's current social handle."
);
assert.match(
  youPage,
  /className="you-profile-handle">@\{profileHandle\}/,
  "The profile summary must display the current handle."
);
assert.doesNotMatch(
  socialFriendsPanel,
  /saveSocialHandle|Save handle|setEditingHandle|Your social handle|Manage in Account/,
  "The Friends page must not display or edit the member's own handle card."
);
assert.match(
  socialFriendsPanel,
  /searchSocialProfiles\(normalizedQuery\)[\s\S]*placeholder="Search by name or @handle"[\s\S]*lookupResults\.map\(resultRow\)/,
  "The live Friends finder must search names or handles and render multiple ranked matches."
);
assert.doesNotMatch(
  socialFriendsPanel,
  /Look up their handle|placeholder="friend_handle"|aria-label="Friend handle"/,
  "The Friends finder must not instruct members to search by handle."
);
assert.match(
  service,
  /export async function searchSocialProfiles[\s\S]*\.rpc\("search_social_profiles_public",[\s\S]*name_input: normalizedQuery/,
  "The client must use the protected Sun-only social-profile search RPC."
);
assert.match(
  service,
  /saveSocialPrivacy[\s\S]*update\(\{ discoverable: !isPrivate \}\)/,
  "Account privacy must persist through the owner-only social profile update."
);
assert.match(
  socialFriendsPanel,
  /confirmRemoveFriend[\s\S]*setTimeout\(\(\) => commitPendingRemoval\(friend\), 6_000\)[\s\S]*removed from your circle\.[\s\S]*undoRemoveFriend/,
  "Removing a friend must leave the row immediately and remain reversible for six seconds."
);
assert.match(
  socialFriendsPanel,
  /setFriendToRemove\(friend\)[\s\S]*Remove \{friendToRemove\.displayName\}\?[\s\S]*confirmRemoveFriend\(friendToRemove\)/,
  "Accepted-friend removal must use a named confirmation dialog before revocation."
);
assert.match(
  app,
  /saveSocialPrivacy[\s\S]*Private account[\s\S]*Hide your profile from Find Friends/,
  "Account must expose and persist a private-discovery setting."
);
assert.match(
  migration,
  /create or replace function public\.remove_social_friend[\s\S]*auth\.uid\(\) in \(sf\.user_low_id, sf\.user_high_id\)/,
  "Only a member of a friendship may delete it."
);
assert.match(
  migration,
  /create or replace function public\.list_social_friends[\s\S]*auth\.uid\(\) in \(sf\.user_low_id, sf\.user_high_id\)/,
  "Shared chart reads must reauthorize against the live canonical friendship row."
);
assert.match(
  authorizationTest,
  /public\.list_social_friends\(\)[\s\S]*public\.remove_social_friend\(friendship_id\)[\s\S]*Removed friend retained shared-profile access/,
  "The cross-user database test must prove deletion revokes shared-profile access."
);
assert.match(
  authorizationTest,
  /set discoverable = false[\s\S]*Private member remained discoverable[\s\S]*set[\s\S]*discoverable = true[\s\S]*Public member could not be discovered/,
  "The cross-user database test must cover both sides of discovery privacy."
);
assert.match(
  authorizationTest,
  /search_social_profiles\(member_b_name \|\| 'ner'\)[\s\S]*longer name-token prefix/,
  "The cross-user database test must cover forgiving name-token prefix discovery."
);
assert.match(
  authorizationTest,
  /'@' \|\| \([\s\S]*profile\.handle[\s\S]*exact handle/,
  "The cross-user database test must cover exact @handle discovery."
);
assert.match(
  authorizationTest,
  /begin;[\s\S]*rollback;/,
  "Cross-user authorization tests must leave seeded environments unchanged."
);
assert.match(
  launchSafetyMigration,
  /create table if not exists public\.social_blocks[\s\S]*primary key \(blocker_user_id, blocked_user_id\)/,
  "Blocking must be represented by a canonical database row."
);
assert.match(
  launchSafetyMigration,
  /create or replace function public\.block_social_user[\s\S]*delete from public\.social_friendships[\s\S]*status = 'cancelled'[\s\S]*insert into public\.social_blocks/,
  "Blocking must revoke an existing friendship and pending requests before creating the block."
);
assert.match(
  launchSafetyMigration,
  /search_social_profiles[\s\S]*not exists \([\s\S]*from public\.social_blocks/,
  "Discovery must exclude blocks in both directions."
);
assert.match(
  launchSafetyMigration,
  /list_social_friends[\s\S]*not exists \([\s\S]*from public\.social_blocks/,
  "Shared chart reads must re-check the block boundary."
);
assert.match(
  launchSafetyMigration,
  /create table if not exists private\.social_audit_events[\s\S]*never chart or birth data/i,
  "Social monitoring must remain private and exclude chart or birth data."
);
assert.doesNotMatch(
  launchSafetyMigration.match(/create table if not exists private\.social_audit_events[\s\S]*?;/)?.[0] ?? "",
  /birth|chart|email|phone|metadata|payload/,
  "The social audit table must not store sensitive content."
);
assert.match(
  blockedAccountsSettings,
  /listSocialBlocks\(\)[\s\S]*unblockSocialUser\(block\.userId\)/,
  "Settings must list and unblock accounts the member blocked."
);
assert.match(
  app,
  /settings-group-label">Social[\s\S]*Private account[\s\S]*updateSettingsSubpageUrl\("blocked-accounts"\)[\s\S]*Review and manage people you have blocked/,
  "The Social Settings card must link to block management without listing blocked members."
);
assert.match(
  blockedAccountsSettings,
  /onClick=\{onBack\}[\s\S]*<h1>blocked accounts\.<\/h1>[\s\S]*aria-label="Blocked accounts"/,
  "Blocked members must be managed on a dedicated second-level Settings page."
);
assert.doesNotMatch(
  socialFriendsPanel,
  /listSocialBlocks|unblockSocialUser|Blocked accounts/,
  "Blocked-account management must not remain on the Friends page."
);
assert.match(
  app,
  /settingsSubpage === "blocked-accounts"[\s\S]*<BlockedAccountsSettings[\s\S]*onBack=/,
  "Signed-in Settings must route to the blocked-accounts subpage."
);
assert.match(
  authService,
  /export async function deleteOwnAccount[\s\S]*getSession\(\)[\s\S]*method: "DELETE"[\s\S]*authorization: `Bearer \$\{accessToken\}`/,
  "Account deletion must send the current access token to the server for verification."
);
assert.match(
  accountApi,
  /auth\/v1\/user[\s\S]*auth\/v1\/admin\/users\/\$\{encodeURIComponent\(userPayload\.id\)\}/,
  "The account endpoint must verify the session before deleting that exact authenticated user."
);
assert.match(
  app,
  /exportSocialAccountBundle\(\)[\s\S]*JSON\.stringify\(exportPayload, null, 2\)/,
  "Account must provide a downloadable account-data export."
);
assert.match(
  app,
  /deleteConfirmation !== "DELETE"[\s\S]*deleteOwnAccount\(\)[\s\S]*Type <strong>DELETE<\/strong> to confirm/,
  "Account deletion must require explicit permanent-deletion confirmation."
);
assert.match(
  authorizationTest,
  /block_social_user\(member_b\)[\s\S]*Blocked member remained discoverable[\s\S]*Blocked account retained shared-profile access[\s\S]*unblock_social_user\(member_b\)/,
  "The cross-user test must prove blocking hides discovery and revokes chart access in both directions."
);
assert.match(
  authorizationTest,
  /delete from auth\.users[\s\S]*Account deletion left social or monitoring rows behind/,
  "The database test must prove account deletion cascades through social and monitoring data."
);
assert.match(
  chartSharingMigration,
  /add column if not exists low_shares_chart boolean not null default true[\s\S]*add column if not exists high_shares_chart boolean not null default true/,
  "Each member must control their chart projection independently within a friendship."
);
assert.match(
  chartSharingMigration,
  /case[\s\S]*friend_profile\.user_id = friendship\.user_low_id[\s\S]*friendship\.low_shares_chart[\s\S]*then friend_profile\.natal_chart[\s\S]*else null::jsonb/,
  "The friend list must redact a paused member's natal chart at the database boundary."
);
assert.match(
  chartSharingMigration,
  /set_social_friend_chart_sharing[\s\S]*current_user_id in \(friendship\.user_low_id, friendship\.user_high_id\)/,
  "Only a friendship member may change their own chart-sharing state."
);
assert.match(
  authorizationTest,
  /set_social_friend_chart_sharing\(friendship_id, false\)[\s\S]*Paused chart remained visible to the friend[\s\S]*set_social_friend_chart_sharing\(friendship_id, true\)/,
  "The cross-user test must prove pause redacts the chart and resume restores sharing."
);
assert.match(
  socialFriendsPanel,
  /friends-received-title">Received[\s\S]*incomingRequests\.map[\s\S]*Accept[\s\S]*Decline/,
  "The conditional Requests tab must render received requests and their two actions."
);
assert.match(
  app,
  /pendingFriendRequestCount[\s\S]*friends-nav-badge/,
  "Primary navigation must display incoming friend requests."
);
assert.match(
  sunSignDiscoveryMigration,
  /search_social_profiles_public\(name_input text\)[\s\S]*sun_sign text[\s\S]*lower\(position ->> 'planet'\) = 'sun'/,
  "Public discovery must project only the Sun sign from the derived chart."
);
assert.doesNotMatch(
  sunSignDiscoveryMigration.match(/returns table \([\s\S]*?\)\nlanguage sql/)?.[0] ?? "",
  /moon|ascendant|rising|natal_chart|birth|email|phone/,
  "The public finder return contract must not include private chart or contact fields."
);
assert.match(
  service,
  /rpc\("search_social_profiles_public"[\s\S]*sunSign: row\.sun_sign \?\? undefined/,
  "The web finder must consume the Sun-only discovery RPC."
);
assert.match(
  socialFriendsPanel,
  /function publicSunLine[\s\S]*const connectedFriend[\s\S]*const bigThree = connectedFriend[\s\S]*publicSunLine\(result\.sunSign\)/,
  "Search results must show only the public Sun sign until an accepted friend projection is present."
);
assert.match(
  authorizationTest,
  /search_social_profiles_public\(member_b_name\)[\s\S]*sun_sign = 'Virgo'[\s\S]*Public discovery did not expose the derived Sun sign/,
  "The live authorization test must prove the Sun-only discovery projection works cross-user."
);
assert.match(
  friendsPageShell,
  /<h1>friends\.<\/h1>[\s\S]*\{beforeTabs\}/,
  "The unified Friends panel must render directly under the page title."
);
assert.match(
  app,
  /beforeTabs=\{\([\s\S]*<SocialFriendsPanel[\s\S]*chartContent=\{\([\s\S]*<FriendChartsList[\s\S]*embedded[\s\S]*onSelectView=/,
  "Circle, Charts, and Requests must be wired through one unified Friends panel."
);
assert.match(
  app,
  /<FriendDetail[\s\S]*avatarUrl=\{selectedSocialFriend\?\.avatarUrl\}/,
  "Accepted social profiles must pass their shared photo into the friend detail header."
);
assert.match(
  friendDetail,
  /<ProfileAvatar[\s\S]*avatarUrl=\{avatarUrl\}[\s\S]*className="friend-profile-avatar"/,
  "The friend detail header must render a shared profile photo with an initials fallback."
);
assert.match(
  friendCircleFeed,
  /chart\.avatarUrl \? <img[\s\S]*referrerPolicy="no-referrer"/,
  "Circle feed avatars must render shared profile photos when available."
);
assert.match(
  realtimeRequestMigration,
  /create or replace function public\.cancel_social_friend_request[\s\S]*request\.requester_user_id = auth\.uid\(\)[\s\S]*request\.status = 'pending'/,
  "Only the sender may cancel their own still-pending friend request."
);
assert.match(
  realtimeRequestMigration,
  /create table if not exists public\.social_notifications[\s\S]*recipient_user_id[\s\S]*dismissed_at/,
  "Accepted requests must create durable owner-only notifications that can be dismissed."
);
assert.match(
  realtimeRequestMigration,
  /alter publication supabase_realtime add table public\.social_friend_requests[\s\S]*alter publication supabase_realtime add table public\.social_friendships[\s\S]*alter publication supabase_realtime add table public\.social_notifications/,
  "Requests, friendships, and notices must publish authorization-filtered Realtime changes."
);
assert.match(
  service,
  /subscribeToSocialChanges[\s\S]*social_friend_requests[\s\S]*social_friendships[\s\S]*social_notifications/,
  "The client must subscribe to all social state that affects the request inbox and badge."
);
assert.match(
  socialFriendsPanel,
  /setTimeout\(\(\) => \{[\s\S]*searchSocialProfiles\(normalizedQuery\)[\s\S]*\}, 180\)/,
  "Friend search must debounce live queries instead of requiring a Search button."
);
assert.match(
  socialFriendsPanel,
  /requestUndoUntil[\s\S]*Date\.now\(\) \+ 10_000[\s\S]*cancelRequest\(\{[\s\S]*Undo/,
  "A newly sent request must expose a ten-second inline Undo action."
);
assert.match(
  contactInvitationsMigration,
  /contact_hash text not null[\s\S]*token_hash text not null unique/,
  "Contact invitations must store hashed contact and token values instead of raw delivery data."
);
assert.doesNotMatch(
  contactInvitationsMigration.match(/create table if not exists public\.social_invitations[\s\S]*?;/)?.[0] ?? "",
  /(?:email_address|phone_number|contact_value)\s+text/,
  "The invitation table must not store raw email or phone columns."
);
assert.match(
  contactInvitationsMigration,
  /claim_social_invitation[\s\S]*requester_user_id[\s\S]*invitation\.inviter_user_id[\s\S]*recipient_user_id[\s\S]*current_user_id/,
  "Claiming a contact invitation must create the inviter's pending request for the joined member to accept."
);
assert.match(
  authorizationTest,
  /cancel_social_friend_request\(request_id\)[\s\S]*Cancelled outgoing request remained pending[\s\S]*request_status <> 'request_received'[\s\S]*simultaneous request/,
  "Cross-user QA must cover outgoing cancellation and opposite-direction simultaneous requests."
);
assert.match(
  authorizationTest,
  /list_social_notifications\(\)[\s\S]*Accepted request did not create a requester notification[\s\S]*dismiss_social_notification\(acceptance_notification_id\)/,
  "Cross-user QA must prove acceptance notices can be observed and dismissed."
);
assert.match(
  searchVolatilityFixMigration,
  /search_social_profiles_public\(name_input text\)[\s\S]*language sql[\s\S]*volatile[\s\S]*search_social_profiles\(name_input\)/,
  "The Sun-only finder wrapper must allow its protected search to consume the write-backed rate limit."
);
assert.match(
  rankedSearchMigration,
  /social_levenshtein[\s\S]*lower\(ranked\.handle\) = normalized_handle[\s\S]*lower\(ranked\.handle\) like normalized_handle \|\| '%'[\s\S]*ranked\.normalized_name like normalized_query \|\| '%'[\s\S]*ranked\.all_tokens_prefix_match[\s\S]*ranked\.farthest_token_distance <= 2/,
  "Friend discovery must rank exact handle, handle prefix, full-name prefix, token prefix, then edit distance up to two."
);
assert.match(
  rankedSearchMigration,
  /consume_social_rate_limit\('profile-search-minute', 60, 30\)[\s\S]*where profile\.handle is not null[\s\S]*profile\.user_id <> current_user_id[\s\S]*and profile\.discoverable/,
  "Ranked discovery must retain private-account exclusion, omit self, and preserve authenticated rate limits."
);
assert.doesNotMatch(
  rankedSearchMigration.match(/create or replace function public\.search_social_profiles[\s\S]*?\$\$;/)?.[0] ?? "",
  /natal_chart|birth_date|birth_place|email|phone/,
  "The ranked identity search must not expose natal or contact data."
);
assert.match(
  socialFriendsPanel,
  /placeholder="Search by name or @handle"[\s\S]*Private profiles stay hidden[\s\S]*Circle · \{friends\.length\}[\s\S]*Charts · \{chartCount\}[\s\S]*requestActivityCount > 0[\s\S]*Requests/,
  "Search and the permanent Circle/Charts tabs must share the panel, while Requests appears for pending social activity."
);
assert.doesNotMatch(
  socialFriendsPanel.match(/<label className="friends-unified-search-row">[\s\S]*?<\/label>/)?.[0] ?? "",
  /Find Friends|type="submit"|>\s*Search\s*</,
  "The unified live finder must not render a heading or submit button."
);
assert.match(
  socialFriendsPanel,
  /const searchTimer = window\.setTimeout\(\(\) => \{[\s\S]*skeletonTimer = window\.setTimeout\([\s\S]*\}, 250\)[\s\S]*\}, 180\)/,
  "Live discovery must debounce for 180ms and defer skeletons until 250ms."
);
assert.match(
  socialFriendsPanel,
  /event\.key === "Escape"[\s\S]*event\.key === "ArrowDown"[\s\S]*event\.key === "ArrowUp"[\s\S]*event\.key === "Enter"/,
  "Search must support clear, result navigation, and primary-action keyboard controls."
);
assert.match(
  socialFriendsPanel,
  /highlightedName\(result\.displayName, trimmedQuery\)/,
  "Search results must visibly identify the matching run in the person's name."
);
assert.match(
  socialFriendsPanel,
  /Nobody here yet\.[\s\S]*Search a name or handle to send a request\./,
  "Circle must have the specified compact empty state."
);
assert.match(
  socialFriendsPanel,
  /friendTimingByUserId\[friend\.userId\][\s\S]*View chart[\s\S]*friendMenu\(friend\)/,
  "Circle rows must carry current timing plus the chart and overflow actions."
);
assert.match(
  socialFriendsPanel,
  /activeView === "charts"[\s\S]*Add a chart[\s\S]*chartContent/,
  "Charts must expose its persistent tab-row action and embedded content."
);
assert.match(
  socialFriendsPanel,
  /friends-person-menu[\s\S]*View chart[\s\S]*Remove friend[\s\S]*friends-remove-dialog/,
  "Friend removal must remain behind an overflow menu and confirmation dialog."
);
assert.match(
  socialFriendsPanel,
  /setSocialFriendChartSharing[\s\S]*Your chart:[\s\S]*Their chart:[\s\S]*Chart privacy/,
  "Friend rows must expose reciprocal chart-sharing status and a per-friend privacy control."
);
assert.match(
  socialFriendsPanel,
  /blockSocialUser[\s\S]*Block \{friendToBlock\.displayName\}[\s\S]*cannot find you/,
  "Connected people and incoming requesters must be blockable behind confirmation."
);
assert.match(
  socialFriendsPanel,
  /requestUndoUntil[\s\S]*\{undoAvailable \? "Undo" : "Cancel"\}[\s\S]*requested \{relativeSocialTime\(request\.createdAt\)\}/,
  "Outgoing requests must remain cancellable and request rows must show when they were sent."
);
assert.match(
  socialFriendsPanel,
  /listSocialNotifications[\s\S]*accepted your request[\s\S]*dismissNotification/,
  "Acceptance notifications must be visible and dismissible."
);
assert.match(
  socialFriendsPanel,
  /initialViewResolvedRef[\s\S]*activeViewRef\.current === "circle" && nextFriends\.length === 0[\s\S]*onSelectViewRef\.current\("charts", "replace"\)/,
  "Friends must default to Charts once when the initial Circle is empty without preventing later Circle selection."
);
assert.match(
  socialFriendsPanel,
  /createSocialShareInvitation[\s\S]*Create invite link[\s\S]*Share link[\s\S]*Copy link[\s\S]*Recent invitations/,
  "Non-member invitations must create a shareable private link with native share, copy, and manageable history."
);
assert.match(
  socialFriendsPanel,
  /pendingInvitations[\s\S]*requestActivityCount[\s\S]*friends-pending-title">Pending invites[\s\S]*outgoingRequests\.map[\s\S]*pendingInvitations\.map[\s\S]*cancelInvitation/,
  "Pending member requests and contact invitations must open the Requests tab and remain cancellable."
);
assert.match(
  socialFriendsPanel,
  /expires in 30 days and works once[\s\S]*Anyone with the[\s\S]*link can use it/,
  "The invitation composer must explain the single-use link's expiry and bearer-link privacy."
);
assert.match(
  shareLinksMigration,
  /contact_kind in \('email', 'phone', 'link'\)[\s\S]*create_social_share_invitation\(\)[\s\S]*share-invite-minute[\s\S]*'Share link'[\s\S]*invitation\.contact_kind = 'link'[\s\S]*return true[\s\S]*alter publication supabase_realtime add table public\.social_invitations/,
  "The database must create rate-limited bearer links that retain existing one-use invitation safeguards."
);
assert.match(
  service,
  /subscribeToSocialChanges[\s\S]*social_invitations/,
  "Pending invite links must update through the Social Realtime subscription."
);
assert.match(
  authorizationTest,
  /create_social_share_invitation\(\)[\s\S]*preview\.contact_kind = 'link'[\s\S]*Accepting a share link did not create the friendship/,
  "Cross-user authorization QA must prove a share link can be previewed and accepted once."
);
assert.match(
  invitationManagementMigration,
  /contact_hint[\s\S]*preview_social_invitation[\s\S]*social_invitation_matches_current_user[\s\S]*social_blocks[\s\S]*claim_social_invitation[\s\S]*insert into public\.social_friendships/,
  "Invitation preview and acceptance must verify the recipient, honor blocks, and create the canonical friendship."
);
assert.match(
  authService,
  /signInWithOtp[\s\S]*verifyOtp[\s\S]*type: "sms"/,
  "Phone invitations require an OTP authentication path for the verified recipient."
);
assert.doesNotMatch(
  app,
  /Add your full name before continuing with phone/,
  "Sending a phone OTP must not require profile details before authentication."
);
assert.match(
  app,
  /savePendingSignupForm\(form\);[\s\S]*verifyPhoneSignInCode[\s\S]*createUserProfile\(form, "phone", account\)/,
  "Phone signup must defer profile details until code verification and preserve the phone provider."
);
assert.doesNotMatch(
  authService,
  /user\.email\?\.split\("@"\)\[0\]\s*\?\?\s*user\.phone/,
  "A phone number must never become the member's public display name."
);
assert.match(
  authService,
  /unsupported phone provider[\s\S]*Phone sign-in is not available right now/,
  "Disabled SMS providers must render actionable member-facing copy instead of a backend error."
);
assert.match(
  authService,
  /digits\.length === 10[\s\S]*`\+1\$\{digits\}`[\s\S]*signInWithOtp\([\s\S]*normalizePhoneForOtp\(phone\)[\s\S]*verifyOtp\([\s\S]*normalizePhoneForOtp\(phone\)/,
  "Ten-digit US mobile input must normalize consistently for both OTP delivery and verification."
);
assert.match(
  authService,
  /VITE_PHONE_AUTH_ENABLED === "true"/,
  "Phone authentication must require an explicit environment feature flag."
);
assert.match(
  app,
  /\{isPhoneAuthEnabled && \([\s\S]*Continue with phone[\s\S]*\{isPhoneAuthEnabled && phoneAuthOpen && \(/,
  "The phone entry point and OTP form must stay hidden until the provider is enabled."
);

console.log(JSON.stringify({
  status: "PASS",
  surface: "social handles and account friendships",
  contract: "Private, rate-limited discovery leads to accepted friendships; deletion immediately revokes shared-chart access."
}, null, 2));
