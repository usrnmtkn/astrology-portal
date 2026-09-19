import { useEffect, useState } from "react";
import { PageLoading } from "../../web/src/components/PageLoading";
import BondEffectPagePreview from "./BondEffectPagePreview";
import { friendsTransitCardDestinations, synastryBodiesFromPayload } from "./bondEffectPageAssembly";
import { requestStudioJson } from "./generatedContentClient";
import { StudioButton } from "./StudioControls";

export default function FriendsBetweenYouTwoComposition({
  onOpenOpening,
  onOpenSource,
  query,
  secret
}: {
  onOpenOpening: (contentKey: string) => void;
  onOpenSource: (contentKey: string, label: string, field?: string) => void;
  query: string;
  secret: string;
}) {
  const destinations = friendsTransitCardDestinations(query);
  const openingKey = destinations.betweenYouTwoOpeningKey;
  const [opening, setOpening] = useState<{ you: string; they: string } | null>(null);
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
    void (async () => {
      try {
        const payload = await requestStudioJson(
          `/api/admin/generated-content?status=all&visibility=all&contentKey=${encodeURIComponent(openingKey)}&limit=1&includePackageSource=true`,
          secret,
          { signal: controller.signal }
        );
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
  }, [openingKey, secret]);

  if (!openingKey) return null;

  return (
    <section className="studio-surface studio-section" aria-label="Between you two composition">
      <header className="studio-section-header">
        <div>
          <p className="admin-eyebrow">Between you two composition</p>
          <strong>Live write-up</strong>
          <p>
            This is the assembled Friends article. The opening is one saved row. What this activates is a separate synastry pair. Use Edit this activation on the composition, or open the opening to change the first passage.
          </p>
        </div>
      </header>
      {busy ? <PageLoading compact message="Opening the Between you two page…" /> : null}
      {error ? (
        <p>
          {error}{" "}
          <StudioButton type="button" onClick={() => onOpenOpening(openingKey)}>
            Open the opening
          </StudioButton>
        </p>
      ) : null}
      {opening ? (
        <BondEffectPagePreview
          contentKey={openingKey}
          youText={opening.you}
          theyText={opening.they}
          secret={secret}
          previewNatalPoint={destinations.contact?.natalPoint}
          onOpenSource={onOpenSource}
        />
      ) : null}
    </section>
  );
}
