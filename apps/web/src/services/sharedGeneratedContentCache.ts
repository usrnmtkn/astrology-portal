import type {
  GeneratedContentPreviewMode,
  LiveGeneratedContent
} from "./generatedContent";

export type SharedGeneratedContentSurface = "natal" | "relationship";
export type SharedGeneratedContentMap = Map<string, LiveGeneratedContent>;

export type SharedGeneratedContentRequest = {
  surface: SharedGeneratedContentSurface;
  targetDate: string;
  previewMode: GeneratedContentPreviewMode;
};

const maximumSharedEntries = 12;
const sharedContentCache = new Map<string, Promise<SharedGeneratedContentMap>>();

export function sharedGeneratedContentCacheKey({
  surface,
  targetDate,
  previewMode
}: SharedGeneratedContentRequest) {
  return `${surface}:${targetDate}:${previewMode}`;
}

export function loadSharedGeneratedContent(
  request: SharedGeneratedContentRequest,
  load: () => Promise<SharedGeneratedContentMap>
) {
  const key = sharedGeneratedContentCacheKey(request);
  const cached = sharedContentCache.get(key);

  if (cached) {
    return cached;
  }

  const pending = load().catch((error) => {
    if (sharedContentCache.get(key) === pending) {
      sharedContentCache.delete(key);
    }
    throw error;
  });

  sharedContentCache.set(key, pending);
  while (sharedContentCache.size > maximumSharedEntries) {
    const oldestKey = sharedContentCache.keys().next().value;

    if (!oldestKey) break;
    sharedContentCache.delete(oldestKey);
  }

  return pending;
}

export function clearSharedGeneratedContentCache() {
  sharedContentCache.clear();
}
