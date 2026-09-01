import { useEffect, useMemo, useState } from "react";
import { adminCredentialHeaders } from "./adminSecret";
import { effectivePackageRecord } from "./skyFallbackWorkspace";
import {
  natalPlacementLabel,
  natalPlacementSignLabel,
  natalPlacementSourceGroups,
  type NatalPlacementHouse,
  type NatalPlacementMotion,
  type NatalPlacementPlanet,
  type NatalPlacementSign
} from "./natalPlacementSources";

type PreviewRow = {
  body: string | null;
  content_key: string;
  headline: string | null;
  sections: unknown;
  status: string;
  summary: string | null;
};

type NatalRender = {
  body: string;
  headline: string;
  partKeys?: string[];
  parts: string[];
  provenanceTier?: string;
  templateKey: string;
};

type Props = {
  house: NatalPlacementHouse | "";
  initialAudience?: "you" | "they";
  motion: NatalPlacementMotion;
  onCreateOverride: (contentKey: string, label: string, body: string) => void;
  onOpenSource: (contentKey: string, label: string, previewTemplate?: boolean) => void;
  planet: NatalPlacementPlanet;
  rows: PreviewRow[];
  secret: string;
  sign: NatalPlacementSign;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function packageRowFromSavedRow(row: PreviewRow) {
  if (!row.content_key.startsWith("fallback-")) return null;
  const sections = record(row.sections);
  const source = effectivePackageRecord(row.sections);
  if (typeof source.content_role !== "string") return null;
  const reviewStatus = typeof source.review_status === "string"
    ? source.review_status
    : row.status === "LIVE"
      ? "approved"
      : "reviewed";
  return {
    ...source,
    contentKey: row.content_key,
    content_role: String(source.content_role),
    headline: typeof source.headline === "string" ? source.headline : row.headline ?? undefined,
    body: typeof sections.body === "string" ? sections.body : typeof source.body === "string" ? source.body : row.body ?? undefined,
    body_you: typeof sections.body_you === "string" ? sections.body_you : source.body_you,
    body_they: typeof sections.body_they === "string" ? sections.body_they : source.body_they,
    review_status: reviewStatus
  };
}

function sourceLabel(contentKey: string) {
  if (contentKey.includes("planet-in-sign")) return "Planet-in-sign section";
  if (contentKey.includes("house-context")) return "House section";
  if (contentKey.includes("natal.modifier.retrograde")) return "Retrograde modifier";
  if (contentKey.includes("complete-final")) return "Exact full write-up";
  return "Reader section";
}

export function natalPlacementOverrideDraft(contentKey: string, label: string, body: string) {
  return {
    id: null,
    contentKey,
    surface: "you" as const,
    mode: "in_depth" as const,
    status: "DRAFT" as const,
    headline: label,
    summary: "Optional exact write-up for this planet, sign, and house.",
    body,
    lane: "serving",
    reviewState: "EDITORIAL_REVIEW_REQUIRED",
    blockType: "natal_placement",
    promptVersion: "manual-admin",
    sections: {
      packageRecord: {
        body,
        contentKey,
        content_role: "full_copy",
        grammar_frame: "complete_sentence",
        headline: label,
        reader_only: true,
        render_policy: "reader-only-exact-lived-v1",
        review_status: "needs_review"
      }
    },
    facts: { fallbackArchitectureV3: true },
    reviewerNotes: "Created from the effective natal reader preview. Review the complete write-up before publishing.",
    sourceSnapshot: {
      contentType: "natal-placement-exact-override",
      contentSystem: "fallback",
      content_role: "full_copy",
      review_status: "needs_review",
      sourcePackage: "tldrastro-fallback-architecture-v3"
    }
  };
}

export default function NatalPlacementReaderPreview({ house, initialAudience = "you", motion, onCreateOverride, onOpenSource, planet, rows, secret, sign }: Props) {
  const [audience, setAudience] = useState<"you" | "they">(initialAudience);
  const [preview, setPreview] = useState<{ error: string | null; loading: boolean; rendered: NatalRender | null }>({ error: null, loading: true, rendered: null });
  const sourceKeys = useMemo(() => new Set(natalPlacementSourceGroups(planet, sign, house, motion).flatMap((group) => group.sources.map((source) => source.key))), [house, motion, planet, sign]);
  const overrides = useMemo(() => rows
    .filter((row) => (row.status === "LIVE" || row.status === "REVIEWED") && sourceKeys.has(row.content_key))
    .map(packageRowFromSavedRow)
    .filter((row): row is NonNullable<ReturnType<typeof packageRowFromSavedRow>> => Boolean(row)), [rows, sourceKeys]);

  useEffect(() => {
    const controller = new AbortController();
    setPreview((current) => ({ ...current, error: null, loading: true }));
    void fetch("/api/admin/natal-placement-preview", {
      method: "POST",
      headers: { "content-type": "application/json", ...adminCredentialHeaders(secret) },
      body: JSON.stringify({ audience, ...(house ? { house } : {}), motion, overrides, planet, sign }),
      signal: controller.signal
    }).then(async (response) => {
      const payload = await response.json().catch(() => null) as { error?: string; rendered?: NatalRender } | null;
      if (!response.ok || !payload?.rendered) throw new Error(payload?.error ?? `Preview request failed with ${response.status}.`);
      setPreview({ error: null, loading: false, rendered: payload.rendered });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setPreview({ error: error instanceof Error ? error.message : "The reader preview could not be assembled.", loading: false, rendered: null });
    });
    return () => controller.abort();
  }, [audience, house, motion, overrides, planet, secret, sign]);

  const exactKey = house ? `fallback-hook/natal-you-placement-complete-final/${planet}/${sign}/${house}` : "";
  const exactSaved = Boolean(exactKey && rows.some((row) => row.content_key === exactKey));
  const exactServing = Boolean(house && preview.rendered?.provenanceTier === "exact-owner-approved");
  const label = house ? natalPlacementLabel(planet, sign, house) : natalPlacementSignLabel(planet, sign);

  return (
    <section className="admin-natal-reader-preview" aria-label={`Reader preview for ${label}`}>
      <header>
        <div>
          <p className="admin-eyebrow">Effective reader preview</p>
          <h3>{audience === "they" ? "What a friend sees" : "What you see"}</h3>
          <p>{audience === "they"
            ? "The Friends version is composed from separate third-person source writing and calculated person details. Each colored section opens the actual editable source used to build it."
            : "This is assembled by the same fallback resolver as the app. Each colored section opens the source structure that places it in the write-up."}</p>
        </div>
        <div className="admin-composition-preview-audience" role="group" aria-label="Natal preview audience">
          <button type="button" aria-pressed={audience === "you"} className={audience === "you" ? "active" : ""} onClick={() => setAudience("you")}>You</button>
          <button type="button" aria-pressed={audience === "they"} className={audience === "they" ? "active" : ""} onClick={() => setAudience("they")}>Friend</button>
        </div>
      </header>

      {preview.loading ? (
        <div className="admin-empty-state" role="status"><strong>Assembling reader preview…</strong></div>
      ) : preview.rendered ? (
        <div className="admin-natal-reader-preview-surface">
          <span className="admin-eyebrow">Headline</span>
          <h3>{preview.rendered.headline}</h3>
          <span className="admin-eyebrow">Write-up</span>
          <div className="admin-natal-reader-preview-parts">
            {preview.rendered.parts.map((part, index) => {
              const contentKey = preview.rendered?.partKeys?.[index] ?? preview.rendered?.templateKey ?? "";
              const sectionLabel = sourceLabel(contentKey);
              return (
                <button
                  type="button"
                  className={`admin-natal-reader-preview-part variable-${index % 2 === 0 ? "hook" : "phrase"}`}
                  key={`${contentKey}-${index}`}
                  onClick={() => contentKey && onOpenSource(contentKey, sectionLabel, contentKey.startsWith("fallback-template/"))}
                  title={contentKey ? `Open ${sectionLabel.toLowerCase()}` : undefined}
                >
                  {part}
                  {contentKey && <small>Open {sectionLabel.toLowerCase()} →</small>}
                </button>
              );
            })}
          </div>
          <div className="admin-natal-reader-preview-provenance">
            <span className={`ui-pill admin-status ${exactServing ? "status-live" : "status-reviewed"}`}>
              {audience === "they"
                ? "Composed from Friend sources"
                : exactServing
                  ? "Exact authored override"
                  : "Composed from atomic sources"}
            </span>
            <span className={`ui-pill admin-status ${motion === "retrograde" ? "status-reviewed" : "status-live"}`}>
              {motion === "retrograde" ? "Retrograde chart context" : "Direct chart context"}
            </span>
            {house && audience === "you" && !exactServing && (
              exactSaved
                ? <button type="button" onClick={() => onOpenSource(exactKey, `Exact ${label} override`)}>Open draft override</button>
                : <button type="button" onClick={() => onCreateOverride(exactKey, label, preview.rendered?.body ?? "")}>Create exact override</button>
            )}
          </div>
          {motion === "retrograde" && exactServing && audience === "you" && (
            <p className="admin-field-hint">This exact authored override is served verbatim. It does not append the shared retrograde modifier; include any retrograde treatment in the exact write-up itself.</p>
          )}
        </div>
      ) : (
        <div className="admin-empty-state" role="alert">
          <strong>Reader preview unavailable</strong>
          <p>{preview.error}</p>
        </div>
      )}
    </section>
  );
}
