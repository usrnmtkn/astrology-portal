export type UiThemeOption = "light" | "dark";
export type HouseSignLabelOption = "text" | "glyph";

export function AppearanceToggle({
  theme,
  onThemeChange
}: {
  theme: UiThemeOption;
  onThemeChange: (theme: UiThemeOption) => void;
}) {
  return (
    <div className="settings-theme-control" aria-label="Theme">
      {(["light", "dark"] as const).map((themeOption) => (
        <button
          key={themeOption}
          type="button"
          className={theme === themeOption ? "active" : ""}
          aria-pressed={theme === themeOption}
          onClick={() => onThemeChange(themeOption)}
        >
          {themeOption}
        </button>
      ))}
    </div>
  );
}

export function HouseSignLabelToggle({
  value,
  onChange
}: {
  value: HouseSignLabelOption;
  onChange: (style: HouseSignLabelOption) => void;
}) {
  return (
    <div className="settings-theme-control" aria-label="House sign labels">
      {(["text", "glyph"] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={value === option ? "active" : ""}
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function SwitchControl({
  checked,
  disabled = false,
  label,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`settings-switch ${checked ? "is-on" : ""}`}
      aria-label={label}
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span aria-hidden="true" />
    </button>
  );
}

export function CalculationMethodSettingsGroup() {
  return (
    <section className="settings-group" aria-label="Calculation method">
      <span className="settings-group-label">Calculation method</span>
      <div className="settings-card">
        <div className="settings-list">
          <div className="settings-row">
            <div className="settings-row-copy">
              <span className="settings-row-title">Ephemeris</span>
              <small className="settings-row-description">
                Planetary positions are calculated with Swiss Ephemeris and independently verified against NASA/JPL.
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
