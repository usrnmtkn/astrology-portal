import { useState } from 'react';
import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";
import { AdminSelect } from "./AdminNativeControls";
import StudioSidePanel from './StudioSidePanel';
import type { ArticleHoroscopeSection } from '../../web/src/content/skyArticleHoroscopes.mjs';

export default function ImportedArticleHoroscopesEditor({sections,onChange}:{sections:unknown;onChange:(sections:Record<string,unknown>)=>void}) {
  const [open, setOpen] = useState(false), [rising, setRising] = useState('aries');
  const section = (sections as {articleHoroscopes?: ArticleHoroscopeSection})?.articleHoroscopes;
  if (!section) return null;
  const update = (next:typeof section) => onChange({...sections as Record<string,unknown>,articleHoroscopes:next});
  const passage = section.passages.find(entry => entry.risingSign === rising) ?? section.passages[0];
  return <section className="studio-section" aria-label="Article horoscope fields">
    <StudioButton onClick={() => setOpen(true)}>Edit article horoscopes</StudioButton>
    {open && <StudioSidePanel title="Article horoscopes" onClose={() => setOpen(false)}>
    <p className="admin-sky-related-help">These passages belong to this source. Changes stay in its editor when this panel closes. Save the source to keep them; review and publication apply to that saved version.</p>
    <label className="admin-review-copy-editor"><span>Horoscope section heading</span><StudioInput aria-label="Horoscope section heading" value={section.heading} onChange={event=>update({...section,heading:event.target.value})}/></label>
    <label className="admin-review-copy-editor"><span>Horoscope introduction</span><StudioTextarea aria-label="Horoscope introduction" value={section.introduction} onChange={event=>update({...section,introduction:event.target.value})}/></label>
    {passage && <>
      <label>Rising sign<AdminSelect aria-label="Article horoscope rising sign" value={passage.risingSign} onChange={event => setRising(event.target.value)}>
        {section.passages.map(entry => <option key={entry.risingSign} value={entry.risingSign}>{entry.heading.replace(/^###\s*/, '')}</option>)}
      </AdminSelect></label>
      <article className="admin-hook-detail-section has-passage" key={passage.risingSign}>
        <header className="admin-fallback-diagnostic-heading"><strong>{passage.heading.replace(/^###\s*/, '')}</strong><span>House {passage.house}</span></header>
        <label className="admin-review-copy-editor"><span>Complete horoscope</span><StudioTextarea aria-label={`${passage.risingSign} rising horoscope`} value={passage.body} onChange={event=>update({...section,passages:section.passages.map(entry=>entry.risingSign===passage.risingSign?{...entry,body:event.target.value}:entry)})}/></label>
      </article>
    </>}
    <StudioButton onClick={() => setOpen(false)}>Done</StudioButton>
    </StudioSidePanel>}
  </section>;
}
