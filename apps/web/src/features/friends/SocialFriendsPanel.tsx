import { MoreHorizontal, Search, X } from "lucide-react";
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
import {
  cancelSocialFriendRequest,
  listSocialFriendRequests,
  listSocialFriends,
  loadOwnSocialProfile,
  removeSocialFriend,
  respondToSocialFriendRequest,
  searchSocialProfiles,
  sendSocialFriendRequest,
  subscribeToSocialChanges,
  type ConnectedSocialFriend,
  type SocialFriendRequest,
  type SocialLookupResult,
  type SocialProfile
} from "../../services/socialFriends";

type SocialFriendsPanelProps = {
  activeView: FriendsTopLevelView;
  chartContent: ReactNode;
  chartCount: number;
  friendTimingByUserId?: Record<string, string>;
  onAddChart: () => void;
  onFriendsChange: (friends: ConnectedSocialFriend[]) => void;
  onOpenFriend: (friend: ConnectedSocialFriend) => void;
  onPendingRequestCountChange?: (count: number) => void;
  onSelectView: (view: FriendsTopLevelView) => void;
};

type PendingRemoval = {
  friend: ConnectedSocialFriend;
  timeout: number;
};

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
  friendTimingByUserId = {},
  onAddChart,
  onFriendsChange,
  onOpenFriend,
  onPendingRequestCountChange,
  onSelectView
}: SocialFriendsPanelProps) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupResults, setLookupResults] = useState<SocialLookupResult[]>([]);
  const [requests, setRequests] = useState<SocialFriendRequest[]>([]);
  const [friends, setFriends] = useState<ConnectedSocialFriend[]>([]);
  const [friendToRemove, setFriendToRemove] = useState<ConnectedSocialFriend | null>(null);
  const [removedToastFriend, setRemovedToastFriend] = useState<ConnectedSocialFriend | null>(null);
  const [openFriendMenuId, setOpenFriendMenuId] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [searchState, setSearchState] = useState<"idle" | "loading">("idle");
  const [showSearchSkeleton, setShowSearchSkeleton] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [requestUndoUntil, setRequestUndoUntil] = useState<Record<string, number>>({});
  const searchSequence = useRef(0);
  const pendingRemovalRef = useRef<PendingRemoval | null>(null);
  const friendsRef = useRef<ConnectedSocialFriend[]>([]);

  const incomingRequests = useMemo(
    () => requests.filter((request) => request.direction === "incoming"),
    [requests]
  );
  const outgoingRequests = useMemo(
    () => requests.filter((request) => request.direction === "outgoing"),
    [requests]
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
    const [nextProfile, nextRequests, loadedFriends] = await Promise.all([
      loadOwnSocialProfile(),
      listSocialFriendRequests(),
      listSocialFriends()
    ]);
    const pendingRemoval = pendingRemovalRef.current?.friend.userId;
    const nextFriends = pendingRemoval
      ? loadedFriends.filter((friend) => friend.userId !== pendingRemoval)
      : loadedFriends;

    setProfile(nextProfile);
    setRequests(nextRequests);
    publishFriends(nextFriends);
    onPendingRequestCountChange?.(
      nextRequests.filter((request) => request.direction === "incoming").length
    );
  }, [onPendingRequestCountChange, publishFriends]);

  useEffect(() => {
    let cancelled = false;

    refreshSocialData()
      .then(() => {
        if (!cancelled) {
          setAvailable(true);
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
            <button type="button" role="menuitem" onClick={() => onOpenFriend(friend)}>
              View chart
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
    const thirdLine = result.relationshipStatus === "request_sent"
      ? "Request sent · they will see it next visit"
      : bigThree
        ? `☉ ${bigThree.sun ?? "pending"} · ☽ ${bigThree.moon ?? "pending"} · ↑ ${bigThree.rising ?? "pending"}`
        : publicSunLine(result.sunSign);

    return (
      <div
        className={`friends-person-row${index === activeResultIndex ? " is-keyboard-active" : ""}`}
        id={`friend-result-${result.userId}`}
        key={result.userId}
        role="option"
        aria-selected={index === activeResultIndex}
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
              {undoAvailable && (result.requestId || outgoingRequest) && (
                <button
                  className="friends-row-text-action"
                  type="button"
                  disabled={actionPending}
                  onClick={() => void cancelRequest({
                    requestId: result.requestId ?? outgoingRequest!.requestId,
                    userId: result.userId
                  })}
                >
                  Undo
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
            </>
          )}
          {result.relationshipStatus === "friends" && connectedFriend && (
            <>
              <button
                className="friends-row-text-action"
                type="button"
                onClick={() => onOpenFriend(connectedFriend)}
              >
                View chart
              </button>
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
          <span className="friends-unified-tabs">
            <button className={activeView === "circle" ? "active" : ""} type="button" disabled>
              Circle · 0
            </button>
            <button className={activeView === "charts" ? "active" : ""} type="button" disabled>
              Charts · {chartCount}
            </button>
            <button className={activeView === "requests" ? "active" : ""} type="button" disabled>
              Requests
            </button>
          </span>
        </div>
        <div className="friends-unified-content">
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
        <div className="friends-unified-empty">
          <h2>Friends are unavailable.</h2>
          <p>Sign in and finish setting up your profile to use social friends.</p>
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
            aria-activedescendant={
              queryIsSearchable && lookupResults[activeResultIndex]
                ? `friend-result-${lookupResults[activeResultIndex].userId}`
                : undefined
            }
          />
          <span className="friends-search-private-hint">Private profiles stay hidden</span>
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

        <div className={`friends-unified-tab-row${queryIsActive ? " is-searching" : ""}`} role="tablist" aria-label="Friends views">
          <span className="friends-unified-tabs">
            <button
              className={activeView === "circle" && !queryIsActive ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeView === "circle" && !queryIsActive}
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
              onClick={() => {
                setSearchQuery("");
                onSelectView("charts");
              }}
            >
              Charts · {chartCount}
            </button>
            <button
              className={activeView === "requests" && !queryIsActive ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeView === "requests" && !queryIsActive}
              onClick={() => {
                setSearchQuery("");
                onSelectView("requests");
              }}
            >
              Requests
              {incomingRequests.length > 0 && (
                <span className="friends-tab-count" aria-label={`${incomingRequests.length} pending`}>
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </span>
          {activeView === "charts" && !queryIsActive && (
            <button className="friends-add-chart-action" type="button" onClick={onAddChart}>
              Add a chart
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
                <div className="friends-person-list" role="listbox" aria-label="Friend search results">
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
                {friends.map((friend) => (
                  <div className="friends-person-row" key={friend.friendshipId}>
                    <ProfileAvatar avatarUrl={friend.avatarUrl} email="" name={friend.displayName} />
                    <span className="friends-person-copy">
                      <span className="friends-person-identity">
                        <strong>{friend.displayName}</strong>
                        <small>@{friend.handle}</small>
                      </span>
                      <small className="friends-person-third-line">
                        {friendTimingByUserId[friend.userId] || "Current timing is being calculated."}
                      </small>
                    </span>
                    <span className="friends-person-actions">
                      <button
                        className="friends-row-text-action"
                        type="button"
                        onClick={() => onOpenFriend(friend)}
                      >
                        View chart
                      </button>
                      {friendMenu(friend)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="friends-unified-empty">
                <h2>Nobody here yet.</h2>
                <p>Search a name or handle to send a request.</p>
              </div>
            )
          ) : activeView === "charts" ? (
            chartContent
          ) : incomingRequests.length > 0 ? (
            <div className="friends-person-list" aria-label="Friend requests">
              {incomingRequests.map((request) => (
                <div className="friends-person-row" key={request.requestId}>
                  <ProfileAvatar avatarUrl={request.avatarUrl} email="" name={request.displayName} />
                  <span className="friends-person-copy">
                    <span className="friends-person-identity">
                      <strong>{request.displayName}</strong>
                      <small>@{request.handle}</small>
                    </span>
                    <small className="friends-person-third-line">{publicSunLine(request.sunSign)}</small>
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
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="friends-unified-empty">
              <h2>No requests.</h2>
              <p>New requests will appear here.</p>
            </div>
          )}
        </div>
      </section>

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
    </>
  );
}
