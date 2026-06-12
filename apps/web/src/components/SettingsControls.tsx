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
