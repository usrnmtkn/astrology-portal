import { useEffect, useId, useState } from "react";
import { PageLoading } from "../../../src/shared/components/PageLoading";
import BondEffectPagePreview from "./BondEffectPagePreview";
import { friendsActivationParam, friendsTransitCardDestinations, friendsTransitCompositionQuery, friendsTransitReaderTitle, parseFriendsActivationParam, bondEffectVersionsFromPayload } from "./bondEffectPageAssembly";
import { readStudioContentDocument } from "./generatedContentClient";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";
import { StudioButton } from "./StudioControls";
import { Stack } from "./studio-ds/primitives";

function versionLabel(version: ReturnType<typeof bondEffectVersionsFromPayload>[number]) {
  if (version.versionId === "published") return "Saved copy";
  if (version.versionId === "package") return "Original copy";
  if (version.versionId === "draft") return "Current saved draft";
  return "Saved revision";
}

function versionDate(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short"
  }).format(new Date(value));
}

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyId = useId();
  const opening = versions.find(version => version.versionId === versionId) ?? versions[0];
  const earlierVersion = Boolean(opening && opening !== versions[0]);
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
    setHistoryOpen(false);
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
        <p role="alert">
          {error}{" "}
          <StudioButton type="button" onClick={() => onOpenOpening(openingKey)}>
            Open the opening
          </StudioButton>
        </p>
      ) : null}
      {opening?.missing.length ? <p role="alert">Incomplete relationship pair: missing {opening.missing.join(" and ")} perspective. No other version is substituted.</p> : null}
      <BondEffectPagePreview
        contentKey={openingKey}
        youText={opening?.body_you ?? ""}
        theyText={opening?.body_they ?? ""}
        openingReadOnly={earlierVersion || busy}
        openingActions={versions.length > 1 && <StudioButton type="button" aria-expanded={historyOpen} aria-controls={historyId}
          onClick={() => {
            setHistoryOpen(!historyOpen);
            if (historyOpen) setVersionId("");
          }}>History</StudioButton>}
        openingDetails={historyOpen && opening && <Stack as="section" gap="sm" className="admin-workspace-details" id={historyId} aria-label="Opening version history">
          <div className="admin-sky-writing-source-actions" role="status">
            <span>{earlierVersion ? "Previewing an earlier version" : versionLabel(opening)}{versionDate(opening.updatedAt) ? ` · ${versionDate(opening.updatedAt)}` : ""}</span>
            {earlierVersion && <StudioButton type="button" onClick={() => setVersionId("")}>Return to current version</StudioButton>}
          </div>
          <p className="admin-field-hint">Choose a version to preview. Choosing a version does not save or restore it.</p>
          <Stack gap="sm" role="group" aria-label="Opening versions">
            {versions.map((version, index) => <StudioButton key={version.versionId} type="button"
              aria-pressed={opening.versionId === version.versionId}
              onClick={() => setVersionId(version.versionId)}>
              {versionLabel(version)}{index === 0 ? " · Current" : ` · Version ${versions.length - index}`}{versionDate(version.updatedAt) ? ` · ${versionDate(version.updatedAt)}` : ""}
            </StudioButton>)}
          </Stack>
          {earlierVersion && <p className="admin-field-hint">Earlier versions are read-only. Return to the current version to edit the opening.</p>}
        </Stack>}
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
