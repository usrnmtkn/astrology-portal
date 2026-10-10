import { useEffect, useRef, useState } from 'react';
import { FormattedProse } from '../../../src/shared/components/FormattedProse';
import { PageLoading } from '../../../src/shared/components/PageLoading';
import { calendarTransitionPhrases, calendarTransitionPhraseKeys } from './calendarTransitionPhraseCatalog';
import { AdminSelect } from './AdminNativeControls';
import { StudioButton, StudioInput } from './StudioControls';
import type { Props, Row } from './LunarCalendarWorkspace';

const body = (row: Row) => {
  const draft = (row.sections as { packageDraft?: { body?: string } } | null)?.packageDraft;
  return draft?.body ?? row.body ?? '';
};
const preview = (text: string) => {
  const flat = text.replace(/\s+/gu, ' ').trim();
  return flat.length > 200 ? `${flat.slice(0, 199).replace(/\s+\S*$/u, '')}…` : flat;
};
const groups = [...new Set(calendarTransitionPhrases.map(field => field.group))];

export default function MoonTransitionPhraseWorkspace({ rows, editor, query, onQuery, onEdit, loadRows }: Props) {
  const [group, setGroup] = useState('all');
  const [retry, setRetry] = useState(0);
  const [documents, setDocuments] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const openedFromQuery = useRef('');
  const revision = JSON.stringify(rows.filter(row => calendarTransitionPhraseKeys.includes(row.content_key)).map(row => [row.id, row.updated_at]));
  useEffect(() => {
    let active = true;
    setError('');
    setDocuments(null);
    void loadRows(calendarTransitionPhraseKeys).then(loaded => {
      if (calendarTransitionPhraseKeys.some(key => !loaded.some(row => row.content_key === key && !row.inventory_only))) {
        throw new Error('Some saved phrases could not be loaded.');
      }
      if (active) setDocuments(loaded);
    }).catch(() => { if (active) setError('Could not load your saved transition phrases. Retry to see the latest writing.'); });
    return () => { active = false; };
  }, [loadRows, revision, retry]);
  useEffect(() => {
    const key = query.trim();
    if (!calendarTransitionPhraseKeys.includes(key)) { openedFromQuery.current = ''; return; }
    const row = documents?.find(row => row.content_key === key);
    if (!row || openedFromQuery.current === key) return;
    openedFromQuery.current = key;
    onEdit(row);
  }, [documents, onEdit, query]);
  const entries = calendarTransitionPhrases.flatMap(field => {
    const row = documents?.find(row => row.content_key === field.key);
    return row ? [{ field, row }] : [];
  });
  const filtered = entries.filter(({ field, row }) => (group === 'all' || field.group === group)
    && query.toLowerCase().split(/\s+/u).every(term => `${field.key} ${field.label} ${field.when} ${body(row)}`.toLowerCase().includes(term)));
  return <section className="admin-template-page" aria-label="Moon transition phrases">
    <p>Edit the short phrases used in Calendar Day and Week Moon paragraphs. Dates, signs, and event times are added automatically. Save a draft to keep working, or Save &amp; publish to update the Calendar.</p>
    <p>For the full passage when the Moon changes signs, open <a href="#calendar-writeups?view=lunar-ingresses">Lunar ingresses</a>. For sign-specific season changes, open <a href="#calendar-writeups?view=season-transitions">Season transitions</a>.</p>
    <div className="admin-review-filter-grid studio-surface">
      <label><span>When the phrase appears</span><AdminSelect aria-label="When the phrase appears" value={group} onChange={event => setGroup(event.target.value)}><option value="all">All transition phrases</option>{groups.map(value => <option key={value} value={value}>{value}</option>)}</AdminSelect></label>
      <label><span>Search transition phrases</span><StudioInput aria-label="Search transition phrases" value={query} onChange={event => onQuery(event.target.value)} placeholder="Sign, event, or words from the phrase" /></label>
    </div>
    {editor}
    {error ? <div role="alert" className="admin-error"><p>{error}</p><StudioButton onClick={() => setRetry(value => value + 1)}>Retry phrases</StudioButton></div> : !documents ? <PageLoading compact message="Loading saved transition phrases…" /> : <>
      <p role="status">{filtered.length} {filtered.length === 1 ? 'phrase' : 'phrases'}</p>
      <div className="admin-data-table-shell"><table className="admin-data-table admin-season-transition-table" aria-label="Moon transition phrases">
        <thead><tr><th scope="col">Used when</th><th scope="col">Phrase preview</th><th scope="col" className="admin-col-visibility">Publication</th><th scope="col" className="admin-col-edit"><span className="sr-only">Edit</span></th></tr></thead>
        <tbody>{filtered.map(({ field, row }) => <tr key={field.key}>
          <td data-label="Used when">{field.label}<small className="admin-field-hint">{field.when}</small></td>
          <td data-label="Phrase preview"><FormattedProse className="admin-variable-source-prose" text={preview(body(row))} /></td>
          <td data-label="Publication">{row.id.startsWith('package:') ? 'Original phrase' : row.status === 'LIVE' ? body(row) === row.body ? 'Published' : 'Unpublished changes' : row.status === 'ARCHIVED' ? 'Archived' : 'Draft'}</td>
          <td className="admin-col-edit"><StudioButton aria-label={`Edit ${field.label}`} onClick={() => onEdit(row)}>Edit</StudioButton></td>
        </tr>)}</tbody>
      </table></div>
      {!filtered.length && <div className="admin-empty"><p>No transition phrases match these filters.</p><StudioButton onClick={() => { setGroup('all'); onQuery(''); }}>Reset filters</StudioButton></div>}
    </>}
  </section>;
}
