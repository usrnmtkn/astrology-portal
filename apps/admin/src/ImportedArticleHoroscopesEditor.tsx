import { StudioInput, StudioTextarea } from "./StudioControls";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import type { ArticleHoroscopeSection } from '../../web/src/content/skyArticleHoroscopes.mjs';

export default function ImportedArticleHoroscopesEditor({sections,onChange}:{sections:unknown;onChange:(sections:Record<string,unknown>)=>void}) {
  const section = (sections as {articleHoroscopes?: ArticleHoroscopeSection})?.articleHoroscopes;
  if (!section) return null;
  const update = (next:typeof section) => onChange({...sections as Record<string,unknown>,articleHoroscopes:next});
  return <details className="admin-workspace-details admin-sky-related-group admin-diagnostics-details" open>
    <AdminDisclosureSummary><span>House horoscopes</span>{' '}<strong>{section.passages.length ? `${section.passages.length}/12 imported` : 'Template'}</strong></AdminDisclosureSummary>
    <p className="admin-sky-related-help">These passages belong to this article. Save stores the article and its horoscopes together. Review and publication apply to the saved version.</p>
    <label className="admin-review-copy-editor"><span>Horoscope section heading</span><StudioInput aria-label="Horoscope section heading" value={section.heading} onChange={event=>update({...section,heading:event.target.value})}/></label>
    <label className="admin-review-copy-editor"><span>Horoscope introduction</span><StudioTextarea aria-label="Horoscope introduction" value={section.introduction} onChange={event=>update({...section,introduction:event.target.value})}/></label>
    <div className="admin-sky-house-grid admin-lunar-coverage-row-list">
      {section.passages.map((passage,index)=><article className="admin-hook-detail-section has-passage" key={passage.risingSign}>
        <header className="admin-fallback-diagnostic-heading"><strong>{passage.heading.replace(/^###\s*/, '')}</strong><span>House {passage.house}</span></header>
        <label className="admin-review-copy-editor"><span>Complete horoscope</span><StudioTextarea aria-label={`${passage.risingSign} rising horoscope`} value={passage.body} onChange={event=>update({...section,passages:section.passages.map((entry,i)=>i===index?{...entry,body:event.target.value}:entry)})}/></label>
      </article>)}
    </div>
  </details>;
}
