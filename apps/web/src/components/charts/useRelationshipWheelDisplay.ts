import { useSyncExternalStore } from "react";

const preferenceEvent = "tldr:relationship-wheel-display";
const memory = new Map<string, string>();

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(preferenceEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(preferenceEvent, onChange);
  };
}

function useDisplayPreference<T extends string>(name: string, choices: readonly T[], fallback: T) {
  const key = `tldr:relationship-wheel:v1:${name}`;
  const value = useSyncExternalStore(subscribe, () => {
    let saved = memory.get(key);
    try { saved = window.localStorage.getItem(key) ?? saved; } catch { /* Keep controls usable without storage. */ }
    return choices.includes(saved as T) ? saved as T : fallback;
  }, () => fallback);
  return [value, (next: T) => {
    memory.set(key, next);
    try { window.localStorage.setItem(key, next); } catch { /* Session-only preference. */ }
    window.dispatchEvent(new Event(preferenceEvent));
  }] as const;
}

export function useRelationshipWheelDisplay() {
  const [aspectColorMode, setAspectColorMode] = useDisplayPreference("colors", ["default", "bright"] as const, "default");
  const [appearance, setAppearance] = useDisplayPreference("composite-style", ["standard", "monochrome"] as const, "standard");
  const [glyphRing, setGlyphRing] = useDisplayPreference("glyph-ring", ["on", "off"] as const, "on");
  return { aspectColorMode, setAspectColorMode, appearance, setAppearance, glyphRing, setGlyphRing };
}

