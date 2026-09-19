import { useEffect, useState } from "react";
import { PageLoading } from "../../web/src/components/PageLoading";
import BondEffectPagePreview from "./BondEffectPagePreview";
import { friendsActivationParam, friendsTransitCardDestinations, friendsTransitCompositionQuery, friendsTransitReaderTitle, parseFriendsActivationParam, synastryBodiesFromPayload } from "./bondEffectPageAssembly";
import { readStudioContentDocument } from "./generatedContentClient";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";
import { StudioButton } from "./StudioControls";

export default function FriendsBetweenYouTwoComposition({
  onOpenOpening,
  onOpenSource,
  onQueryChange,
  onActivationChange,
  activationQuery,
  query,
  secret
}: {
  onOpenOpening: (contentKey: string) => void;
  onOpenSource: (contentKey: string, label: string, field?: string) => void;
  onQueryChange?: (value: string) => void;
  onActivationChange?: (value: string) => void;
  activationQuery?: string;
  query: string;
  secret: string;
}) {
  const destinations = friendsTransitCardDestinations(friendsTransitCompositionQuery(query));
  const activation = parseFriendsActivationParam(activationQuery);
  const openingKey = destinations.betweenYouTwoOpeningKey;
  const [opening, setOpening] = useState<{ you: string; they: string } | null>(null);
  // Saving a passage does not change the selection, so without this the map keeps
  // showing the copy it read before the edit while the reader already has the new one.
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeToContentUpdates(() => setRevision((value) => value + 1)), []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!openingKey) {
      setOpening(null);
      setError(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    setOpening(null);
    void (async () => {
      try {
        const payload = await readStudioContentDocument(openingKey, secret, { signal: controller.signal });
        if (cancelled) return;
        const bodies = synastryBodiesFromPayload(payload);
        if (!bodies) {
          setOpening(null);
          setError("The opening row is not saved yet. Open the opening to write it.");
          return;
        }
        setOpening({ you: bodies.body_you, they: bodies.body_they });
      } catch (caught) {
        if (cancelled) return;
        setOpening(null);
        setError(caught instanceof Error ? caught.message : "The opening could not be loaded.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [openingKey, secret, revision]);

  if (!openingKey) return null;

  return (
    <section className="studio-surface studio-section" aria-label="Between you two compiled write-up">
      {busy ? <PageLoading compact message="Opening the Between you two page…" /> : null}
      {error ? (
        <p>
          {error}{" "}
          <StudioButton type="button" onClick={() => onOpenOpening(openingKey)}>
            Open the opening
          </StudioButton>
        </p>
      ) : null}
      <BondEffectPagePreview
        contentKey={openingKey}
        youText={opening?.you ?? ""}
        theyText={opening?.they ?? ""}
        secret={secret}
        previewNatalPoint={destinations.contact?.natalPoint}
        previewFriendPoint={activation?.friendPoint}
        previewActivationAspect={activation?.aspect}
        onContactChange={onQueryChange
          ? (contact) => onQueryChange(friendsTransitReaderTitle(contact.planet, contact.aspect, contact.natalPoint))
          : undefined}
        onActivationChange={onActivationChange
          ? (next) => onActivationChange(friendsActivationParam(next.friendPoint, next.aspect))
          : undefined}
        onOpenSource={onOpenSource}
      />
    </section>
  );
}
