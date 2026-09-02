import { useEffect, useMemo, useState } from "react";
import { adminCredentialHeaders } from "./adminSecret";
import { effectivePackageRecord } from "./skyFallbackWorkspace";
import {
  natalPlacementExactKey,
  natalPlacementLabel,
  natalPlacementResolverDependencyKeys,
  natalPlacementSignLabel,
  type NatalPlacementHouse,
  type NatalPlacementMotion,
  type NatalPlacementPlanet,
  type NatalPlacementSign
} from "./natalPlacementSources";

type PreviewRow = {
  body: string | null;
  content_key: string;
  headline: string | null;
  id?: string | null;
  lane?: string | null;
  provider?: string | null;
  sections: unknown;
  status: string;
  summary: string | null;
  updated_at?: string | null;
};

type NatalRender = {
  body: string;
  headline: string;
  partKeys?: string[];
  parts: string[];
  provenanceTier?: string;
  templateKey: string;
};

type IgnoredPreviewOverride = {
  contentKey: string;
  reason: "not-live" | "not-serving" | "wrong-provider" | "not-current-package-key" | "not-reader-approved";
};

type PreviewState = {
  appliedOverrideKeys: string[];
  error: string | null;
  ignoredOverrides: IgnoredPreviewOverride[];
  loading: boolean;
  rendered: NatalRender | null;
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
  const reviewStatus = typeof source.review_status === "string" ? source.review_status : "";
  return {
    ...source,
    contentKey: row.content_key,
    content_role: String(source.content_role),
    headline: typeof source.headline === "string" ? source.headline : row.headline ?? undefined,
    body: typeof sections.body === "string" ? sections.body : typeof source.body === "string" ? source.body : row.body ?? undefined,
    body_you: typeof sections.body_you === "string" ? sections.body_you : source.body_you,
    body_they: typeof sections.body_they === "string" ? sections.body_they : source.body_they,
    ...(reviewStatus ? { review_status: reviewStatus } : {})
  };
}

function previewOverrideCandidate(row: PreviewRow) {
  const packageRow = packageRowFromSavedRow(row);
  if (!packageRow) return null;
  return {
    id: row.id ?? "",
    lane: row.lane ?? null,
    packageRow,
    provider: row.provider ?? null,
    status: row.status,
    updatedAt: row.updated_at ?? null
  };
}

function sourceLabel(contentKey: string) {
  if (contentKey.includes("planet-in-sign")) return "Planet-in-sign section";
  if (contentKey.includes("house-context")) return "House section";
  if (contentKey.includes("natal.modifier.retrograde")) return "Retrograde modifier";
  if (contentKey.includes("complete-final")) return "Exact full write-up";
  return "Reader section";
}

function ignoredReasonLabel(reason: IgnoredPreviewOverride["reason"]) {
  if (reason === "not-live") return "not published";
  if (reason === "not-serving") return "not on the serving lane";
  if (reason === "wrong-provider") return "not part of the fallback package mirror";
  if (reason === "not-current-package-key") return "not in the currently installed reader package";
  return "not reader-approved";
}

export function natalPlacementOverrideDraft(contentKey: string, label: string, body: string) {
  return {
    id: null,
    contentKey,
    surface: "you" as const,
    mode: "in_depth" as const,
    status: "DRAFT" as const,
    headline: label,
    summary: "Optional exact write-up for this planet, sign, house, and motion.",
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
  const [preview, setPreview] = useState<PreviewState>({
    appliedOverrideKeys: [],
    error: null,
    ignoredOverrides: [],
    loading: true,
    rendered: null
  });
  const dependencyKeys = useMemo(
    () => new Set(natalPlacementResolverDependencyKeys(planet, sign, house, motion)),
    [house, motion, planet, sign]
  );
  const overrides = useMemo(() => rows
    .filter((row) => dependencyKeys.has(row.content_key))
    .map(previewOverrideCandidate)
    .filter((row): row is NonNullable<ReturnType<typeof previewOverrideCandidate>> => Boolean(row)), [dependencyKeys, rows]);

  useEffect(() => {
    const controller = new AbortController();
    setPreview((current) => ({ ...current, error: null, loading: true }));
    void fetch("/api/admin/natal-placement-preview", {
      method: "POST",
      headers: { "content-type": "application/json", ...adminCredentialHeaders(secret) },
      body: JSON.stringify({ audience, ...(house ? { house } : {}), motion, overrides, planet, sign }),
      signal: controller.signal
    }).then(async (response) => {
      const payload = await response.json().catch(() => null) as {
        appliedOverrideKeys?: string[];
        error?: string;
        ignoredOverrides?: IgnoredPreviewOverride[];
        rendered?: NatalRender;
      } | null;
      if (!response.ok || !payload?.rendered) throw new Error(payload?.error ?? `Preview request failed with ${response.status}.`);
      setPreview({
        appliedOverrideKeys: payload.appliedOverrideKeys ?? [],
        error: null,
        ignoredOverrides: payload.ignoredOverrides ?? [],
        loading: false,
        rendered: payload.rendered
      });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setPreview({
        appliedOverrideKeys: [],
        error: error instanceof Error ? error.message : "The reader preview could not be assembled.",
        ignoredOverrides: [],
        loading: false,
        rendered: null
      });
    });
    return () => controller.abort();
  }, [audience, house, motion, overrides, planet, secret, sign]);

  const exactKey = house ? natalPlacementExactKey(planet, sign, house, motion) : "";
  const exactSaved = Boolean(exactKey && rows.some((row) => row.content_key === exactKey));
  const exactServing = Boolean(
    house
    && preview.rendered?.provenanceTier === "exact-owner-approved"
    && preview.rendered.templateKey === exactKey
  );
  const exactServingFromStudio = Boolean(exactServing && preview.appliedOverrideKeys.includes(exactKey));
  const usingLiveStudioSources = preview.appliedOverrideKeys.length > 0;
  const label = house ? natalPlacementLabel(planet, sign, house) : natalPlacementSignLabel(planet, sign);

  const provenanceLabel = audience === "they"
    ? exactServingFromStudio
      ? "Live exact Friend Studio override"
      : exactServing
        ? "Exact packaged Friend write-up"
        : usingLiveStudioSources
          ? "Composed with live Friend Studio sources"
          : "Composed from production package"
    : exactServingFromStudio
      ? "Live exact Studio override"
      : exactServing
        ? "Exact packaged write-up"
        : usingLiveStudioSources
          ? "Composed with live Studio sources"
          : "Composed from production package";

  return (
    <section className="admin-natal-reader-preview" aria-label={`Reader preview for ${label}`}>
      <header>
        <div>
          <p className="admin-eyebrow">Effective reader preview</p>
          <h3>{audience === "they" ? "What a friend sees" : "What you see"}</h3>
          <p>{audience === "they"
            ? "This preview uses the same production eligibility rules as the Friends reader. Draft, reviewed-only, reference-lane, stale-package, and otherwise non-hydratable Studio rows are excluded."
            : "This preview uses the same production eligibility rules as the app. Draft, reviewed-only, reference-lane, stale-package, and otherwise non-hydratable Studio rows are excluded."}</p>
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
            <span className={`ui-pill admin-status ${exactServing || usingLiveStudioSources ? "status-live" : "status-reviewed"}`}>
              {provenanceLabel}
            </span>
            <span className={`ui-pill admin-status ${motion === "retrograde" ? "status-reviewed" : "status-live"}`}>
              {motion === "retrograde" ? "Retrograde chart context" : "Direct chart context"}
            </span>
            {house && audience === "you" && !exactServing && (
              exactSaved
                ? <button type="button" onClick={() => onOpenSource(exactKey, `Exact ${label} override`)}>Open saved override</button>
                : <button type="button" onClick={() => onCreateOverride(exactKey, label, preview.rendered?.body ?? "")}>Create exact override</button>
            )}
          </div>
          {preview.ignoredOverrides.length > 0 && (
            <p
              className="admin-field-hint"
              title={preview.ignoredOverrides.map((item) => `${item.contentKey}: ${ignoredReasonLabel(item.reason)}`).join("\n")}
            >
              {preview.ignoredOverrides.length} saved Content Studio source{preview.ignoredOverrides.length === 1 ? " is" : "s are"} excluded from this production preview because {preview.ignoredOverrides.length === 1 ? ignoredReasonLabel(preview.ignoredOverrides[0].reason) : "they are not currently reader-effective"}.
            </p>
          )}
          {motion === "retrograde" && exactServing && audience === "you" && (
            <p className="admin-field-hint">This exact retrograde override is served verbatim. It does not append the shared retrograde fallback; include the retrograde treatment in the exact write-up itself.</p>
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
