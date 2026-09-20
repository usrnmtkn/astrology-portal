import { StudioButton, StudioInput } from "./StudioControls";
import { friendsTransitCardDestinations } from "./bondEffectPageAssembly";
import { transitNatalLabel } from "./transitNatalSources";
import { Stack, Text } from "./studio-ds/primitives";

export type FriendsTransitSection = "between-you-two" | "active-for-name" | "house-transit";

export default function FriendsTransitSectionFinder({
  currentSection,
  onOpenActiveForName,
  onOpenBetweenYouTwoOpening,
  onOpenHouseTransit,
  onQueryChange,
  query,
  variant = "page",
  parts = "all"
}: {
  currentSection: FriendsTransitSection;
  onOpenActiveForName: () => void;
  onOpenBetweenYouTwoOpening: () => void;
  onOpenHouseTransit: () => void;
  onQueryChange: (value: string) => void;
  query: string;
  variant?: "page" | "embedded";
  parts?: "all" | "search" | "destinations";
}) {
  const destinations = friendsTransitCardDestinations(query);
  const title = destinations.contact
    ? transitNatalLabel(destinations.contact)
    : destinations.parsed.transiting && destinations.parsed.aspect
      ? `${titleFromKey(destinations.parsed.transiting)} ${destinations.parsed.aspect}`
      : "Find a Friends transit card";
  const showSearch = parts !== "destinations";
  const showDestinations = parts !== "search";

  return (
    <section className="admin-natal-placement-finder admin-transit-finder" aria-label={showSearch ? "Find a Friends transit card" : "Friends Transits sections"}>
      {variant === "page" && parts === "all" ? (
        <div className="admin-natal-placement-finder-heading">
          <Stack gap="sm">
            <Text size="meta" tone="secondary">Friends Transits composition map</Text>
            <strong>{title}</strong>
            <Text size="body" tone="secondary">Type the live reader title. The compiled write-up is the Between you two article. Open Active for {"{{Name}}"} or Where it lands only when that is the card you are editing.</Text>
          </Stack>
        </div>
      ) : null}
      {variant === "embedded" && showSearch ? (
        <p className="admin-field-hint">This title can belong to more than one Friends section. Open the section the reader is on before editing.</p>
      ) : null}
      {showSearch ? (
      <label className="admin-title-field">
        <span>Find a Friends transit card</span>
        <StudioInput
          aria-label="Find a Friends transit card"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Chiron sextile your Sun"
          value={query}
        />
        <small className="admin-field-hint">Between you two uses transiting planet plus aspect. Active for {"{{Name}}"} also needs the natal planet or point.</small>
      </label>
      ) : null}
      {showDestinations ? (
      <div className="admin-natal-source-group" role="list">
        <article className="admin-natal-source-card" role="listitem">
          <header className="admin-natal-source-card-heading">
            <Stack gap="sm">
              <Text size="meta" tone="secondary">Between you two · Opening</Text>
              <strong>{title}</strong>
            </Stack>
          </header>
          <Text size="body" tone="secondary">The live article with What this activates. The saved row is transiting planet plus aspect only.</Text>
          {destinations.betweenYouTwoOpeningKey ? <p><code>{destinations.betweenYouTwoOpeningKey}</code></p> : null}
          {currentSection === "between-you-two" ? <p>You are in this section.</p> : null}
          <StudioButton type="button" disabled={!destinations.betweenYouTwoOpeningKey} onClick={onOpenBetweenYouTwoOpening}>
            Open the opening
          </StudioButton>
        </article>
        <article className="admin-natal-source-card" role="listitem">
          <header className="admin-natal-source-card-heading">
            <Stack gap="sm">
              <Text size="meta" tone="secondary">Between you two · What this activates</Text>
              <strong>Synastry from the friend chart</strong>
            </Stack>
          </header>
          <Text size="body" tone="secondary">These headings, such as Your Sun opposite Name&apos;s Mercury, are separate synastry pairs. Open the opening first, then use Edit this activation on the composition.</Text>
          <StudioButton type="button" disabled={!destinations.betweenYouTwoOpeningKey} onClick={onOpenBetweenYouTwoOpening}>
            Open the opening first
          </StudioButton>
        </article>
        <article className="admin-natal-source-card" role="listitem">
          <header className="admin-natal-source-card-heading">
            <Stack gap="sm">
              <Text size="meta" tone="secondary">Active for {"{{Name}}"}</Text>
              <strong>{destinations.contact ? transitNatalLabel(destinations.contact) : "You and Friend transit write-up"}</strong>
            </Stack>
          </header>
          <Text size="body" tone="secondary">A different Friends card. It needs transiting planet, aspect, and natal planet or point. It is not the Between you two opening.</Text>
          {destinations.activeForNameKey ? <p><code>{destinations.activeForNameKey}</code></p> : null}
          {currentSection === "active-for-name" ? <p>You are in this section.</p> : null}
          <StudioButton type="button" className="admin-secondary-button" disabled={!destinations.contact} onClick={onOpenActiveForName}>
            Open Active for {"{{Name}}"}
          </StudioButton>
        </article>
        <article className="admin-natal-source-card" role="listitem">
          <header className="admin-natal-source-card-heading">
            <Stack gap="sm">
              <Text size="meta" tone="secondary">Where it lands</Text>
              <strong>House transit</strong>
            </Stack>
          </header>
          <Text size="body" tone="secondary">House write-ups, not an aspect title. Use this only for Friends &gt; Transits &gt; Where it lands.</Text>
          {currentSection === "house-transit" ? <p>You are in this section.</p> : null}
          <StudioButton type="button" className="admin-secondary-button" onClick={onOpenHouseTransit}>
            Open house transit
          </StudioButton>
        </article>
      </div>
      ) : null}
    </section>
  );
}

function titleFromKey(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
