import type { SkySnapshot } from "../types";
import type { ManualChart } from "./manualCharts";
import { getSupabaseClient, getVerifiedAuthUser } from "./auth";

export type SocialProfile = {
  userId: string;
  handle: string | null;
  displayName: string;
  avatarUrl?: string;
  isPrivate: boolean;
  hasNatalChart: boolean;
};

export type SocialLookupResult = {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  sunSign?: string;
  relationshipStatus: "self" | "none" | "friends" | "request_sent" | "request_received";
  requestId?: string;
};

export type SocialFriendRequest = {
  requestId: string;
  direction: "incoming" | "outgoing";
  status: "pending";
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  sunSign?: string;
  createdAt: string;
};

export type SocialNotification = {
  notificationId: string;
  type: "friend_request_accepted";
  actorUserId: string;
  actorHandle: string;
  actorDisplayName: string;
  actorAvatarUrl?: string;
  friendshipId?: string;
  createdAt: string;
};

export type SocialInvitation = {
  invitationId: string;
  token: string;
  expiresAt: string;
};

export type SocialInvitationSummary = {
  invitationId: string;
  contactKind: "email" | "phone" | "link";
  contactHint: string;
  status: "pending" | "claimed" | "declined" | "cancelled" | "expired";
  createdAt: string;
  expiresAt: string;
};

export type SocialInvitationPreview = {
  invitationId: string;
  contactKind: "email" | "phone" | "link";
  inviterUserId: string;
  inviterHandle: string;
  inviterDisplayName: string;
  inviterAvatarUrl?: string;
  expiresAt: string;
};

export type ConnectedSocialFriend = {
  friendshipId: string;
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  natalChart: SkySnapshot | null;
  viewerSharesChart: boolean;
  friendSharesChart: boolean;
  acceptedAt: string;
};

export type SocialBlock = {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
  blockedAt: string;
};

type SocialProfileRow = {
  user_id: string;
  handle: string | null;
  display_name: string;
  avatar_url: string | null;
  discoverable?: boolean | null;
  natal_chart?: unknown | null;
};

type LookupRow = SocialProfileRow & {
  relationship_status: SocialLookupResult["relationshipStatus"];
  request_id: string | null;
  sun_sign?: string | null;
};

type RequestRow = {
  request_id: string;
  direction: SocialFriendRequest["direction"];
  status: "pending";
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  sun_sign?: string | null;
};

type FriendRow = {
  friendship_id: string;
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  natal_chart: SkySnapshot | null;
  viewer_shares_chart?: boolean | null;
  friend_shares_chart?: boolean | null;
  accepted_at: string;
};

type BlockRow = {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  blocked_at: string;
};

type NotificationRow = {
  notification_id: string;
  notification_type: SocialNotification["type"];
  actor_user_id: string;
  actor_handle: string;
  actor_display_name: string;
  actor_avatar_url: string | null;
  friendship_id: string | null;
  created_at: string;
};

type InvitationRow = {
  invitation_id: string;
  invitation_token: string;
  expires_at: string;
};

type InvitationSummaryRow = {
  invitation_id: string;
  contact_kind: SocialInvitationSummary["contactKind"];
  contact_hint: string;
  invitation_status: SocialInvitationSummary["status"];
  created_at: string;
  expires_at: string;
};

type InvitationPreviewRow = {
  invitation_id: string;
  contact_kind: SocialInvitationPreview["contactKind"];
  inviter_user_id: string;
  inviter_handle: string;
  inviter_display_name: string;
  inviter_avatar_url: string | null;
  expires_at: string;
};

const pendingSocialInvitationKey = "tldrastro.pending-social-invitation";
const pendingSocialInvitationConfirmationExpiryKey = `${pendingSocialInvitationKey}.confirmation-expires-at`;
const pendingSocialInvitationConfirmationTtlMs = 24 * 60 * 60 * 1000;

function pendingInvitationToken() {
  const sessionToken = window.sessionStorage.getItem(pendingSocialInvitationKey);

  if (sessionToken) {
    return sessionToken;
  }

  const legacyToken = window.localStorage.getItem(pendingSocialInvitationKey);

  if (legacyToken) {
    const confirmationExpiry = Number(
      window.localStorage.getItem(pendingSocialInvitationConfirmationExpiryKey)
    );

    if (Number.isFinite(confirmationExpiry) && confirmationExpiry > 0 && confirmationExpiry <= Date.now()) {
      window.localStorage.removeItem(pendingSocialInvitationKey);
      window.localStorage.removeItem(pendingSocialInvitationConfirmationExpiryKey);
      return null;
    }

    window.sessionStorage.setItem(pendingSocialInvitationKey, legacyToken);
    window.localStorage.removeItem(pendingSocialInvitationKey);
    window.localStorage.removeItem(pendingSocialInvitationConfirmationExpiryKey);
  }

  return legacyToken;
}

export function clearPendingSocialInvitation() {
  window.sessionStorage.removeItem(pendingSocialInvitationKey);
  window.localStorage.removeItem(pendingSocialInvitationKey);
  window.localStorage.removeItem(pendingSocialInvitationConfirmationExpiryKey);
}

export function preservePendingSocialInvitationForEmailConfirmation() {
  const token = pendingInvitationToken();

  if (!token) {
    return false;
  }

  window.localStorage.setItem(pendingSocialInvitationKey, token);
  window.localStorage.setItem(
    pendingSocialInvitationConfirmationExpiryKey,
    String(Date.now() + pendingSocialInvitationConfirmationTtlMs)
  );
  return true;
}

export function hasPendingSocialInvitation() {
  return Boolean(pendingInvitationToken());
}

export function normalizeSocialHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export function socialHandleIsValid(value: string) {
  return /^[a-z][a-z0-9_]{2,23}$/.test(normalizeSocialHandle(value));
}

function socialError(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; message?: unknown };
    const message = typeof candidate.message === "string" ? candidate.message : "";

    if (message.toLowerCase().includes("handle is reserved")) {
      return new Error("That handle is reserved.");
    }

    if (candidate.code === "23505") {
      return new Error("That handle is already taken.");
    }

    if (candidate.code === "23514") {
      return new Error("Use 3–24 characters, starting with a letter. Letters, numbers, and underscores only.");
    }

    if (
      candidate.code === "42P01"
      || candidate.code === "PGRST202"
      || candidate.code === "PGRST204"
      || message.includes("schema cache")
      || message.includes("social_profiles")
      || message.includes("social_friend")
    ) {
      return new Error("Social handles are not enabled for this environment yet.");
    }

    if (message.trim()) {
      return new Error(message);
    }
  }

  return new Error(fallback);
}

async function authenticatedClient() {
  const client = await getSupabaseClient();

  if (!client) {
    throw new Error("Social friends require a signed-in account.");
  }

  const user = await getVerifiedAuthUser(client);

  if (!user) {
    throw new Error("Sign in to use social friends.");
  }

  return { client, user };
}

function rowToProfile(row: SocialProfileRow): SocialProfile {
  return {
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    isPrivate: row.discoverable === false,
    hasNatalChart: row.natal_chart != null
  };
}

export function friendSafeNatalChart(chart: SkySnapshot | null | undefined): SkySnapshot | null {
  if (!chart) {
    return null;
  }

  return {
    ...chart,
    location: {
      label: "Private birth location",
      latitude: 0,
      longitude: 0
    },
    generatedAt: "",
    solarDaylight: undefined,
    moonEvent: undefined,
    moonSignTransition: undefined
  };
}

export async function syncOwnSocialProfile({
  displayName,
  avatarUrl,
  natalChart
}: {
  displayName: string;
  avatarUrl?: string;
  natalChart: SkySnapshot | null;
}): Promise<SocialProfile> {
  const { client, user } = await authenticatedClient();
  const { data, error } = await client
    .rpc("ensure_own_social_profile", {
      display_name_input: displayName.trim() || "New stargazer",
      avatar_url_input: avatarUrl ?? null,
      natal_chart_input: friendSafeNatalChart(natalChart)
    })
    .single();

  if (error) {
    throw socialError(error, "Could not update your social profile.");
  }

  const row = data as SocialProfileRow;

  if (row.user_id !== user.id) {
    throw new Error("Could not verify your social profile.");
  }

  const { data: currentProfile, error: profileError } = await client
    .from("social_profiles")
    .select("user_id, handle, display_name, avatar_url, discoverable, natal_chart")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    throw socialError(profileError, "Could not verify your social profile.");
  }

  return rowToProfile(currentProfile as SocialProfileRow);
}

export async function loadOwnSocialProfile(): Promise<SocialProfile | null> {
  const { client, user } = await authenticatedClient();
  const { data, error } = await client
    .from("social_profiles")
    .select("user_id, handle, display_name, avatar_url, discoverable, natal_chart")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw socialError(error, "Could not load your social profile.");
  }

  return data ? rowToProfile(data as SocialProfileRow) : null;
}

export async function saveSocialHandle({
  handle,
  displayName,
  avatarUrl
}: {
  handle: string;
  displayName: string;
  avatarUrl?: string;
}): Promise<SocialProfile> {
  const normalizedHandle = normalizeSocialHandle(handle);

  if (!socialHandleIsValid(normalizedHandle)) {
    throw new Error("Use 3–24 characters, starting with a letter. Letters, numbers, and underscores only.");
  }

  const { client, user } = await authenticatedClient();
  const profileValues = {
    handle: normalizedHandle,
    display_name: displayName.trim() || "New stargazer",
    avatar_url: avatarUrl ?? null
  };
  const { data: updatedRows, error: updateError } = await client
    .from("social_profiles")
    .update(profileValues)
    .eq("user_id", user.id)
    .select("user_id, handle, display_name, avatar_url, discoverable, natal_chart")
    .limit(1);

  if (updateError) {
    throw socialError(updateError, "Could not save your handle.");
  }

  let data = (updatedRows as SocialProfileRow[] | null)?.[0];

  if (!data) {
    const { data: insertedRow, error: insertError } = await client
      .from("social_profiles")
      .insert({
        user_id: user.id,
        ...profileValues
      })
      .select("user_id, handle, display_name, avatar_url, discoverable, natal_chart")
      .single();

    if (insertError) {
      throw socialError(insertError, "Could not save your handle.");
    }

    data = insertedRow as SocialProfileRow;
  }

  return rowToProfile(data);
}

export async function saveSocialPrivacy(isPrivate: boolean): Promise<SocialProfile> {
  const { client, user } = await authenticatedClient();
  const { data, error } = await client
    .from("social_profiles")
    .update({ discoverable: !isPrivate })
    .eq("user_id", user.id)
    .select("user_id, handle, display_name, avatar_url, discoverable, natal_chart")
    .single();

  if (error) {
    throw socialError(error, "Could not update your account privacy.");
  }

  return rowToProfile(data as SocialProfileRow);
}

export async function lookupSocialProfile(handle: string): Promise<SocialLookupResult | null> {
  const normalizedHandle = normalizeSocialHandle(handle);

  if (!socialHandleIsValid(normalizedHandle)) {
    return null;
  }

  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("lookup_social_profile", {
    handle_input: normalizedHandle
  });

  if (error) {
    throw socialError(error, "Could not search for that handle.");
  }

  const row = (data as LookupRow[] | null)?.[0];

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    handle: row.handle ?? normalizedHandle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    relationshipStatus: row.relationship_status,
    requestId: row.request_id ?? undefined
  };
}

export async function searchSocialProfiles(query: string): Promise<SocialLookupResult[]> {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");

  if (normalizedQuery.replace(/^@/, "").length < 2) {
    return [];
  }

  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("search_social_profiles_public", {
    name_input: normalizedQuery
  });

  if (error) {
    throw socialError(error, "Could not search for that person.");
  }

  return ((data ?? []) as LookupRow[]).map((row) => ({
    userId: row.user_id,
    handle: row.handle ?? "",
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    sunSign: row.sun_sign ?? undefined,
    relationshipStatus: row.relationship_status,
    requestId: row.request_id ?? undefined
  }));
}

export async function sendSocialFriendRequest(handle: string) {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("send_social_friend_request", {
    handle_input: normalizeSocialHandle(handle)
  });

  if (error) {
    throw socialError(error, "Could not send the friend request.");
  }

  return (data as Array<{ request_id: string | null; request_status: string }> | null)?.[0] ?? null;
}

export async function respondToSocialFriendRequest(requestId: string, accept: boolean) {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("respond_social_friend_request", {
    request_id_input: requestId,
    accept_input: accept
  });

  if (error) {
    throw socialError(error, "Could not update the friend request.");
  }

  return data;
}

export async function cancelSocialFriendRequest(requestId: string) {
  const { client } = await authenticatedClient();
  const { error } = await client.rpc("cancel_social_friend_request", {
    request_id_input: requestId
  });

  if (error) {
    throw socialError(error, "Could not cancel the friend request.");
  }
}

export async function listSocialFriendRequests(): Promise<SocialFriendRequest[]> {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("list_social_friend_requests");

  if (error) {
    throw socialError(error, "Could not load friend requests.");
  }

  return ((data ?? []) as RequestRow[]).map((row) => ({
    requestId: row.request_id,
    direction: row.direction,
    status: row.status,
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    sunSign: row.sun_sign ?? undefined,
    createdAt: row.created_at
  }));
}

export async function listSocialNotifications(): Promise<SocialNotification[]> {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("list_social_notifications");

  if (error) {
    throw socialError(error, "Could not load friend updates.");
  }

  return ((data ?? []) as NotificationRow[]).map((row) => ({
    notificationId: row.notification_id,
    type: row.notification_type,
    actorUserId: row.actor_user_id,
    actorHandle: row.actor_handle,
    actorDisplayName: row.actor_display_name,
    actorAvatarUrl: row.actor_avatar_url ?? undefined,
    friendshipId: row.friendship_id ?? undefined,
    createdAt: row.created_at
  }));
}

export async function dismissSocialNotification(notificationId: string) {
  const { client } = await authenticatedClient();
  const { error } = await client.rpc("dismiss_social_notification", {
    notification_id_input: notificationId
  });

  if (error) {
    throw socialError(error, "Could not dismiss this update.");
  }
}

export async function createSocialInvitation(
  contactKind: "email" | "phone",
  contact: string
): Promise<SocialInvitation> {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("create_social_invitation", {
    contact_kind_input: contactKind,
    contact_input: contact
  });

  if (error) {
    throw socialError(error, "Could not create the invitation.");
  }

  const row = (data as InvitationRow[] | null)?.[0];

  if (!row) {
    throw new Error("Could not create the invitation.");
  }

  return {
    invitationId: row.invitation_id,
    token: row.invitation_token,
    expiresAt: row.expires_at
  };
}

export async function createSocialShareInvitation(): Promise<SocialInvitation> {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("create_social_share_invitation");

  if (error) {
    throw socialError(error, "Could not create the invite link.");
  }

  const row = (data as InvitationRow[] | null)?.[0];

  if (!row) {
    throw new Error("Could not create the invite link.");
  }

  return {
    invitationId: row.invitation_id,
    token: row.invitation_token,
    expiresAt: row.expires_at
  };
}

export async function listSocialInvitations(): Promise<SocialInvitationSummary[]> {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("list_social_invitations");

  if (error) {
    throw socialError(error, "Could not load your invitations.");
  }

  return ((data ?? []) as InvitationSummaryRow[]).map((row) => ({
    invitationId: row.invitation_id,
    contactKind: row.contact_kind,
    contactHint: row.contact_hint,
    status: row.invitation_status,
    createdAt: row.created_at,
    expiresAt: row.expires_at
  }));
}

export async function cancelSocialInvitation(invitationId: string) {
  const { client } = await authenticatedClient();
  const { error } = await client.rpc("cancel_social_invitation", {
    invitation_id_input: invitationId
  });

  if (error) {
    throw socialError(error, "Could not cancel this invitation.");
  }
}

export function socialInvitationUrl(token: string) {
  const url = new URL(window.location.href);
  url.pathname = `/i/${encodeURIComponent(token.trim())}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function captureSocialInvitationFromUrl() {
  const url = new URL(window.location.href);
  const pathToken = url.pathname.match(/^\/i\/([^/]+)\/?$/)?.[1];
  const token = (
    url.searchParams.get("socialInvite")?.trim()
    || (pathToken ? decodeURIComponent(pathToken).trim() : "")
  );

  if (!token) {
    return false;
  }

  window.sessionStorage.setItem(pendingSocialInvitationKey, token);
  window.localStorage.removeItem(pendingSocialInvitationKey);
  url.pathname = "/";
  url.searchParams.delete("socialInvite");
  url.hash = "friends?tab=circle";
  window.history.replaceState(window.history.state, "", url);
  return true;
}

export async function previewPendingSocialInvitation(): Promise<SocialInvitationPreview | null> {
  const token = pendingInvitationToken();

  if (!token) {
    return null;
  }

  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("preview_social_invitation", {
    invitation_token_input: token
  });

  if (error) {
    throw socialError(error, "Could not open this invitation.");
  }

  const row = (data as InvitationPreviewRow[] | null)?.[0];

  if (!row) {
    return null;
  }

  return {
    invitationId: row.invitation_id,
    contactKind: row.contact_kind,
    inviterUserId: row.inviter_user_id,
    inviterHandle: row.inviter_handle,
    inviterDisplayName: row.inviter_display_name,
    inviterAvatarUrl: row.inviter_avatar_url ?? undefined,
    expiresAt: row.expires_at
  };
}

export async function declinePendingSocialInvitation() {
  const token = pendingInvitationToken();

  if (!token) {
    return;
  }

  const { client } = await authenticatedClient();
  const { error } = await client.rpc("decline_social_invitation", {
    invitation_token_input: token
  });

  if (error) {
    throw socialError(error, "Could not decline this invitation.");
  }

  clearPendingSocialInvitation();
}

export async function claimPendingSocialInvitation() {
  const token = pendingInvitationToken();

  if (!token) {
    return null;
  }

  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("claim_social_invitation", {
    invitation_token_input: token
  });

  if (error) {
    throw socialError(error, "Could not accept the invitation.");
  }

  clearPendingSocialInvitation();
  return (data as Array<{
    invitation_id: string;
    request_id: string | null;
    request_status: "pending" | "friends";
  }> | null)?.[0] ?? null;
}

export function subscribeToSocialChanges(onChange: () => void) {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void authenticatedClient()
    .then(({ client, user }) => {
      if (cancelled) {
        return;
      }

      const channel = client
        .channel(`social-friends:${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "social_friend_requests" },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "social_friendships" },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "social_notifications" },
          onChange
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "social_invitations" },
          onChange
        )
        .subscribe();

      unsubscribe = () => {
        void client.removeChannel(channel);
      };

      if (cancelled) {
        unsubscribe();
      }
    })
    .catch(() => {
      // Focus refresh remains the recovery path when Realtime is unavailable.
    });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

export async function listSocialFriends(): Promise<ConnectedSocialFriend[]> {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("list_social_friends");

  if (error) {
    throw socialError(error, "Could not load friends.");
  }

  return ((data ?? []) as FriendRow[]).map((row) => ({
    friendshipId: row.friendship_id,
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    natalChart: row.natal_chart,
    viewerSharesChart: row.viewer_shares_chart !== false,
    friendSharesChart: row.friend_shares_chart !== false,
    acceptedAt: row.accepted_at
  }));
}

export async function setSocialFriendChartSharing(friendshipId: string, share: boolean) {
  const { client } = await authenticatedClient();
  const { error } = await client.rpc("set_social_friend_chart_sharing", {
    friendship_id_input: friendshipId,
    share_input: share
  });

  if (error) {
    throw socialError(error, "Could not update chart sharing for this friend.");
  }
}

export async function removeSocialFriend(friendshipId: string) {
  const { client } = await authenticatedClient();
  const { error } = await client.rpc("remove_social_friend", {
    friendship_id_input: friendshipId
  });

  if (error) {
    throw socialError(error, "Could not remove this friend.");
  }
}

export async function blockSocialUser(userId: string) {
  const { client } = await authenticatedClient();
  const { error } = await client.rpc("block_social_user", {
    target_user_id_input: userId
  });

  if (error) {
    throw socialError(error, "Could not block this account.");
  }
}

export async function unblockSocialUser(userId: string) {
  const { client } = await authenticatedClient();
  const { error } = await client.rpc("unblock_social_user", {
    target_user_id_input: userId
  });

  if (error) {
    throw socialError(error, "Could not unblock this account.");
  }
}

export async function listSocialBlocks(): Promise<SocialBlock[]> {
  const { client } = await authenticatedClient();
  const { data, error } = await client.rpc("list_social_blocks");

  if (error) {
    throw socialError(error, "Could not load blocked accounts.");
  }

  return ((data ?? []) as BlockRow[]).map((row) => ({
    userId: row.user_id,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? undefined,
    blockedAt: row.blocked_at
  }));
}

export async function exportSocialAccountBundle() {
  const [profile, requests, friends, blocks] = await Promise.all([
    loadOwnSocialProfile(),
    listSocialFriendRequests(),
    listSocialFriends(),
    listSocialBlocks()
  ]);

  return {
    profile,
    requests,
    friends,
    blocks
  };
}

export function socialFriendChartId(userId: string) {
  return `social:${userId}`;
}

export function socialFriendToChart(friend: ConnectedSocialFriend): ManualChart {
  const now = friend.acceptedAt || new Date().toISOString();

  return {
    id: socialFriendChartId(friend.userId),
    ownerUserId: friend.userId,
    claimedByUserId: friend.userId,
    chartType: "person",
    displayName: friend.displayName,
    firstName: friend.displayName.split(/\s+/)[0] || friend.displayName,
    lastName: null,
    pronouns: "name_only",
    relationshipType: "friend",
    birthDate: "",
    birthTime: "12:00",
    birthTimeUnknown: false,
    birthPlace: "Private birth details",
    birthLocation: {
      label: "Private birth location",
      latitude: 0,
      longitude: 0
    },
    natalChart: friend.natalChart,
    notes: `@${friend.handle}`,
    createdAt: now,
    updatedAt: now,
    syncStatus: "synced",
    syncError: null,
    lastSyncedAt: now
  };
}

export function isSocialFriendChart(chart: ManualChart | null | undefined) {
  return Boolean(chart?.id.startsWith("social:"));
}
