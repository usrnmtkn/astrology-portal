export const liveOmittedSectionsStorageKey = "tldrastro:content-review:live-omitted-sections:v1";
export const liveOmittedSectionsEvent = "tldrastro:content-review:live-omitted-sections";

const queueVersion = 1;
const maximumQueueSize = 250;

export type ConditionalSectionReviewFlag = {
  id: "conditional-section-omitted";
  status: "needs_review";
  sectionId: string;
  omittedContentKey: string;
  fallbackContentKey: string | null;
  reason: "missing-or-ineligible";
};

export type LiveOmittedSectionSurface = "you-daily" | "weekly-horoscope";

export type LiveOmittedSectionContext = {
  surface: LiveOmittedSectionSurface;
  headline: string;
  eventDate: string;
  eventKind?: string;
  sign?: string;
  risingSign?: string;
  timeZone?: string;
};

export type LiveOmittedSectionReviewItem = ConditionalSectionReviewFlag & LiveOmittedSectionContext & {
  queueId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
};

type StoredQueue = {
  version: typeof queueVersion;
  items: LiveOmittedSectionReviewItem[];
};

export type ReviewQueueStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): ReviewQueueStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isReviewFlag(value: unknown): value is ConditionalSectionReviewFlag {
  if (!value || typeof value !== "object") return false;
  const flag = value as Partial<ConditionalSectionReviewFlag>;
  return flag.id === "conditional-section-omitted"
    && flag.status === "needs_review"
    && typeof flag.sectionId === "string"
    && typeof flag.omittedContentKey === "string"
    && (typeof flag.fallbackContentKey === "string" || flag.fallbackContentKey === null)
    && flag.reason === "missing-or-ineligible";
}

function isQueueItem(value: unknown): value is LiveOmittedSectionReviewItem {
  if (!isReviewFlag(value)) return false;
  const item = value as Partial<LiveOmittedSectionReviewItem>;
  return typeof item.queueId === "string"
    && (item.surface === "you-daily" || item.surface === "weekly-horoscope")
    && typeof item.headline === "string"
    && typeof item.eventDate === "string"
    && typeof item.firstSeenAt === "string"
    && typeof item.lastSeenAt === "string"
    && typeof item.occurrenceCount === "number"
    && Number.isFinite(item.occurrenceCount)
    && item.occurrenceCount >= 1;
}

function parseQueue(raw: string | null): StoredQueue {
  if (!raw) return { version: queueVersion, items: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredQueue>;
    if (parsed.version !== queueVersion || !Array.isArray(parsed.items)) {
      return { version: queueVersion, items: [] };
    }
    return {
      version: queueVersion,
      items: parsed.items.filter(isQueueItem).slice(0, maximumQueueSize)
    };
  } catch {
    return { version: queueVersion, items: [] };
  }
}

function queueIdFor(flag: ConditionalSectionReviewFlag, context: LiveOmittedSectionContext) {
  return [
    context.surface,
    context.eventDate,
    context.risingSign ?? "unknown-rising",
    flag.sectionId,
    flag.omittedContentKey
  ].join("|");
}

export function readLiveOmittedSectionQueue(
  storage: ReviewQueueStorage | null = browserStorage()
): LiveOmittedSectionReviewItem[] {
  if (!storage) return [];
  try {
    return parseQueue(storage.getItem(liveOmittedSectionsStorageKey)).items
      .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt));
  } catch {
    return [];
  }
}

export function recordLiveOmittedSections(
  flags: readonly unknown[] | undefined,
  context: LiveOmittedSectionContext,
  options: { storage?: ReviewQueueStorage | null; now?: Date } = {}
): LiveOmittedSectionReviewItem[] {
  const eligibleFlags = (flags ?? []).filter(isReviewFlag);
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  if (eligibleFlags.length === 0 || !storage) return readLiveOmittedSectionQueue(storage);

  const timestamp = (options.now ?? new Date()).toISOString();
  const currentItems = readLiveOmittedSectionQueue(storage);
  const byId = new Map(currentItems.map((item) => [item.queueId, item]));

  eligibleFlags.forEach((flag) => {
    const queueId = queueIdFor(flag, context);
    const existing = byId.get(queueId);
    byId.set(queueId, {
      ...flag,
      ...context,
      queueId,
      firstSeenAt: existing?.firstSeenAt ?? timestamp,
      lastSeenAt: timestamp,
      occurrenceCount: (existing?.occurrenceCount ?? 0) + 1
    });
  });

  const items = [...byId.values()]
    .sort((left, right) => right.lastSeenAt.localeCompare(left.lastSeenAt))
    .slice(0, maximumQueueSize);
  try {
    storage.setItem(liveOmittedSectionsStorageKey, JSON.stringify({ version: queueVersion, items } satisfies StoredQueue));
  } catch {
    return currentItems;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<LiveOmittedSectionReviewItem[]>(liveOmittedSectionsEvent, { detail: items }));
  }
  return items;
}

export function subscribeToLiveOmittedSectionQueue(
  listener: (items: LiveOmittedSectionReviewItem[]) => void
) {
  if (typeof window === "undefined") return () => undefined;
  const handleCustomEvent = (event: Event) => {
    const items = (event as CustomEvent<LiveOmittedSectionReviewItem[]>).detail;
    listener(Array.isArray(items) ? items.filter(isQueueItem) : readLiveOmittedSectionQueue());
  };
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === liveOmittedSectionsStorageKey) listener(readLiveOmittedSectionQueue());
  };
  window.addEventListener(liveOmittedSectionsEvent, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);
  return () => {
    window.removeEventListener(liveOmittedSectionsEvent, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
