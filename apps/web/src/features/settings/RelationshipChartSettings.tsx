import { SwitchControl } from "../../components/SettingsControls";
import { brightAspectPalette } from "../../components/charts/chartAspectLines";
import { useRelationshipWheelDisplay } from "../../components/charts/useRelationshipWheelDisplay";

export function RelationshipChartSettings() {
  const display = useRelationshipWheelDisplay();
  return (
    <>
      <div className="settings-row settings-row-control">
        <div className="settings-row-copy">
          <span className="settings-row-title">Aspect colors</span>
          <small className="settings-row-description">Line colors in synastry and composite charts.</small>
        </div>
        <div className="settings-theme-control" role="group" aria-label="Aspect colors">
          {(["default", "bright"] as const).map(value => (
            <button key={value} type="button" className={display.aspectColorMode === value ? "active" : ""}
              aria-pressed={display.aspectColorMode === value} onClick={() => display.setAspectColorMode(value)}>
              {value === "default" ? "Default" : "Bright"}
            </button>
          ))}
        </div>
      </div>
      {display.aspectColorMode === "bright" ? (
        <div className="settings-row">
          <ul className="settings-aspect-legend" aria-label="Aspect color legend">
            {brightAspectPalette.map(entry => (
              <li key={entry.type}>
                <span className="settings-aspect-legend__swatch" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                {entry.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="settings-row settings-row-control">
        <div className="settings-row-copy">
          <span className="settings-row-title">Composite style</span>
          <small className="settings-row-description">Choose the appearance of composite charts.</small>
        </div>
        <div className="settings-theme-control" role="group" aria-label="Composite style">
          {(["standard", "monochrome"] as const).map(value => (
            <button key={value} type="button" className={display.appearance === value ? "active" : ""}
              aria-pressed={display.appearance === value} onClick={() => display.setAppearance(value)}>
              {value === "standard" ? "Standard" : "Monochrome"}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-row settings-row-control">
        <div className="settings-row-copy">
          <span className="settings-row-title">Composite glyph ring</span>
          <small className="settings-row-description">Show a background band behind the planet glyphs.</small>
        </div>
        <SwitchControl
          checked={display.glyphRing === "on"}
          label="Composite glyph ring"
          onChange={enabled => display.setGlyphRing(enabled ? "on" : "off")}
        />
      </div>
    </>
  );
}
