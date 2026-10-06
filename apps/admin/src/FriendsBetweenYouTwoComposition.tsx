import { useEffect, useState } from "react";
import { PageLoading } from "../../web/src/components/PageLoading";
import BondEffectPagePreview from "./BondEffectPagePreview";
import { friendsActivationParam, friendsTransitCardDestinations, friendsTransitCompositionQuery, friendsTransitReaderTitle, parseFriendsActivationParam, bondEffectVersionsFromPayload } from "./bondEffectPageAssembly";
import { AdminSelect } from "./AdminNativeControls";
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
  const [versions, setVersions] = useState<ReturnType<typeof bondEffectVersionsFromPayload>>([]);
  const [versionId, setVersionId] = useState("");
  const opening = versions.find(version => version.versionId === versionId) ?? versions[0];
  // Saving a passage does not change the selection, so without this the map keeps
  // showing the copy it read before the edit while the reader already has the new one.
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeToContentUpdates(() => setRevision((value) => value + 1)), []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!openingKey) {
      setVersions([]);
      setError(null);
      setBusy(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    setVersions([]);
    setVersionId("");
    void (async () => {
      try {
        const payload = await readStudioContentDocument(openingKey, secret, { signal: controller.signal });
        if (cancelled) return;
        const available = bondEffectVersionsFromPayload(payload);
        if (!available.length) {
          setVersions([]);
          setError("The opening row is not saved yet. Open the opening to write it.");
          return;
        }
        setVersions(available);
      } catch (caught) {
        if (cancelled) return;
        setVersions([]);
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
      {versions.length > 0 && <label>
        Opening version
        <AdminSelect aria-label="Opening version" value={opening?.versionId ?? ""} onChange={event => setVersionId(event.target.value)}>
          {versions.map(version => <option key={version.versionId} value={version.versionId}>{version.label}</option>)}
        </AdminSelect>
      </label>}
      {opening?.missing.length ? <p role="alert">Incomplete relationship pair: missing {opening.missing.join(" and ")} perspective. No other version is substituted.</p> : null}
      <BondEffectPagePreview
        contentKey={openingKey}
        youText={opening?.body_you ?? ""}
        theyText={opening?.body_they ?? ""}
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
