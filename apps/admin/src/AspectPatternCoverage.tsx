import { AlertTriangle, BookOpenText, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CoverageResponse = {
  ok?: boolean;
  error?: string;
  generatedAt?: string;
  rows?: CoverageRow[];
  records?: AuthoredRecordCoverage[];
};

type CoverageRow = {
  patternType: string;
  pattern: string;
  authored: number;
  approvedAuthored: number;
  sourceTemplate: boolean;
  madlib: boolean;
  emergency: boolean;
  goldenFixtures: number;
  status: "covered" | "needs_attention";
};

type AuthoredRecordCoverage = {
  id: string;
  version: string;
  status: string;
  patternType: string;
  eligibility: {
    confidence: string[];
    houseMode: string;
    variants?: string[];
  };
  contentSections: string[];
  provenance: {
    sourceIds: string[];
    editorialStatus: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  prohibitedClaims: string[];
  validationStatus: string;
  previews: PreviewRecord[];
};

type PreviewRecord = {
  fixtureId: string;
  confidence: string;
  contained: boolean;
  authored: ResolvedCopy;
  fallback: ResolvedCopy;
  changedFields: string[];
  resolverSource: ResolvedCopy["source"];
  validation: {
    ok: boolean;
    errors: string[];
    warnings: string[];
    missingSlots: string[];
    unknownSlots: string[];
  };
};

type ResolvedCopy = {
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

function copySummary(copy: ResolvedCopy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.map((section) => `${titlePart(section.id)}: ${section.body}`)
  ].filter(Boolean);
}

export function AspectPatternCoverage() {
  const [response, setResponse] = useState<CoverageResponse | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const rows = response?.rows ?? [];
  const records = response?.records ?? [];
  const coveredCount = useMemo(() => rows.filter((row) => row.status === "covered").length, [rows]);

  async function loadCoverage() {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetch("/api/admin/aspect-pattern-copy-coverage", { method: "GET" });
      const json = await result.json() as CoverageResponse;
      if (!result.ok || json.ok === false) {
        throw new Error(json.error || `Coverage request failed with ${result.status}.`);
      }
      setResponse(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Coverage request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCoverage();
  }, []);

  return (
    <section className="admin-template-page aspect-coverage-page" aria-label="Aspect pattern copy coverage">
      <section className="admin-panel aspect-coverage-header" aria-label="Coverage controls">
        <div>
          <p className="admin-eyebrow">Read-only language coverage</p>
          <h2>Aspect Patterns</h2>
          <p>Compare approved authored records against the accepted fallback resolver output before reader integration.</p>
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

      <section className="admin-status-grid aspect-coverage-summary" aria-label="Coverage summary">
        <article className="admin-status-card">
          <span>Pattern rows</span>
          <strong className="admin-stat-value">{rows.length}</strong>
          <small>Six supported patterns</small>
        </article>
        <article className="admin-status-card">
          <span>Covered</span>
          <strong className="admin-stat-value">{coveredCount}</strong>
          <small>Authored plus fallback availability</small>
        </article>
        <article className="admin-status-card">
          <span>Authored records</span>
          <strong className="admin-stat-value">{records.length}</strong>
          <small>Production-approved records</small>
        </article>
        <article className="admin-status-card">
          <span>Generated</span>
          <strong>{response?.generatedAt ? new Date(response.generatedAt).toLocaleString() : "pending"}</strong>
          <small>Read-only GET</small>
        </article>
      </section>

      <section className="admin-panel aspect-coverage-table" aria-label="Coverage table">
        <h3>Registry Coverage</h3>
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Authored</th>
              <th>Approved</th>
              <th>Source template</th>
              <th>Madlib</th>
              <th>Emergency</th>
              <th>Golden fixtures</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.patternType}>
                <td>{row.pattern}</td>
                <td>{row.authored}</td>
                <td>{row.approvedAuthored}</td>
                <td>{yesNo(row.sourceTemplate)}</td>
                <td>{yesNo(row.madlib)}</td>
                <td>{yesNo(row.emergency)}</td>
                <td>{row.goldenFixtures}</td>
                <td><span className={`ui-pill admin-status ${row.status === "covered" ? "status-live" : "status-draft"}`}>{titlePart(row.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="admin-empty">Loading aspect-pattern coverage.</p>}
      </section>

      <section className="aspect-coverage-records" aria-label="Authored records">
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
                  <dt>Confidence</dt>
                  <dd>{record.eligibility.confidence.join(", ")}</dd>
                  <dt>House mode</dt>
                  <dd>{record.eligibility.houseMode}</dd>
                  <dt>Variants</dt>
                  <dd>{joinOrNone(record.eligibility.variants)}</dd>
                </dl>
              </section>
              <section>
                <h4>Content</h4>
                <dl>
                  <dt>Sections</dt>
                  <dd>{record.contentSections.map(titlePart).join(", ")}</dd>
                  <dt>Prohibited claims</dt>
                  <dd>{record.prohibitedClaims.length}</dd>
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

            <details className="aspect-coverage-claims">
              <summary>Prohibited claims</summary>
              <ul>
                {record.prohibitedClaims.map((claim) => <li key={claim}>{claim}</li>)}
              </ul>
            </details>

            <section className="aspect-coverage-previews" aria-label={`${record.id} previews`}>
              <h4>Fixture Previews</h4>
              {record.previews.map((preview) => (
                <PreviewCard key={preview.fixtureId} preview={preview} />
              ))}
            </section>
          </article>
        ))}
      </section>
    </section>
  );
}

function PreviewCard({ preview }: { preview: PreviewRecord }) {
  return (
    <article className="aspect-coverage-preview">
      <header>
        <div>
          <strong>{preview.fixtureId}</strong>
          <span>{titlePart(preview.confidence)}{preview.contained ? " · contained pattern" : ""}</span>
        </div>
        <span className={`ui-pill admin-status ${preview.validation.ok ? "status-live" : "status-draft"}`}>
          {preview.validation.ok ? "valid" : "blocked"}
        </span>
      </header>
      <div className="aspect-coverage-preview-meta">
        <span>Selected: {preview.resolverSource.contentLevel}</span>
        <span>Record: {preview.resolverSource.recordId}</span>
        <span>Changed: {joinOrNone(preview.changedFields)}</span>
        <span>Missing slots: {joinOrNone(preview.authored.diagnostics.missingSlots)}</span>
        <span>Skipped: {joinOrNone(preview.authored.diagnostics.skippedSections)}</span>
        <span>Warnings: {joinOrNone(preview.validation.warnings.concat(preview.authored.diagnostics.validationWarnings ?? []))}</span>
      </div>
      <div className="aspect-coverage-copy-compare">
        <CopyColumn title="Authored result" copy={preview.authored} />
        <CopyColumn title="Fallback result" copy={preview.fallback} />
      </div>
      {!preview.validation.ok && (
        <div className="aspect-warning-list">
          {preview.validation.errors.map((error) => <span key={error}>{error}</span>)}
        </div>
      )}
    </article>
  );
}

function CopyColumn({ title, copy }: { title: string; copy: ResolvedCopy }) {
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
