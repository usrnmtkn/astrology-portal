import { AlertTriangle, BookOpenText, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ActivationCoverageResponse = {
  ok?: boolean;
  error?: string;
  generatedAt?: string;
  rows?: ActivationCoverageRow[];
  records?: AuthoredActivationRecordCoverage[];
  secondaryCoverage?: {
    timingStates: string[];
    triggerModes: string[];
    confidence: string[];
    emergencyFallbacks: number;
  };
};

type ActivationCoverageRow = {
  key: string;
  pattern: string;
  roleLabel: string;
  approvedAuthored: number;
  fallback: boolean;
  emergency: boolean;
  goldenFixtures: number;
  timingStates: string[];
  triggerModes: string[];
  confidence: string[];
  status: "covered" | "needs_attention";
};

type AuthoredActivationRecordCoverage = {
  id: string;
  version: string;
  status: string;
  patternType: string;
  eligibility: {
    targetRoles: string[];
    timingStates?: string[];
    patternConfidence?: string[];
    triggerModes?: string[];
  };
  contentSections: string[];
  provenance: {
    sourceIds: string[];
    editorialStatus: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  prohibitedClaims: string[];
  prohibitedTerms: string[];
  validationStatus: string;
  previews: ActivationPreviewRecord[];
};

type ActivationPreviewRecord = {
  fixtureId: string;
  timingState: string;
  triggerMode: string;
  confidence: string;
  targetRole: string;
  authored: ResolvedActivationCopy;
  fallback: ResolvedActivationCopy;
  changedFields: string[];
  resolverSource: ResolvedActivationCopy["source"];
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
    missingSlots: string[];
    unknownSlots: string[];
  };
};

type ResolvedActivationCopy = {
  source: {
    recordId: string;
    contentLevel: string;
    status: string;
  };
  content: {
    eyebrow?: string;
    headline: string;
    overview: string;
    sections: Array<{ id: string; body: string }>;
  };
  diagnostics: {
    templateId: string;
    missingSlots: string[];
    skippedSections: string[];
    validationWarnings?: string[];
  };
};

function titlePart(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function yesNo(value: boolean) {
  return value ? "yes" : "no";
}

function joinOrNone(values: string[] | undefined) {
  return values && values.length ? values.join(", ") : "none";
}

function copySummary(copy: ResolvedActivationCopy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => `${titlePart(section.id)}: ${section.body}`)
  ].filter(Boolean);
}

export function AspectPatternActivationCoverage() {
  const [response, setResponse] = useState<ActivationCoverageResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const rows = response?.rows ?? [];
  const records = response?.records ?? [];
  const coveredCount = useMemo(() => rows.filter((row) => row.status === "covered").length, [rows]);

  async function loadCoverage() {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetch("/api/admin/aspect-pattern-activation-copy-coverage", { method: "GET" });
      const json = await result.json() as ActivationCoverageResponse;
      if (!result.ok || json.ok === false) {
        throw new Error(json.error || `Activation coverage request failed with ${result.status}.`);
      }
      setResponse(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Activation coverage request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCoverage();
  }, []);

  return (
    <section className="admin-template-page aspect-coverage-page" aria-label="Aspect pattern activation copy coverage">
      <section className="admin-panel aspect-coverage-header" aria-label="Activation coverage controls">
        <div>
          <p className="admin-eyebrow">Read-only language coverage</p>
          <h2>Aspect Pattern Activation</h2>
          <p>Compare approved authored activation routes against the accepted fallback output before reader integration.</p>
        </div>
        <button className="admin-primary-button" type="button" onClick={() => void loadCoverage()} disabled={isLoading}>
          {isLoading ? <RefreshCw size={16} aria-hidden="true" /> : <BookOpenText size={16} aria-hidden="true" />}
          Refresh coverage
        </button>
      </section>

      {error && (
        <section className="admin-panel aspect-diagnostics-error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>{error}</p>
        </section>
      )}

      <section className="admin-status-grid aspect-coverage-summary" aria-label="Activation coverage summary">
        <article className="admin-status-card">
          <span>Routes</span>
          <strong className="admin-stat-value">{rows.length}</strong>
          <small>Pattern and target-role coverage</small>
        </article>
        <article className="admin-status-card">
          <span>Covered</span>
          <strong className="admin-stat-value">{coveredCount}</strong>
          <small>Authored plus fallback availability</small>
        </article>
        <article className="admin-status-card">
          <span>Authored records</span>
          <strong className="admin-stat-value">{records.length}</strong>
          <small>Approved initial routes</small>
        </article>
        <article className="admin-status-card">
          <span>Secondary</span>
          <strong>{joinOrNone(response?.secondaryCoverage?.timingStates)}</strong>
          <small>{response?.generatedAt ? new Date(response.generatedAt).toLocaleString() : "pending"}</small>
        </article>
      </section>

      <section className="admin-panel aspect-coverage-table" aria-label="Activation coverage table">
        <h3>Route Coverage</h3>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Target role</th>
              <th>Approved authored</th>
              <th>Fallback</th>
              <th>Emergency</th>
              <th>Golden fixtures</th>
              <th>Timing</th>
              <th>Triggers</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.pattern}</td>
                <td>{row.roleLabel}</td>
                <td>{row.approvedAuthored}</td>
                <td>{yesNo(row.fallback)}</td>
                <td>{yesNo(row.emergency)}</td>
                <td>{row.goldenFixtures}</td>
                <td>{joinOrNone(row.timingStates)}</td>
                <td>{joinOrNone(row.triggerModes)}</td>
                <td>{joinOrNone(row.confidence)}</td>
                <td><span className={`ui-pill admin-status ${row.status === "covered" ? "status-live" : "status-draft"}`}>{titlePart(row.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="admin-empty">Loading activation-copy coverage.</p>}
      </section>

      <section className="aspect-coverage-records" aria-label="Authored activation records">
        {records.map((record) => (
          <article className="admin-panel aspect-coverage-record" key={record.id}>
            <header>
              <div>
                <p className="admin-eyebrow">{titlePart(record.patternType)}</p>
                <h3>{record.id}</h3>
                <p>Version {record.version} · {titlePart(record.status)} · {titlePart(record.validationStatus)}</p>
              </div>
              <span className={`ui-pill admin-status ${record.validationStatus === "valid" ? "status-live" : "status-draft"}`}>
                {record.validationStatus}
              </span>
            </header>

            <div className="aspect-coverage-record-grid">
              <section>
                <h4>Eligibility</h4>
                <dl>
                  <dt>Target roles</dt>
                  <dd>{record.eligibility.targetRoles.join(", ")}</dd>
                  <dt>Timing</dt>
                  <dd>{joinOrNone(record.eligibility.timingStates)}</dd>
                  <dt>Confidence</dt>
                  <dd>{joinOrNone(record.eligibility.patternConfidence)}</dd>
                  <dt>Trigger modes</dt>
                  <dd>{joinOrNone(record.eligibility.triggerModes)}</dd>
                </dl>
              </section>
              <section>
                <h4>Content</h4>
                <dl>
                  <dt>Sections</dt>
                  <dd>{record.contentSections.map(titlePart).join(", ")}</dd>
                  <dt>Prohibited claims</dt>
                  <dd>{record.prohibitedClaims.length + record.prohibitedTerms.length}</dd>
                </dl>
              </section>
              <section>
                <h4>Provenance</h4>
                <dl>
                  <dt>Editorial status</dt>
                  <dd>{titlePart(record.provenance.editorialStatus)}</dd>
                  <dt>Reviewed</dt>
                  <dd>{record.provenance.reviewedBy ?? "n/a"} {record.provenance.reviewedAt ? `· ${record.provenance.reviewedAt}` : ""}</dd>
                  <dt>Source IDs</dt>
                  <dd>{record.provenance.sourceIds.join(", ")}</dd>
                </dl>
              </section>
            </div>

            <section className="aspect-coverage-previews" aria-label={`${record.id} previews`}>
              <h4>Fixture Previews</h4>
              {record.previews.map((preview) => (
                <ActivationPreviewCard key={preview.fixtureId} preview={preview} />
              ))}
            </section>
          </article>
        ))}
      </section>
    </section>
  );
}

function ActivationPreviewCard({ preview }: { preview: ActivationPreviewRecord }) {
  return (
    <article className="aspect-coverage-preview">
      <header>
        <div>
          <strong>{preview.fixtureId}</strong>
          <span>{titlePart(preview.targetRole)} · {titlePart(preview.timingState)} · {titlePart(preview.triggerMode)} · {titlePart(preview.confidence)}</span>
        </div>
        <span className={`ui-pill admin-status ${preview.validation.ok ? "status-live" : "status-draft"}`}>
          {preview.validation.ok ? "valid" : "blocked"}
        </span>
      </header>
      <div className="aspect-coverage-preview-meta">
        <span>Selected: {preview.resolverSource.contentLevel}</span>
        <span>Record: {preview.resolverSource.recordId}</span>
        <span>Template: {preview.authored.diagnostics.templateId}</span>
        <span>Changed: {joinOrNone(preview.changedFields)}</span>
        <span>Missing slots: {joinOrNone(preview.authored.diagnostics.missingSlots)}</span>
        <span>Skipped: {joinOrNone(preview.authored.diagnostics.skippedSections)}</span>
        <span>Warnings: {joinOrNone(preview.validation.warnings.concat(preview.authored.diagnostics.validationWarnings ?? []))}</span>
      </div>
      <div className="aspect-coverage-copy-compare">
        <ActivationCopyColumn title="Authored result" copy={preview.authored} />
        <ActivationCopyColumn title="Approved fallback result" copy={preview.fallback} />
      </div>
      {!preview.validation.ok && (
        <div className="aspect-warning-list">
          {preview.validation.errors.map((error) => <span key={error}>{error}</span>)}
        </div>
      )}
    </article>
  );
}

function ActivationCopyColumn({ title, copy }: { title: string; copy: ResolvedActivationCopy }) {
  return (
    <section>
      <h5>{title}</h5>
      <p><code>{copy.source.contentLevel}</code> · <code>{copy.source.recordId}</code></p>
      <ul>
        {copySummary(copy).map((line, index) => <li key={`${title}-${index}`}>{line}</li>)}
      </ul>
    </section>
  );
}
