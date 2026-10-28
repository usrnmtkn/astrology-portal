import { Moon, Sun } from "lucide-react";

export type UiThemeOption = "light" | "dark";

/** The same theme action stays beside the menu on every reader route. */
export function ThemeToggleButton({ theme, onThemeChange }: {
  theme: UiThemeOption;
  onThemeChange: (theme: UiThemeOption) => void;
}) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${nextTheme} mode`;
  return <button className="theme-toggle" type="button" aria-label={label} title={label} onClick={() => onThemeChange(nextTheme)}>
    {theme === "dark" ? <Sun size={22} aria-hidden="true" /> : <Moon size={22} aria-hidden="true" />}
  </button>;
}

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

