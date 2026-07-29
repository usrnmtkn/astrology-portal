import { ChevronRight, MoreHorizontal, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react";
import type { FriendsTopLevelView } from "../../components/FriendsPageShell";
import { ModalPortal } from "../../components/ModalPortal";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { natalAspectPatternPillSummary } from "../../services/natalAspectPatterns";
import { ChartPatternPill } from "./ChartPatternPill";
import {
  blockSocialUser,
  cancelSocialFriendRequest,
  cancelSocialInvitation,
  createSocialShareInvitation,
  dismissSocialNotification,
  listSocialFriendRequests,
  listSocialFriends,
  listSocialInvitations,
  listSocialNotifications,
  loadOwnSocialProfile,
  removeSocialFriend,
  respondToSocialFriendRequest,
  searchSocialProfiles,
  sendSocialFriendRequest,
  setSocialFriendChartSharing,
  socialInvitationUrl,
  subscribeToSocialChanges,
  type ConnectedSocialFriend,
  type SocialFriendRequest,
  type SocialInvitation,
  type SocialInvitationSummary,
  type SocialLookupResult,
  type SocialNotification,
  type SocialProfile
} from "../../services/socialFriends";

type SocialFriendsPanelProps = {
  activeView: FriendsTopLevelView;
  chartContent: ReactNode;
  chartCount: number;
  onAddChart: () => void;
  onFriendsChange: (friends: ConnectedSocialFriend[]) => void;
  onOpenFriend: (friend: ConnectedSocialFriend) => void;
  onPendingRequestCountChange?: (count: number) => void;
  onSelectView: (view: FriendsTopLevelView, historyMode?: "push" | "replace") => void;
  showPatternPills: boolean;
};

type PendingRemoval = {
  friend: ConnectedSocialFriend;
  timeout: number;
};

type BlockableSocialPerson = {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl?: string;
};

function relativeSocialTime(value: string) {
  const elapsedSeconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1_000));

  if (elapsedSeconds < 60) {
    return "just now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);

  if (elapsedDays < 7) {
    return `${elapsedDays}d ago`;
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: new Date(value).getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  });
}

function invitationStatusLabel(invitation: SocialInvitationSummary) {
  if (invitation.status === "pending") {
    return `Sent ${relativeSocialTime(invitation.createdAt)}`;
  }

  return invitation.status[0].toUpperCase() + invitation.status.slice(1);
}

function levenshtein(firstInput: string, secondInput: string) {
  const first = firstInput.toLocaleLowerCase();
  const second = secondInput.toLocaleLowerCase();
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let row = 1; row <= first.length; row += 1) {
    const current = [row];

    for (let column = 1; column <= second.length; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost
      );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[second.length];
}

function highlightedName(name: string, query: string) {
  const normalizedQuery = query.trim().replace(/^@/, "").toLocaleLowerCase();
  const normalizedName = name.toLocaleLowerCase();
  const directIndex = normalizedName.indexOf(normalizedQuery);

  if (normalizedQuery && directIndex >= 0) {
    return (
      <>
        {name.slice(0, directIndex)}
        <mark>{name.slice(directIndex, directIndex + normalizedQuery.length)}</mark>
        {name.slice(directIndex + normalizedQuery.length)}
      </>
    );
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const tokenMatches = Array.from(name.matchAll(/\S+/g));
  const closestToken = tokenMatches.find((match) => {
    const nameToken = match[0].toLocaleLowerCase().replace(/[^\p{L}\p{N}_]/gu, "");

    return queryTokens.some((queryToken) => (
      nameToken.startsWith(queryToken)
      || queryToken.startsWith(nameToken)
      || levenshtein(nameToken, queryToken) <= 2
    ));
  });

  if (!closestToken || closestToken.index === undefined) {
    return name;
  }

  const start = closestToken.index;
  const end = start + closestToken[0].length;

  return (
    <>
      {name.slice(0, start)}
      <mark>{name.slice(start, end)}</mark>
      {name.slice(end)}
    </>
  );
}

function friendBigThree(friend: ConnectedSocialFriend) {
  const positions = friend.natalChart?.positions ?? [];
  const signFor = (planet: string) => positions.find((position) => position.planet === planet)?.sign;

  return {
    sun: signFor("Sun"),
    moon: signFor("Moon"),
    rising: friend.natalChart?.ascendant
  };
}

function publicSunLine(sunSign?: string) {
  return sunSign ? `☉ ${sunSign}` : "Sun sign pending";
}

export function SocialFriendsPanel({
  activeView,
  chartContent,
  chartCount,
  onAddChart,
  onFriendsChange,
  onOpenFriend,
  onPendingRequestCountChange,
  onSelectView,
  showPatternPills
}: SocialFriendsPanelProps) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<SocialLookupResult[]>([]);
  const [requests, setRequests] = useState<SocialFriendRequest[]>([]);
  const [friends, setFriends] = useState<ConnectedSocialFriend[]>([]);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [invitations, setInvitations] = useState<SocialInvitationSummary[]>([]);
  const [friendToRemove, setFriendToRemove] = useState<ConnectedSocialFriend | null>(null);
  const [friendToBlock, setFriendToBlock] = useState<BlockableSocialPerson | null>(null);
  const [friendToManage, setFriendToManage] = useState<ConnectedSocialFriend | null>(null);
  const [removedToastFriend, setRemovedToastFriend] = useState<ConnectedSocialFriend | null>(null);
  const [openFriendMenuId, setOpenFriendMenuId] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [sharingPending, setSharingPending] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<SocialInvitation | null>(null);
  const [invitePending, setInvitePending] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "loading">("idle");
  const [showSearchSkeleton, setShowSearchSkeleton] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [requestUndoUntil, setRequestUndoUntil] = useState<Record<string, number>>({});
  const searchSequence = useRef(0);
  const pendingRemovalRef = useRef<PendingRemoval | null>(null);
  const friendsRef = useRef<ConnectedSocialFriend[]>([]);
  const initialViewResolvedRef = useRef(false);
  const activeViewRef = useRef(activeView);
  const onSelectViewRef = useRef(onSelectView);

  activeViewRef.current = activeView;
  onSelectViewRef.current = onSelectView;

  const incomingRequests = useMemo(
    () => requests.filter((request) => request.direction === "incoming"),
    [requests]
  );
  const outgoingRequests = useMemo(
    () => requests.filter((request) => request.direction === "outgoing"),
    [requests]
  );
  const pendingInvitations = useMemo(
    () => invitations.filter((invitation) => invitation.status === "pending"),
    [invitations]
  );
  const requestActivityCount = (
    incomingRequests.length
    + outgoingRequests.length
    + pendingInvitations.length
  );
  const trimmedQuery = searchQuery.trim();
  const queryIsActive = trimmedQuery.length > 0;
  const queryIsSearchable = trimmedQuery.replace(/^@/, "").length >= 2;

  const publishFriends = useCallback((nextFriends: ConnectedSocialFriend[]) => {
    friendsRef.current = nextFriends;
    setFriends(nextFriends);
    onFriendsChange(nextFriends);
  }, [onFriendsChange]);

  const refreshSocialData = useCallback(async () => {
    const [nextProfile, nextRequests, loadedFriends, nextNotifications, nextInvitations] = await Promise.all([
      loadOwnSocialProfile(),
      listSocialFriendRequests(),
      listSocialFriends(),
      listSocialNotifications(),
      listSocialInvitations()
    ]);
    const pendingRemoval = pendingRemovalRef.current?.friend.userId;
    const nextFriends = pendingRemoval
      ? loadedFriends.filter((friend) => friend.userId !== pendingRemoval)
      : loadedFriends;

    setProfile(nextProfile);
    setRequests(nextRequests);
    setNotifications(nextNotifications);
    setInvitations(nextInvitations);
    publishFriends(nextFriends);
    onPendingRequestCountChange?.(
      nextRequests.filter((request) => request.direction === "incoming").length
    );

    return nextFriends;
  }, [onPendingRequestCountChange, publishFriends]);

  useEffect(() => {
    if (activeView === "requests" && requestActivityCount === 0 && available === true) {
      onSelectView("circle");
    }
  }, [activeView, available, onSelectView, requestActivityCount]);

  useEffect(() => {
    let cancelled = false;

    refreshSocialData()
      .then((nextFriends) => {
        if (!cancelled) {
          setAvailable(true);

          if (!initialViewResolvedRef.current) {
            initialViewResolvedRef.current = true;

            if (activeViewRef.current === "circle" && nextFriends.length === 0) {
              onSelectViewRef.current("charts", "replace");
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailable(false);
          publishFriends([]);
          onPendingRequestCountChange?.(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onPendingRequestCountChange, publishFriends, refreshSocialData]);

  useEffect(() => {
    let refreshTimer: number | undefined;

    const refreshOnFocus = () => {
      void refreshSocialData().catch(() => {
        // Keep the last authorized snapshot while the connection recovers.
      });
    };
    const unsubscribe = subscribeToSocialChanges(() => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(refreshOnFocus, 80);
    });

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearTimeout(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
      unsubscribe();
    };
  }, [refreshSocialData]);

  useEffect(() => {
    return () => {
      const pendingRemoval = pendingRemovalRef.current;

      if (pendingRemoval) {
        window.clearTimeout(pendingRemoval.timeout);
        void removeSocialFriend(pendingRemoval.friend.friendshipId);
      }
    };
  }, []);

  useEffect(() => {
    const normalizedQuery = trimmedQuery.replace(/\s+/g, " ");
    const sequence = searchSequence.current + 1;
    searchSequence.current = sequence;
    setSearchError("");
    setActiveResultIndex(0);

    if (!queryIsSearchable) {
      setSearchState("idle");
      setShowSearchSkeleton(false);
      setLookupResults([]);

      return;
    }

    setSearchState("loading");
    setShowSearchSkeleton(false);

    let skeletonTimer: number | undefined;
    const searchTimer = window.setTimeout(() => {
      skeletonTimer = window.setTimeout(() => {
        if (searchSequence.current === sequence) {
          setShowSearchSkeleton(true);
        }
      }, 250);
      void searchSocialProfiles(normalizedQuery)
        .then((results) => {
          if (searchSequence.current !== sequence) {
            return;
          }

          setLookupResults(results);
        })
        .catch((error) => {
          if (searchSequence.current !== sequence) {
            return;
          }

          setSearchError(error instanceof Error ? error.message : "Search is unavailable right now.");
        })
        .finally(() => {
          if (searchSequence.current === sequence) {
            setSearchState("idle");
            setShowSearchSkeleton(false);
          }
        });
    }, 180);

    return () => {
      window.clearTimeout(skeletonTimer);
      window.clearTimeout(searchTimer);
    };
  }, [queryIsActive, queryIsSearchable, trimmedQuery]);

  useEffect(() => {
    if (!openFriendMenuId) {
      return undefined;
    }

    const closeMenu = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Element && target.closest(".friends-person-menu, .friends-row-menu-trigger")) {
        return;
      }

      setOpenFriendMenuId(null);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFriendMenuId(null);
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openFriendMenuId]);

  async function addFriend(result: SocialLookupResult) {
    setActionPending(true);
    setSearchError("");

    try {
      const sent = await sendSocialFriendRequest(result.handle);
      const undoUntil = Date.now() + 10_000;

      setLookupResults((current) => current.map((candidate) => (
        candidate.userId === result.userId
          ? {
            ...candidate,
            relationshipStatus: "request_sent",
            requestId: sent?.request_id ?? candidate.requestId
          }
          : candidate
      )));
      setRequestUndoUntil((current) => ({ ...current, [result.userId]: undoUntil }));
      window.setTimeout(() => {
        setRequestUndoUntil((current) => {
          if (current[result.userId] !== undoUntil) {
            return current;
          }

          const next = { ...current };
          delete next[result.userId];
          return next;
        });
      }, 10_000);
      await refreshSocialData();
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not send the friend request.");
    } finally {
      setActionPending(false);
    }
  }

  async function cancelRequest({
    requestId,
    userId
  }: {
    requestId: string;
    userId: string;
  }) {
    setActionPending(true);

    try {
      await cancelSocialFriendRequest(requestId);
      setRequests((current) => current.filter((request) => request.requestId !== requestId));
      setLookupResults((current) => current.map((candidate) => (
        candidate.userId === userId
          ? { ...candidate, relationshipStatus: "none", requestId: undefined }
          : candidate
      )));
      setRequestUndoUntil((current) => {
        const next = { ...current };
        delete next[userId];
        return next;
      });
      await refreshSocialData();
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not cancel the friend request.");
    } finally {
      setActionPending(false);
    }
  }

  async function respond(request: SocialFriendRequest, accept: boolean) {
    setActionPending(true);

    try {
      await respondToSocialFriendRequest(request.requestId, accept);
      await refreshSocialData();
      setLookupResults((current) => current.map((candidate) => (
        candidate.userId === request.userId
          ? {
            ...candidate,
            relationshipStatus: accept ? "friends" : "none",
            requestId: undefined
          }
          : candidate
      )));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not update the friend request.");
    } finally {
      setActionPending(false);
    }
  }

  async function dismissNotification(notification: SocialNotification) {
    setActionPending(true);

    try {
      await dismissSocialNotification(notification.notificationId);
      setNotifications((current) => current.filter(
        (candidate) => candidate.notificationId !== notification.notificationId
      ));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not dismiss this update.");
    } finally {
      setActionPending(false);
    }
  }

  async function updateChartSharing(friend: ConnectedSocialFriend, share: boolean) {
    setSharingPending(true);

    try {
      await setSocialFriendChartSharing(friend.friendshipId, share);
      const nextFriend = { ...friend, viewerSharesChart: share };
      publishFriends(friendsRef.current.map((candidate) => (
        candidate.friendshipId === friend.friendshipId ? nextFriend : candidate
      )));
      setFriendToManage(nextFriend);
      await refreshSocialData();
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not update chart sharing.");
    } finally {
      setSharingPending(false);
    }
  }

  async function confirmBlockFriend(friend: BlockableSocialPerson) {
    setActionPending(true);

    try {
      await blockSocialUser(friend.userId);
      setFriendToBlock(null);
      setOpenFriendMenuId(null);
      setLookupResults((current) => current.filter((candidate) => candidate.userId !== friend.userId));
      await refreshSocialData();
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Could not block this account.");
    } finally {
      setActionPending(false);
    }
  }

  async function createInvitation() {
    setInvitePending(true);
    setInviteError("");
    setInviteCopied(false);

    try {
      const invitation = await createSocialShareInvitation();
      setCreatedInvitation(invitation);
      setInvitations(await listSocialInvitations());
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Could not create this invitation.");
    } finally {
      setInvitePending(false);
    }
  }

  async function cancelInvitation(invitation: SocialInvitationSummary) {
    setInvitePending(true);
    setInviteError("");
    setSearchError("");

    try {
      await cancelSocialInvitation(invitation.invitationId);
      if (createdInvitation?.invitationId === invitation.invitationId) {
        resetInvitationComposer();
      }
      setInvitations(await listSocialInvitations());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not cancel this invitation.";
      setInviteError(message);
      setSearchError(message);
    } finally {
      setInvitePending(false);
    }
  }

  async function copyInvitationLink() {
    if (!createdInvitation) {
      return;
    }

    try {
      await navigator.clipboard.writeText(socialInvitationUrl(createdInvitation.token));
      setInviteCopied(true);
    } catch {
      setInviteError("Copy is unavailable. Use the send button instead.");
    }
  }

  async function shareInvitationLink() {
    if (!createdInvitation) {
      return;
    }

    const url = socialInvitationUrl(createdInvitation.token);

    if (!navigator.share) {
      await copyInvitationLink();
      return;
    }

    try {
      await navigator.share({
        title: "Join my circle on TLDR Astro",
        text: "I invited you to connect with me on TLDR Astro.",
        url
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setInviteError("Sharing is unavailable. Copy the private link instead.");
    }
  }

  function resetInvitationComposer() {
    setCreatedInvitation(null);
    setInviteError("");
    setInviteCopied(false);
  }

  function commitPendingRemoval(friend: ConnectedSocialFriend) {
    if (pendingRemovalRef.current?.friend.userId !== friend.userId) {
      return;
    }

    pendingRemovalRef.current = null;
    setRemovedToastFriend(null);
    void removeSocialFriend(friend.friendshipId)
      .then(refreshSocialData)
      .catch(() => {
        publishFriends(
          [...friendsRef.current.filter((candidate) => candidate.userId !== friend.userId), friend]
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
        );
      });
  }

  function confirmRemoveFriend(friend: ConnectedSocialFriend) {
    const previousPending = pendingRemovalRef.current;

    if (previousPending) {
      window.clearTimeout(previousPending.timeout);
      void removeSocialFriend(previousPending.friend.friendshipId);
    }

    const remainingFriends = friends.filter((candidate) => candidate.userId !== friend.userId);
    const timeout = window.setTimeout(() => commitPendingRemoval(friend), 6_000);

    pendingRemovalRef.current = { friend, timeout };
    publishFriends(remainingFriends);
    setLookupResults((current) => current.map((candidate) => (
      candidate.userId === friend.userId
        ? { ...candidate, relationshipStatus: "none" }
        : candidate
    )));
    setFriendToRemove(null);
    setOpenFriendMenuId(null);
    setRemovedToastFriend(friend);
  }

  function undoRemoveFriend() {
    const pendingRemoval = pendingRemovalRef.current;

    if (!pendingRemoval) {
      return;
    }

    window.clearTimeout(pendingRemoval.timeout);
    pendingRemovalRef.current = null;
    setRemovedToastFriend(null);
    const restoredFriends = [
      ...friendsRef.current.filter((friend) => friend.userId !== pendingRemoval.friend.userId),
      pendingRemoval.friend
    ]
      .sort((first, second) => first.displayName.localeCompare(second.displayName));

    publishFriends(restoredFriends);
    setLookupResults((current) => current.map((candidate) => (
      candidate.userId === pendingRemoval.friend.userId
        ? { ...candidate, relationshipStatus: "friends" }
        : candidate
    )));
  }

  function activateResult(result: SocialLookupResult) {
    const connectedFriend = friends.find((friend) => friend.userId === result.userId);
    const incomingRequest = incomingRequests.find((request) => request.userId === result.userId);

    if (result.relationshipStatus === "none") {
      void addFriend(result);
    } else if (result.relationshipStatus === "request_received" && incomingRequest) {
      void respond(incomingRequest, true);
    } else if (result.relationshipStatus === "friends" && connectedFriend) {
      onOpenFriend(connectedFriend);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchQuery("");
      return;
    }

    if (lookupResults.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((current) => Math.min(current + 1, lookupResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const activeResult = lookupResults[activeResultIndex] ?? lookupResults[0];

      if (activeResult) {
        activateResult(activeResult);
      }
    }
  }

  function friendMenu(friend: ConnectedSocialFriend) {
    const menuOpen = openFriendMenuId === friend.friendshipId;

    return (
      <span className="friends-row-menu-wrap">
        <button
          className="friends-row-menu-trigger"
          type="button"
          aria-label={`More options for ${friend.displayName}`}
          aria-expanded={menuOpen}
          onClick={() => setOpenFriendMenuId((current) => (
            current === friend.friendshipId ? null : friend.friendshipId
          ))}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
        {menuOpen && (
          <span className="friends-person-menu" role="menu" aria-label={`${friend.displayName} actions`}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenFriendMenuId(null);
                setFriendToManage(friend);
              }}
            >
              Chart privacy
            </button>
            <button
              className="friends-danger-action"
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenFriendMenuId(null);
                setFriendToRemove(friend);
              }}
            >
              Remove friend
            </button>
            <button
              className="friends-danger-action friends-last-resort-action"
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenFriendMenuId(null);
                setFriendToBlock(friend);
              }}
            >
              Block @{friend.handle}
            </button>
          </span>
        )}
      </span>
    );
  }

  function blockMenu(person: BlockableSocialPerson, menuId: string) {
    const menuOpen = openFriendMenuId === menuId;

    return (
      <span className="friends-row-menu-wrap">
        <button
          className="friends-row-menu-trigger"
          type="button"
          aria-label={`More options for ${person.displayName}`}
          aria-expanded={menuOpen}
          onClick={() => setOpenFriendMenuId((current) => (
            current === menuId ? null : menuId
          ))}
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
        {menuOpen && (
          <span className="friends-person-menu" role="menu" aria-label={`${person.displayName} actions`}>
            <button
              className="friends-danger-action"
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenFriendMenuId(null);
                setFriendToBlock(person);
              }}
            >
              Block @{person.handle}
            </button>
          </span>
        )}
      </span>
    );
  }

  function resultRow(result: SocialLookupResult, index: number) {
    const connectedFriend = friends.find((friend) => friend.userId === result.userId);
    const incomingRequest = incomingRequests.find((request) => request.userId === result.userId);
    const outgoingRequest = outgoingRequests.find((request) => request.userId === result.userId);
    const undoAvailable = Boolean(
      result.relationshipStatus === "request_sent"
      && requestUndoUntil[result.userId]
      && requestUndoUntil[result.userId] > Date.now()
    );
    const bigThree = connectedFriend ? friendBigThree(connectedFriend) : null;
    const connectedChartAvailable = Boolean(
      connectedFriend?.friendSharesChart && connectedFriend.natalChart
    );
    const thirdLine = result.relationshipStatus === "request_sent"
      ? `Request sent ${outgoingRequest ? relativeSocialTime(outgoingRequest.createdAt) : ""} · they will see it next visit`
      : result.relationshipStatus === "request_received" && incomingRequest
        ? `${publicSunLine(result.sunSign)} · requested ${relativeSocialTime(incomingRequest.createdAt)}`
      : bigThree
        ? `☉ ${bigThree.sun ?? "pending"} · ☽ ${bigThree.moon ?? "pending"} · ↑ ${bigThree.rising ?? "pending"}`
        : publicSunLine(result.sunSign);

    return (
      <div
        className={`friends-person-row${index === activeResultIndex ? " is-keyboard-active" : ""}${connectedChartAvailable ? " is-openable" : ""}`}
        id={`friend-result-${result.userId}`}
        key={result.userId}
        onClick={(event) => {
          if (
            connectedChartAvailable
            && connectedFriend
            && !(event.target instanceof Element && event.target.closest("button, a, [role='menu']"))
          ) {
            onOpenFriend(connectedFriend);
          }
        }}
      >
        <ProfileAvatar avatarUrl={result.avatarUrl} email="" name={result.displayName} />
        <span className="friends-person-copy">
          <span className="friends-person-identity">
            <strong>{highlightedName(result.displayName, trimmedQuery)}</strong>
            <small>@{result.handle}</small>
          </span>
          <small className="friends-person-third-line">{thirdLine}</small>
        </span>
        <span className="friends-person-actions">
          {result.relationshipStatus === "none" && (
            <button
              className={index === 0 ? "social-primary-button" : "social-secondary-button"}
              type="button"
              disabled={actionPending}
              onClick={() => void addFriend(result)}
            >
              Add friend
            </button>
          )}
          {result.relationshipStatus === "request_sent" && (
            <>
              <span className="friends-requested-label">Requested</span>
              {(result.requestId || outgoingRequest) && (
                <button
                  className="friends-row-text-action"
                  type="button"
                  disabled={actionPending}
                  onClick={() => void cancelRequest({
                    requestId: result.requestId ?? outgoingRequest!.requestId,
                    userId: result.userId
                  })}
                >
                  {undoAvailable ? "Undo" : "Cancel"}
                </button>
              )}
            </>
          )}
          {result.relationshipStatus === "request_received" && incomingRequest && (
            <>
              <button
                className="social-primary-button"
                type="button"
                disabled={actionPending}
                onClick={() => void respond(incomingRequest, true)}
              >
                Accept
              </button>
              <button
                className="social-secondary-button"
                type="button"
                disabled={actionPending}
                onClick={() => void respond(incomingRequest, false)}
              >
                Decline
              </button>
              {blockMenu(result, `lookup-request:${result.userId}`)}
            </>
          )}
          {result.relationshipStatus === "friends" && connectedFriend && (
            <>
              {connectedChartAvailable ? (
                <span className="friends-row-arrow" aria-hidden="true">
                  <ChevronRight size={18} />
                </span>
              ) : (
                <span className="friends-requested-label">
                  {connectedFriend.friendSharesChart ? "Chart pending" : "Chart paused"}
                </span>
              )}
              {friendMenu(connectedFriend)}
            </>
          )}
          {result.relationshipStatus === "self" && (
            <span className="friends-requested-label">You</span>
          )}
        </span>
      </div>
    );
  }

  if (available === null) {
    return (
      <section className="friends-unified-panel" aria-label="Social friends">
        <div className="friends-unified-search-row">
          <Search size={16} aria-hidden="true" />
          <span>Loading friends…</span>
        </div>
        <div className="friends-unified-tab-row" aria-label="Friends views">
          <span className="friends-unified-tabs" role="tablist" aria-label="Friends views">
            <button className={activeView === "circle" ? "active" : ""} type="button" disabled>
              Circle · 0
            </button>
            <button className={activeView === "charts" ? "active" : ""} type="button" disabled>
              Charts · {chartCount}
            </button>
          </span>
        </div>
        <div
          className="friends-unified-content"
          id={queryIsActive ? "friends-search-results" : `friends-${activeView}-panel`}
          role={queryIsActive ? "region" : "tabpanel"}
          aria-labelledby={queryIsActive ? undefined : `friends-${activeView}-tab`}
        >
          <div className="friends-search-skeleton" aria-label="Loading friends">
            {[0, 1].map((item) => (
              <span className="friends-search-skeleton-row" key={item}>
                <i />
                <span><i /><i /></span>
              </span>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!available || !profile?.handle) {
    return (
      <section className="friends-unified-panel" aria-label="Social friends">
        <div className="friends-unified-tab-row">
          <span className="friends-unified-tabs" role="tablist" aria-label="Friends views">
            <button
              className={activeView === "circle" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeView === "circle"}
              aria-controls="friends-circle-panel"
              id="friends-circle-tab"
              onClick={() => onSelectView("circle")}
            >
              Circle · 0
            </button>
            <button
              className={activeView === "charts" ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeView === "charts"}
              aria-controls="friends-charts-panel"
              id="friends-charts-tab"
              onClick={() => onSelectView("charts")}
            >
              Charts · {chartCount}
            </button>
          </span>
          {activeView === "charts" && chartContent && (
            <button className="friends-add-chart-action" type="button" onClick={onAddChart}>
              Add a chart
            </button>
          )}
        </div>
        <div
          className="friends-unified-content"
          id={`friends-${activeView}-panel`}
          role="tabpanel"
          aria-labelledby={`friends-${activeView}-tab`}
        >
          {activeView === "charts" && chartContent ? chartContent : (
            <div className="friends-unified-empty">
              <h2>Friends are unavailable.</h2>
              <p>Sign in and finish setting up your profile to use social friends.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="friends-unified-panel" aria-label="Social friends">
        <label className="friends-unified-search-row">
          <Search size={16} aria-hidden="true" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by name or @handle"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Search by name or handle"
          />
          {queryIsActive && (
            <button
              className="friends-search-clear"
              type="button"
              aria-label="Clear friend search"
              onClick={() => setSearchQuery("")}
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </label>

        <div className={`friends-unified-tab-row${queryIsActive ? " is-searching" : ""}`}>
          <span className="friends-unified-tabs" role="tablist" aria-label="Friends views">
            <button
              className={activeView === "circle" && !queryIsActive ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeView === "circle" && !queryIsActive}
              aria-controls="friends-circle-panel"
              id="friends-circle-tab"
              onClick={() => {
                setSearchQuery("");
                onSelectView("circle");
              }}
            >
              Circle · {friends.length}
            </button>
            <button
              className={activeView === "charts" && !queryIsActive ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeView === "charts" && !queryIsActive}
              aria-controls="friends-charts-panel"
              id="friends-charts-tab"
              onClick={() => {
                setSearchQuery("");
                onSelectView("charts");
              }}
            >
              Charts · {chartCount}
            </button>
            {requestActivityCount > 0 && (
              <button
                className={`friends-requests-tab${activeView === "requests" && !queryIsActive ? " active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeView === "requests" && !queryIsActive}
                aria-controls="friends-requests-panel"
                id="friends-requests-tab"
                onClick={() => {
                  setSearchQuery("");
                  onSelectView("requests");
                }}
              >
                Requests
                <span className="friends-tab-count" aria-label={`${requestActivityCount} pending`}>
                  {requestActivityCount}
                </span>
              </button>
            )}
          </span>
          {activeView === "charts" && !queryIsActive && (
            <button className="friends-add-chart-action" type="button" onClick={onAddChart}>
              Add a chart
            </button>
          )}
          {activeView === "circle" && !queryIsActive && friends.length > 0 && (
            <button
              className="friends-add-chart-action"
              type="button"
              onClick={() => {
                resetInvitationComposer();
                setInviteModalOpen(true);
              }}
            >
              Invite someone
            </button>
          )}
          {searchState === "loading" && queryIsSearchable && (
            <span className="friends-searching-label">Searching…</span>
          )}
        </div>

        <div className="friends-unified-content">
          {queryIsActive ? (
            <>
              {!queryIsSearchable && (
                <div className="friends-unified-empty">
                  <h2>Keep typing.</h2>
                  <p>Enter at least two characters to search.</p>
                </div>
              )}
              {queryIsSearchable && showSearchSkeleton && lookupResults.length === 0 && (
                <div className="friends-search-skeleton" aria-label="Searching for people">
                  {[0, 1, 2].map((item) => (
                    <span className="friends-search-skeleton-row" key={item}>
                      <i />
                      <span><i /><i /></span>
                    </span>
                  ))}
                </div>
              )}
              {queryIsSearchable && searchError && searchState === "idle" && (
                <div className="friends-unified-empty" role="status">
                  <h2>Search is unavailable.</h2>
                  <p>{searchError}</p>
                </div>
              )}
              {queryIsSearchable && !searchError && lookupResults.length > 0 && (
                <div className="friends-person-list" role="list" aria-label="Friend search results">
                  {lookupResults.map(resultRow)}
                </div>
              )}
              {queryIsSearchable
                && !searchError
                && searchState === "idle"
                && lookupResults.length === 0
                && (
                  <div className="friends-unified-empty" role="status">
                    <h2>No one found for “{trimmedQuery}”.</h2>
                    <p>Check the spelling, or try their exact @handle.</p>
                  </div>
                )}
            </>
          ) : activeView === "circle" ? (
            friends.length > 0 ? (
              <div className="friends-person-list" aria-label="Circle">
                {friends.map((friend) => {
                  const bigThree = friendBigThree(friend);
                  const chartAvailable = Boolean(friend.friendSharesChart && friend.natalChart);
                  const patternSummary = showPatternPills && chartAvailable
                    ? natalAspectPatternPillSummary(friend.natalChart)
                    : null;

                  return (
                    <div
                      className={`friends-person-row${chartAvailable ? " is-openable" : ""}`}
                      key={friend.friendshipId}
                      role={chartAvailable ? "link" : undefined}
                      tabIndex={chartAvailable ? 0 : undefined}
                      aria-label={chartAvailable ? `Open ${friend.displayName}'s chart` : undefined}
                      onClick={(event) => {
                        if (
                          chartAvailable
                          && !(event.target instanceof Element && event.target.closest("button, a, [role='menu']"))
                        ) {
                          onOpenFriend(friend);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          chartAvailable
                          && event.currentTarget === event.target
                          && (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          onOpenFriend(friend);
                        }
                      }}
                    >
                      <ProfileAvatar avatarUrl={friend.avatarUrl} email="" name={friend.displayName} />
                      <span className="friends-person-copy">
                        <span className="friends-person-identity">
                          <strong>{friend.displayName}</strong>
                          <small>@{friend.handle}</small>
                        </span>
                        <small className="friends-person-third-line">
                          <span className="friends-person-signatures">
                            ☉ {bigThree.sun ?? "pending"} · ☽ {bigThree.moon ?? "pending"} · ↑ {bigThree.rising ?? "pending"}
                          </span>
                          {patternSummary ? <ChartPatternPill summary={patternSummary} /> : null}
                        </small>
                      </span>
                      <span className="friends-person-actions">
                        {chartAvailable ? (
                          <span className="friends-row-arrow" aria-hidden="true">
                            <ChevronRight size={18} />
                          </span>
                        ) : (
                          <span className="friends-requested-label">
                            {friend.friendSharesChart ? "Chart pending" : "Chart paused"}
                          </span>
                        )}
                        {friendMenu(friend)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="friends-unified-empty">
                <h2>Nobody here yet.</h2>
                <p>Search a name or handle to send a request.</p>
                <button
                  className="social-primary-button"
                  type="button"
                  onClick={() => {
                    resetInvitationComposer();
                    setInviteModalOpen(true);
                  }}
                >
                  Invite someone
                </button>
              </div>
            )
          ) : activeView === "charts" ? (
            chartContent
          ) : requestActivityCount > 0 ? (
            <div className="friends-request-groups">
              {searchError && (
                <p className="friends-request-error" role="alert">{searchError}</p>
              )}
              {incomingRequests.length > 0 && (
                <section className="friends-request-group" aria-labelledby="friends-received-title">
                  <h2 id="friends-received-title">Received</h2>
                  <div className="friends-person-list" aria-label="Received friend requests">
                    {incomingRequests.map((request) => (
                      <div className="friends-person-row" key={request.requestId}>
                        <ProfileAvatar avatarUrl={request.avatarUrl} email="" name={request.displayName} />
                        <span className="friends-person-copy">
                          <span className="friends-person-identity">
                            <strong>{request.displayName}</strong>
                            <small>@{request.handle}</small>
                          </span>
                          <small className="friends-person-third-line">
                            {publicSunLine(request.sunSign)} · requested {relativeSocialTime(request.createdAt)}
                          </small>
                        </span>
                        <span className="friends-person-actions">
                          <button
                            className="social-primary-button"
                            type="button"
                            disabled={actionPending}
                            onClick={() => void respond(request, true)}
                          >
                            Accept
                          </button>
                          <button
                            className="social-secondary-button"
                            type="button"
                            disabled={actionPending}
                            onClick={() => void respond(request, false)}
                          >
                            Decline
                          </button>
                          {blockMenu(request, `received-request:${request.requestId}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(outgoingRequests.length > 0 || pendingInvitations.length > 0) && (
                <section className="friends-request-group" aria-labelledby="friends-pending-title">
                  <h2 id="friends-pending-title">Pending invites</h2>
                  <div className="friends-person-list" aria-label="Pending invitations">
                    {outgoingRequests.map((request) => (
                      <div className="friends-person-row" key={request.requestId}>
                        <ProfileAvatar avatarUrl={request.avatarUrl} email="" name={request.displayName} />
                        <span className="friends-person-copy">
                          <span className="friends-person-identity">
                            <strong>{request.displayName}</strong>
                            <small>@{request.handle}</small>
                          </span>
                          <small className="friends-person-third-line">
                            Friend request sent {relativeSocialTime(request.createdAt)}
                          </small>
                        </span>
                        <span className="friends-person-actions">
                          <span className="friends-requested-label">Requested</span>
                          <button
                            className="friends-row-text-action"
                            type="button"
                            disabled={actionPending}
                            onClick={() => void cancelRequest({
                              requestId: request.requestId,
                              userId: request.userId
                            })}
                          >
                            Cancel
                          </button>
                        </span>
                      </div>
                    ))}
                    {pendingInvitations.map((invitation) => (
                      <div className="friends-person-row" key={invitation.invitationId}>
                        <span className="friends-invite-contact-avatar" aria-hidden="true">
                          {invitation.contactKind === "email"
                            ? "@"
                            : invitation.contactKind === "phone"
                              ? "#"
                              : "↗"}
                        </span>
                        <span className="friends-person-copy">
                          <span className="friends-person-identity">
                            <strong>{invitation.contactHint}</strong>
                            <small>
                              {invitation.contactKind === "email"
                                ? "Email invite"
                                : invitation.contactKind === "phone"
                                  ? "Phone invite"
                                  : "Private invite link"}
                            </small>
                          </span>
                          <small className="friends-person-third-line">
                            Private link created {relativeSocialTime(invitation.createdAt)}
                          </small>
                        </span>
                        <span className="friends-person-actions">
                          <span className="friends-requested-label">Pending</span>
                          <button
                            className="friends-row-text-action friends-danger-action"
                            type="button"
                            disabled={invitePending}
                            onClick={() => void cancelInvitation(invitation)}
                          >
                            Cancel
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="friends-unified-empty">
              <h2>No requests.</h2>
              <p>New requests and pending invites will appear here.</p>
            </div>
          )}
        </div>
      </section>

      {friendToManage && (
        <ModalPortal
          closeOnBackdrop={!sharingPending}
          onClose={() => {
            if (!sharingPending) {
              setFriendToManage(null);
            }
          }}
          panelClassName="social-sharing-modal"
          titleId="friends-sharing-title"
          width="min(540px, calc(100vw - 32px))"
        >
          <button
            className="social-sharing-close"
            type="button"
            aria-label="Close chart privacy"
            disabled={sharingPending}
            onClick={() => setFriendToManage(null)}
          >
            <X size={18} aria-hidden="true" />
          </button>
          <div className="social-sharing-heading">
            <ProfileAvatar
              avatarUrl={friendToManage.avatarUrl}
              email=""
              name={friendToManage.displayName}
            />
            <div>
              <h2 id="friends-sharing-title">Chart privacy</h2>
              <p>{friendToManage.displayName} · @{friendToManage.handle}</p>
            </div>
          </div>
          <div className="social-sharing-details">
            <section className="social-sharing-control-row">
              <div>
                <h3>{friendToManage.displayName} can see your chart</h3>
                <p>Placements, transits, and your shared chart.</p>
              </div>
              <button
                className={`social-sharing-switch${friendToManage.viewerSharesChart ? " is-active" : ""}`}
                type="button"
                role="switch"
                aria-checked={friendToManage.viewerSharesChart}
                aria-label={`Share your chart with ${friendToManage.displayName}`}
                disabled={sharingPending}
                onClick={() => void updateChartSharing(
                  friendToManage,
                  !friendToManage.viewerSharesChart
                )}
              >
                <span aria-hidden="true" />
              </button>
            </section>
            <section className="social-sharing-readonly-row">
              <div>
                <h3>You can see {friendToManage.displayName}&apos;s chart</h3>
                <p>Their setting, not yours.</p>
              </div>
              <span className="social-sharing-state">
                {!friendToManage.friendSharesChart
                  ? "Paused"
                  : friendToManage.natalChart
                    ? "Shared"
                    : "Pending"}
              </span>
            </section>
          </div>
          <p className="social-sharing-note">
            Turning your side off keeps the friendship and tells them nothing. You can turn it back on whenever you want.
          </p>
          <div className="social-sharing-actions">
            <button
              className="social-primary-button"
              type="button"
              disabled={sharingPending}
              onClick={() => setFriendToManage(null)}
            >
              Done
            </button>
          </div>
        </ModalPortal>
      )}

      {friendToBlock && (
        <ModalPortal
          closeOnBackdrop={!actionPending}
          onClose={() => {
            if (!actionPending) {
              setFriendToBlock(null);
            }
          }}
          panelClassName="friends-remove-dialog"
          titleId="friends-block-title"
          width="min(460px, calc(100vw - 32px))"
        >
          <div className="friends-remove-identity">
            <ProfileAvatar avatarUrl={friendToBlock.avatarUrl} email="" name={friendToBlock.displayName} />
            <span>
              <h2 id="friends-block-title">Block {friendToBlock.displayName}?</h2>
              <small>@{friendToBlock.handle}</small>
            </span>
          </div>
          <p>
            You will be removed from each other&apos;s circle. They cannot find you,
            send a request, or view your chart. They are not notified.
          </p>
          <div className="friends-remove-actions">
            <button
              className="social-secondary-button"
              type="button"
              disabled={actionPending}
              onClick={() => setFriendToBlock(null)}
            >
              Cancel
            </button>
            <button
              className="friends-danger-button"
              type="button"
              disabled={actionPending}
              onClick={() => void confirmBlockFriend(friendToBlock)}
            >
              {actionPending ? "Blocking…" : "Block"}
            </button>
          </div>
        </ModalPortal>
      )}

      {inviteModalOpen && (
        <ModalPortal
          closeOnBackdrop={!invitePending}
          onClose={() => {
            if (!invitePending) {
              setInviteModalOpen(false);
            }
          }}
          panelClassName="friends-invite-dialog"
          titleId="friends-invite-title"
          width="min(560px, calc(100vw - 32px))"
        >
          <button
            className="social-sharing-close"
            type="button"
            aria-label="Close invitation"
            disabled={invitePending}
            onClick={() => setInviteModalOpen(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
          <div className="friends-invite-heading">
            <span className="eyebrow section-label">Invite a friend</span>
            <h2 id="friends-invite-title">Bring someone into your circle.</h2>
            <p>
              Create a private link and share it with one friend. After they
              join and accept, you can view each other&apos;s shared charts.
            </p>
          </div>

          {!createdInvitation ? (
            <form
              className="friends-invite-form"
              onSubmit={(event) => {
                event.preventDefault();
                void createInvitation();
              }}
            >
              <p className="friends-invite-link-note">
                The link expires in 30 days and works once. Anyone with the
                link can use it, so share it privately.
              </p>
              <button
                className="social-primary-button"
                type="submit"
                disabled={invitePending}
              >
                {invitePending ? "Creating…" : "Create invite link"}
              </button>
            </form>
          ) : (
            <div className="friends-invite-ready" role="status">
              <h3>Your invite link is ready.</h3>
              <p>
                Share it privately with one friend. It expires{" "}
                {new Date(createdInvitation.expiresAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric"
                })}.
              </p>
              <div className="friends-invite-send-actions">
                <button
                  className="social-primary-button"
                  type="button"
                  onClick={() => void shareInvitationLink()}
                >
                  Share link
                </button>
                <button
                  className="social-secondary-button"
                  type="button"
                  onClick={() => void copyInvitationLink()}
                >
                  {inviteCopied ? "Copied" : "Copy link"}
                </button>
                <button
                  className="friends-row-text-action"
                  type="button"
                  onClick={resetInvitationComposer}
                >
                  Invite someone else
                </button>
              </div>
            </div>
          )}

          {inviteError && <p className="friends-invite-error" role="alert">{inviteError}</p>}

          {invitations.length > 0 && (
            <section className="friends-invite-history" aria-labelledby="friends-invite-history-title">
              <h3 id="friends-invite-history-title">Recent invitations</h3>
              <div>
                {invitations.slice(0, 5).map((invitation) => (
                  <div className="friends-invite-history-row" key={invitation.invitationId}>
                    <span>
                      <strong>{invitation.contactHint}</strong>
                      <small>{invitationStatusLabel(invitation)}</small>
                    </span>
                    {invitation.status === "pending" && (
                      <button
                        className="friends-row-text-action friends-danger-action"
                        type="button"
                        disabled={invitePending}
                        onClick={() => void cancelInvitation(invitation)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </ModalPortal>
      )}

      {friendToRemove && (
        <ModalPortal
          closeOnBackdrop
          onClose={() => setFriendToRemove(null)}
          panelClassName="friends-remove-dialog"
          titleId="friends-remove-title"
          width="min(460px, calc(100vw - 32px))"
        >
          <div className="friends-remove-identity">
            <ProfileAvatar avatarUrl={friendToRemove.avatarUrl} email="" name={friendToRemove.displayName} />
            <span>
              <h2 id="friends-remove-title">Remove {friendToRemove.displayName}?</h2>
              <small>@{friendToRemove.handle}</small>
            </span>
          </div>
          <p>
            You will both lose access to each other&apos;s chart. They are not told.
            You can send a new request any time.
          </p>
          <div className="friends-remove-actions">
            <button className="social-secondary-button" type="button" onClick={() => setFriendToRemove(null)}>
              Cancel
            </button>
            <button className="friends-danger-button" type="button" onClick={() => confirmRemoveFriend(friendToRemove)}>
              Remove
            </button>
          </div>
        </ModalPortal>
      )}

      {removedToastFriend && (
        <div className="friends-toast" role="status">
          <span>{removedToastFriend.displayName} removed from your circle.</span>
          <button type="button" onClick={undoRemoveFriend}>Undo</button>
        </div>
      )}

      {!removedToastFriend && notifications[0] && (
        <div className="friends-toast friends-acceptance-toast" role="status">
          <ProfileAvatar
            avatarUrl={notifications[0].actorAvatarUrl}
            email=""
            name={notifications[0].actorDisplayName}
          />
          <span>
            <strong>{notifications[0].actorDisplayName}</strong> accepted your request{" "}
            {relativeSocialTime(notifications[0].createdAt)}.
          </span>
          {friends.find((friend) => friend.userId === notifications[0].actorUserId) && (
            <button
              type="button"
              onClick={() => onOpenFriend(
                friends.find((friend) => friend.userId === notifications[0].actorUserId)!
              )}
            >
              View chart
            </button>
          )}
          <button
            type="button"
            disabled={actionPending}
            onClick={() => void dismissNotification(notifications[0])}
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
