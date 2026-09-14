import { useEffect, useState } from "react";
import { StudioButton } from "./StudioControls";
import { subscribeToContentPublications } from "../../web/src/content/contentPublicationState";
import {
  fallbackRendererV3,
  loadEmptyHouseFallbackArchitectureV3Bundle
} from "../../web/src/content/fallbackArchitectureV3Runtime";

type Audience = "you" | "they";

type EmptyHouseRender = {
  body: string;
  headline: string;
  note?: string | null;
  parts: string[];
  sourceKeys?: string[];
  templateKey: string;
};

type PreviewState = {
  error: string | null;
  loading: boolean;
  rendered: EmptyHouseRender | null;
};

type Props = {
  house: number;
  onOpenSource: (contentKey: string, label: string, previewTemplate?: boolean) => void;
  rulerHouse: number;
  sign: string;
};

function titleFromKey(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function ordinalHouseLabel(value: number) {
  const mod100 = value % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
  return `${value}${suffix} house`;
}

function sourceLabel(contentKey: string) {
  if (contentKey.includes("/empty-house/base/")) return "House foundation";
  if (contentKey.includes("/empty-house/sign/")) return "Cusp-sign meaning";
  if (contentKey.includes("/rising-ruler/") || contentKey.includes("/ruler-planet/")) return "Ruler meaning";
  if (contentKey.includes("/ruler-house/")) return "Ruler-house meaning";
  if (contentKey.includes("/bridge-template/")) return "House-to-ruler bridge";
  if (contentKey.includes("empty-house-ruler-jurisdiction")) return "Ruler-house life area";
  if (contentKey.includes("empty-house-bridge-topic-short")) return "House bridge topic";
  if (contentKey.startsWith("fallback-template/")) return "Assembly template";
  return titleFromKey(contentKey.split("/").pop() ?? "Source");
}

export default function EmptyHouseReaderPreview({ house, onOpenSource, rulerHouse, sign }: Props) {
  const [audience, setAudience] = useState<Audience>("you");
  const [publicationVersion, setPublicationVersion] = useState(0);
  const [preview, setPreview] = useState<PreviewState>({ error: null, loading: true, rendered: null });

  useEffect(() => subscribeToContentPublications(() => setPublicationVersion((version) => version + 1)), []);

  useEffect(() => {
    let active = true;
    setPreview((current) => ({ ...current, error: null, loading: true }));
    void loadEmptyHouseFallbackArchitectureV3Bundle()
      .then(() => {
        const rendered = fallbackRendererV3.renderNatalEmptyHouse(
          {
            house,
            sign,
            rulerHouse,
            rulerSystem: "traditional",
            voice: audience === "you" ? "you" : "they"
          },
          { includeEmptyHouseBridge: true }
        ) as EmptyHouseRender;
        if (active) setPreview({ error: null, loading: false, rendered });
      })
      .catch((reason) => {
        if (!active) return;
        setPreview({
          error: reason instanceof Error ? reason.message : "The empty-house assembly could not be rendered.",
          loading: false,
          rendered: null
        });
      });
    return () => { active = false; };
  }, [audience, house, rulerHouse, sign, publicationVersion]);

  const contextLabel = `${ordinalHouseLabel(house)} in ${titleFromKey(sign)}`;
  const sourceKeys = preview.rendered?.sourceKeys ?? [];

  return (
    <section className="admin-natal-reader-preview admin-empty-house-preview" aria-label={`Full empty-house assembly for ${contextLabel}`}>
      <header>
        <div>
          <p className="admin-eyebrow">Full assembly</p>
          <h3>{audience === "they" ? "What a friend sees" : "What you see"}</h3>
          <p>The complete reader passage updates when you change the empty house, cusp sign, or ruler&apos;s house. Empty Houses use traditional rulership.</p>
        </div>
        <div className="admin-composition-preview-audience" role="group" aria-label="Empty-house preview audience">
          <StudioButton type="button" aria-pressed={audience === "you"} className={audience === "you" ? "active" : ""} onClick={() => setAudience("you")}>You</StudioButton>
          <StudioButton type="button" aria-pressed={audience === "they"} className={audience === "they" ? "active" : ""} onClick={() => setAudience("they")}>Friend</StudioButton>
        </div>
      </header>

      {preview.loading ? (
        <div className="admin-empty-state" role="status"><strong>Assembling empty-house preview…</strong></div>
      ) : preview.rendered ? (
        <div className="admin-natal-reader-preview-surface">
          <h3>{preview.rendered.headline || contextLabel}</h3>
          <div className="admin-empty-house-assembly-copy">
            <p>{preview.rendered.body}</p>
          </div>
          <div className="admin-empty-house-preview-source-list">
            <p><strong>Live reader assembly</strong> · {sourceKeys.length} source{sourceKeys.length === 1 ? "" : "s"}. Draft edits appear here after they are published.</p>
            {sourceKeys.length > 0 && (
              <div className="admin-empty-house-preview-source-actions" aria-label="Sources used in this assembly">
                {sourceKeys.map((contentKey) => (
                  <StudioButton
                    className="admin-empty-house-preview-source-action"
                    key={contentKey}
                    type="button"
                    onClick={() => onOpenSource(contentKey, sourceLabel(contentKey), contentKey.startsWith("fallback-template/"))}
                  >
                    Edit {sourceLabel(contentKey).toLowerCase()}
                  </StudioButton>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-empty-state" role="alert">
          <strong>Empty-house preview unavailable</strong>
          <p>{preview.error}</p>
        </div>
      )}
    </section>
  );
}
