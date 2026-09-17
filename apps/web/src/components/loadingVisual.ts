export const LOADING_VISUAL_STORAGE_KEY = "tldrastro:loadingVisual";
export type LoadingVisual = "orbs" | "artwork";

/** Active reader loader. The rotating PNGs remain an opt-in sunset option. */
export const DEFAULT_LOADING_VISUAL: LoadingVisual = "orbs";

export function readLoadingVisual(): LoadingVisual {
  try {
    return window.localStorage.getItem(LOADING_VISUAL_STORAGE_KEY) === "artwork" ? "artwork" : DEFAULT_LOADING_VISUAL;
  } catch {
    return DEFAULT_LOADING_VISUAL;
  }
}
