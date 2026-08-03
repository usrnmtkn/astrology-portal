import {
  AppearanceToggle,
  CalculationMethodSettingsGroup,
  HouseSignLabelToggle,
  SwitchControl,
  type HouseSignLabelOption,
  type UiThemeOption
} from "../../components/SettingsControls";

export function GuestSettingsView({
  theme,
  locationLabel,
  sunriseOrbEnabled,
  dyslexiaFriendlyFont,
  onThemeChange,
  onSunriseOrbChange,
  onDyslexiaFontChange,
  houseSignLabelStyle,
  onHouseSignLabelStyleChange
}: {
  theme: UiThemeOption;
  locationLabel: string;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  onThemeChange: (theme: UiThemeOption) => void;
  onSunriseOrbChange: (enabled: boolean) => void;
  onDyslexiaFontChange: (enabled: boolean) => void;
  houseSignLabelStyle: HouseSignLabelOption;
  onHouseSignLabelStyleChange: (style: HouseSignLabelOption) => void;
}) {
  return (
    <section className="settings-page page-shell--narrow guest-settings-page" aria-label="Settings">
      <div className="settings-header">
        <h1>settings.</h1>
      </div>

      <div className="settings-panel">
        <section className="settings-group" aria-label="Personal settings">
          <span className="settings-group-label">Account</span>
          <div className="settings-card">
            <div className="settings-list">
              <div className="settings-row">
                <span className="settings-row__label">Current location</span>
                <span className="settings-row__value">{locationLabel}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Display settings">
          <span className="settings-group-label">Display</span>
          <div className="settings-card">
            <div className="settings-list">
              <div className="settings-row settings-row-control">
                <span className="settings-row__label">Theme</span>
                <AppearanceToggle theme={theme} onThemeChange={onThemeChange} />
              </div>
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Gradient</span>
                  <small className="settings-row-description">Show the sunrise gradient background across the website.</small>
                </div>
                <SwitchControl
                  checked={sunriseOrbEnabled}
                  label="Toggle gradient background"
                  onChange={onSunriseOrbChange}
                />
              </div>
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Dyslexia-friendly font</span>
                  <small className="settings-row-description">Use a more open, readable text face across the app.</small>
                </div>
                <SwitchControl
                  checked={dyslexiaFriendlyFont}
                  label="Toggle dyslexia-friendly font"
                  onChange={onDyslexiaFontChange}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Astrology settings">
          <span className="settings-group-label">Astrology settings</span>
          <div className="settings-card">
            <div className="settings-list">
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">House sign labels</span>
                  <small className="settings-row-description">How the house sign names appear around the zodiac wheel.</small>
                </div>
                <HouseSignLabelToggle value={houseSignLabelStyle} onChange={onHouseSignLabelStyleChange} />
              </div>
            </div>
          </div>
        </section>

        <CalculationMethodSettingsGroup />
      </div>
    </section>
  );
}
