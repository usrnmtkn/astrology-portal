import { clearSharedGeneratedContentCache } from "./sharedGeneratedContentCache";
import { clearPlanetTopicVocabularyCache } from "./planetTopicVocabulary";
import { clearNatalCardTaglineCache } from "./natalPlacementTaglines";

export const contentUpdateStorageKey = "tldrastro:content-update";
export const contentUpdateEvent = "tldrastro:content-update";
const contentUpdateChannelName = "tldrastro-content-updates";

export type ContentUpdateNotice = {
  contentKey: string;
  published: boolean;
  updatedAt: string;
};

function readNotice(value: string | null): ContentUpdateNotice | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ContentUpdateNotice>;
    if (typeof parsed.contentKey !== "string" || typeof parsed.updatedAt !== "string") return null;
    return {
      contentKey: parsed.contentKey,
      published: parsed.published === true,
      updatedAt: parsed.updatedAt
    };
  } catch {
    return null;
  }
}

export function announceContentUpdate(notice: ContentUpdateNotice) {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(notice);
  try {
    window.localStorage.setItem(contentUpdateStorageKey, serialized);
  } catch {
    // Broadcast and the same-document event still provide refresh behavior.
  }
  window.dispatchEvent(new CustomEvent<ContentUpdateNotice>(contentUpdateEvent, { detail: notice }));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(contentUpdateChannelName);
    channel.postMessage(notice);
    channel.close();
  }
}

export function subscribeToContentUpdates(listener: (notice: ContentUpdateNotice) => void) {
  if (typeof window === "undefined") return () => undefined;
  const notify = (notice: ContentUpdateNotice) => {
    clearSharedGeneratedContentCache();
    clearPlanetTopicVocabularyCache();
    clearNatalCardTaglineCache();
    listener(notice);
  };
  const handleCustom = (event: Event) => {
    const notice = (event as CustomEvent<ContentUpdateNotice>).detail;
    if (notice) notify(notice);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== contentUpdateStorageKey) return;
    const notice = readNotice(event.newValue);
    if (notice) notify(notice);
  };
  const channel = typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(contentUpdateChannelName)
    : null;
  const handleChannel = (event: MessageEvent<ContentUpdateNotice>) => {
    if (event.data) notify(event.data);
  };

  window.addEventListener(contentUpdateEvent, handleCustom);
  window.addEventListener("storage", handleStorage);
  channel?.addEventListener("message", handleChannel);

  return () => {
    window.removeEventListener(contentUpdateEvent, handleCustom);
    window.removeEventListener("storage", handleStorage);
    channel?.removeEventListener("message", handleChannel);
    channel?.close();
  };
}

