import { useSyncExternalStore } from "react";
import { SegmentedControl } from "../SegmentedControl";
import { brightAspectPalette, type AspectColorMode } from "./chartAspectLines";

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

export function RelationshipWheelControls({ display, composite = false }: {
  display: ReturnType<typeof useRelationshipWheelDisplay>;
  composite?: boolean;
}) {
  return (
    <div className="relationship-wheel-controls" aria-label="Chart display">
      <div className="relationship-wheel-controls__row">
        <span>Aspect colors</span>
        <SegmentedControl<AspectColorMode>
          value={display.aspectColorMode}
          options={[{ value: "default", label: "Default" }, { value: "bright", label: "Bright" }]}
          onChange={display.setAspectColorMode}
          ariaLabel="Aspect colors"
          compact
        />
      </div>
      {composite ? (
        <>
          <div className="relationship-wheel-controls__row">
            <span>Chart style</span>
            <SegmentedControl
              value={display.appearance}
              options={[{ value: "standard", label: "Standard" }, { value: "monochrome", label: "Monochrome" }]}
              onChange={display.setAppearance}
              ariaLabel="Chart style"
              compact
            />
          </div>
          <label className="relationship-wheel-controls__row">
            <span>Glyph ring</span>
            <input type="checkbox" checked={display.glyphRing === "on"} onChange={event => display.setGlyphRing(event.target.checked ? "on" : "off")} />
          </label>
        </>
      ) : null}
      {display.aspectColorMode === "bright" ? (
        <ul className="relationship-wheel-controls__legend" aria-label="Aspect color legend">
          {brightAspectPalette.map(entry => (
            <li key={entry.type}>
              <span className="relationship-wheel-controls__swatch" style={{ backgroundColor: entry.color }} aria-hidden="true" />
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
