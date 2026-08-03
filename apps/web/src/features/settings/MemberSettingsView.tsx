import { ChevronRight } from "lucide-react";
import { lazy, useEffect, useState } from "react";
import { CitySearchField } from "../../components/CitySearchField";
import {
  AppearanceToggle,
  CalculationMethodSettingsGroup,
  HouseSignLabelToggle,
  SwitchControl,
  type HouseSignLabelOption,
  type UiThemeOption
} from "../../components/SettingsControls";
import { saveSocialPrivacy, type SocialProfile } from "../../services/socialFriends";
import { withTimeZone } from "../../services/timezones";
import type { LocationInput } from "../../types";
import {
  settingsRouteChangeEvent,
  settingsSubpageFromUrl,
  updateSettingsSubpageUrl,
  type SettingsSubpage
} from "./settingsRouting";

export { AccountView } from "../account/AccountView";

const BlockedAccountsSettings = lazy(() =>
  import("./BlockedAccountsSettings").then((module) => ({
    default: module.BlockedAccountsSettings
  }))
);

export function MemberSettingsView({
  currentLocation,
  currentLocationData,
  currentCityDisplay,
  defaultLocation,
  houseSignLabelStyle,
  socialProfile,
  theme,
  sunriseOrbEnabled,
  dyslexiaFriendlyFont,
  onCurrentLocationChange,
  onSocialProfileChange,
  onThemeChange,
  onSunriseOrbChange,
  onDyslexiaFontChange,
  onHouseSignLabelStyleChange,
  resolveLocationLabel
}: {
  currentLocation?: string;
  currentLocationData?: LocationInput | null;
  currentCityDisplay: string;
  defaultLocation: LocationInput;
  houseSignLabelStyle: HouseSignLabelOption;
  socialProfile: SocialProfile | null;
  theme: UiThemeOption;
  sunriseOrbEnabled: boolean;
  dyslexiaFriendlyFont: boolean;
  onCurrentLocationChange: (location: LocationInput) => void;
  onSocialProfileChange: (socialProfile: SocialProfile) => void;
  onThemeChange: (theme: UiThemeOption) => void;
  onSunriseOrbChange: (enabled: boolean) => void;
  onDyslexiaFontChange: (enabled: boolean) => void;
  onHouseSignLabelStyleChange: (style: HouseSignLabelOption) => void;
  resolveLocationLabel: (label: string) => LocationInput;
}) {
  const [currentCity, setCurrentCity] = useState(currentLocation ?? "");
  const [currentLocationDraft, setCurrentLocationDraft] = useState<LocationInput | null>(currentLocationData ?? null);
  const [currentLocationEditing, setCurrentLocationEditing] = useState(false);
  const [settingsSubpage, setSettingsSubpage] = useState<SettingsSubpage>(settingsSubpageFromUrl);
  const [accountPrivate, setAccountPrivate] = useState(socialProfile?.isPrivate ?? false);
  const [privacyStatus, setPrivacyStatus] = useState<"ready" | "saving">("ready");
  const [privacyMessage, setPrivacyMessage] = useState("");

  useEffect(() => {
    function syncSettingsRoute() {
      setSettingsSubpage(settingsSubpageFromUrl());
    }

    window.addEventListener("popstate", syncSettingsRoute);
    window.addEventListener("hashchange", syncSettingsRoute);
    window.addEventListener(settingsRouteChangeEvent, syncSettingsRoute);

    return () => {
      window.removeEventListener("popstate", syncSettingsRoute);
      window.removeEventListener("hashchange", syncSettingsRoute);
      window.removeEventListener(settingsRouteChangeEvent, syncSettingsRoute);
    };
  }, []);

  useEffect(() => {
    setAccountPrivate(socialProfile?.isPrivate ?? false);
  }, [socialProfile?.isPrivate]);

  function startCurrentLocationEdit() {
    setCurrentCity(currentLocation || defaultLocation.label);
    setCurrentLocationDraft(currentLocationData ?? withTimeZone(defaultLocation));
    setCurrentLocationEditing(true);
  }

  function cancelCurrentLocationEdit() {
    setCurrentCity(currentLocation ?? "");
    setCurrentLocationDraft(currentLocationData ?? null);
    setCurrentLocationEditing(false);
  }

  function saveCurrentLocation() {
    const trimmed = currentCity.trim();
    const nextLocation = trimmed
      ? currentLocationDraft?.label === trimmed
        ? withTimeZone(currentLocationDraft)
        : resolveLocationLabel(trimmed)
      : withTimeZone(defaultLocation);

    onCurrentLocationChange(nextLocation);
    setCurrentCity(nextLocation.label);
    setCurrentLocationDraft(nextLocation);
    setCurrentLocationEditing(false);
  }

  async function updateAccountPrivacy(nextPrivate: boolean) {
    setPrivacyStatus("saving");
    setPrivacyMessage("");

    try {
      const savedProfile = await saveSocialPrivacy(nextPrivate);
      setAccountPrivate(savedProfile.isPrivate);
      setPrivacyMessage(
        savedProfile.isPrivate
          ? "Your account is hidden from search. Existing friends keep their current access."
          : "People can now find you by name or @handle."
      );
      onSocialProfileChange(savedProfile);
    } catch (error) {
      setPrivacyMessage(error instanceof Error ? error.message : "Could not update your Social privacy.");
    } finally {
      setPrivacyStatus("ready");
    }
  }

  if (settingsSubpage === "blocked-accounts") {
    return (
      <BlockedAccountsSettings
        onBack={() => {
          updateSettingsSubpageUrl("root", "replace");
          setSettingsSubpage("root");
        }}
      />
    );
  }

  return (
    <section className="settings-page page-shell--narrow" aria-label="Settings">
      <div className="settings-header">
        <h1>settings.</h1>
      </div>

      <div className="settings-panel">
        <section className="settings-group" aria-label="Personalization settings">
          <span className="settings-group-label">Account</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Account settings">
              {currentLocationEditing ? (
                <div className="settings-row settings-location-editor">
                  <CitySearchField
                    label="Current location"
                    value={currentCity}
                    onChange={(value) => {
                      setCurrentCity(value);
                      setCurrentLocationDraft(null);
                    }}
                    onSelect={(suggestion) => {
                      setCurrentCity(suggestion.label);
                      setCurrentLocationDraft(suggestion);
                    }}
                    placeholder={defaultLocation.label}
                    className="settings-city-search"
                  />
                  <div className="settings-location-actions">
                    <button className="settings-location-cancel" type="button" onClick={cancelCurrentLocationEdit}>
                      Cancel
                    </button>
                    <button className="settings-location-save" type="button" onClick={saveCurrentLocation}>
                      Save location
                    </button>
                  </div>
                </div>
              ) : (
                <button className="settings-row settings-row-button" type="button" onClick={startCurrentLocationEdit}>
                  <span className="settings-row__label">Current location</span>
                  <span className="settings-row__field">
                    <span className="settings-row__value">{currentCityDisplay}</span>
                    <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Social settings">
          <span className="settings-group-label">Social</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Social settings">
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Private account</span>
                  <small className="settings-row-description">
                    Hide your profile from Find Friends. People you already accepted can still view your shared chart.
                  </small>
                </div>
                <SwitchControl
                  checked={accountPrivate}
                  disabled={privacyStatus === "saving"}
                  label="Make account private"
                  onChange={(nextPrivate) => void updateAccountPrivacy(nextPrivate)}
                />
              </div>
              {privacyMessage && (
                <p className="settings-social-message" role="status" aria-live="polite">
                  {privacyMessage}
                </p>
              )}
              <button
                className="settings-row settings-row-button"
                type="button"
                onClick={() => {
                  updateSettingsSubpageUrl("blocked-accounts");
                  setSettingsSubpage("blocked-accounts");
                }}
              >
                <span className="settings-row-copy">
                  <span className="settings-row-title">Blocked accounts</span>
                  <small className="settings-row-description">
                    Review and manage people you have blocked.
                  </small>
                </span>
                <span className="settings-row__field">
                  <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Display settings">
          <span className="settings-group-label">Display</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Display settings">
              <div className="settings-row settings-row-control">
                <span className="settings-row__label">Theme</span>
                <AppearanceToggle theme={theme} onThemeChange={onThemeChange} />
              </div>
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Gradient</span>
                  <small className="settings-row-description">Show the sunrise gradient background across the website.</small>
                </div>
                <SwitchControl checked={sunriseOrbEnabled} label="Toggle gradient background" onChange={onSunriseOrbChange} />
              </div>
              <div className="settings-row settings-row-control">
                <div className="settings-row-copy">
                  <span className="settings-row-title">Dyslexia-friendly font</span>
                  <small className="settings-row-description">Use a more open, readable text face across the app.</small>
                </div>
                <SwitchControl checked={dyslexiaFriendlyFont} label="Toggle dyslexia-friendly font" onChange={onDyslexiaFontChange} />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-group" aria-label="Astrology settings">
          <span className="settings-group-label">Astrology settings</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Astrology settings">
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

        <section className="settings-group" aria-label="Chart defaults">
          <span className="settings-group-label">Birth chart</span>
          <div className="settings-card">
            <div className="settings-list" aria-label="Birth chart settings">
              <div className="settings-row">
                <span className="settings-row__label">House system</span>
                <span className="settings-row__value">Whole Sign</span>
              </div>
            </div>
          </div>
        </section>

        <CalculationMethodSettingsGroup />
      </div>
    </section>
  );
}
