import { useRef, useState } from 'react';
import { StudioButton, StudioInput } from './StudioControls';
import { AdminSelect } from './AdminNativeControls';
import { csvChanges, csvContentType, csvMaxBytes, csvMaxRows, csvRecordForRow, csvUnavailableReason, csvWantsPublication, readStudioCsv, writeStudioCsv, type CsvContentRow, type CsvRecord } from './studioCsv';

type Preview = { record: CsvRecord; changes: ReturnType<typeof csvChanges>; row?: CsvContentRow; publish?: boolean; error?: string; saved?: boolean; published?: boolean };
type Props = {
  rows: CsvContentRow[]; selectedIds: Set<string>; disabled: boolean;
  loadRow: (id: string) => Promise<CsvContentRow>;
  saveRow: (record: CsvRecord) => Promise<CsvContentRow>;
  publishRow: (row: CsvContentRow) => Promise<CsvContentRow>;
  onBusy: (busy: boolean) => void;
  onResult: (message: string) => void;
};
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error);
export default function StudioCsvTools({ rows, selectedIds, disabled, loadRow, saveRow, publishRow, onBusy, onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<Preview[]>([]);
  const [needsReload, setNeedsReload] = useState(false);
  const [exportIds, setExportIds] = useState<Set<string>>(() => new Set(selectedIds));
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selectionLimit, setSelectionLimit] = useState(50);
  const file = useRef<HTMLInputElement>(null);
  const working = useRef(false);
  const selected = rows.filter(row => exportIds.has(row.id));
  const scope = selected.length ? selected : rows;
  const saved = scope.filter(row => !row.id.startsWith('package:') && row.status !== 'ARCHIVED');
  const types = [...new Set(saved.map(csvContentType))].sort();
  const chosenType = types.includes(type) ? type : types.length === 1 ? types[0] : '';
  const selectable = rows.filter(row => !row.id.startsWith('package:') && row.status !== 'ARCHIVED');
  const changed = preview.filter(item => item.changes.length && !item.error && !item.saved);
  const pending = preview.filter(item => (item.changes.length || item.publish) && !item.error && !item.saved);
  const toPublish = pending.filter(item => item.publish);
  const errors = preview.filter(item => item.error);

  async function run(work: () => Promise<void>) {
    if (working.current || disabled) return;
    working.current = true; setBusy(true); onBusy(true);
    try { await work(); } catch (error) { setMessage(errorText(error)); }
    finally { working.current = false; setBusy(false); onBusy(false); }
  }
  async function exportCsv() {
    await run(async () => {
      if (!chosenType) throw new Error('Choose a content type to export.');
      const candidates = saved.filter(row => csvContentType(row) === chosenType);
      if (candidates.length > csvMaxRows) throw new Error(`Filter or select up to ${csvMaxRows} rows before exporting.`);
      const records: CsvRecord[] = [], excluded: string[] = [];
      // Bound document hydration. A failed read never produces a partial export.
      for (let offset = 0; offset < candidates.length; offset += 4) {
        setMessage(`Loading full text: ${offset} of ${candidates.length}…`);
        const documents = await Promise.all(candidates.slice(offset, offset + 4).map(row => loadRow(row.id)));
        for (const row of documents) {
          const reason = csvUnavailableReason(row);
          if (reason) excluded.push(`${row.headline || row.content_key}: ${reason}`);
          else records.push(csvRecordForRow(row));
        }
      }
      if (!records.length) throw new Error(excluded.join('\n') || 'No saved rows match this export.');
      const csv = writeStudioCsv(records);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `content-studio-${chosenType.replace(/[^a-z0-9_-]/gi, '-')}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Exported ${records.length} rows.${excluded.length ? ` ${excluded.length} excluded:\n${excluded.join('\n')}` : ''}`);
    });
  }
  async function importCsv(input: File) {
    setPreview([]); setNeedsReload(false);
    await run(async () => {
      if (input.size > csvMaxBytes) throw new Error('CSV files are limited to 10 MB.');
      const records = readStudioCsv(await input.text());
      const result: Preview[] = [];
      for (let offset = 0; offset < records.length; offset += 4) {
        setMessage(`Checking saved versions: ${offset} of ${records.length}…`);
        result.push(...await Promise.all(records.slice(offset, offset + 4).map(async record => {
          try {
            const row = await loadRow(record.content_id);
            const changes = csvChanges(row, record);
            return { record, changes, row, publish: csvWantsPublication(record) };
          }
          catch (error) { return { record, changes: [], error: errorText(error) }; }
        })));
      }
      setPreview(result);
      setMessage('Review the complete changed fields below. Empty new values clear that field. Rows removed from the CSV remain unchanged.');
    });
  }
  async function saveImport() {
    await run(async () => {
      let count = 0, published = 0;
      const publicationSummary = () => `${count} ${count === 1 ? 'edit' : 'edits'} saved; ${published} ${published === 1 ? 'row' : 'rows'} published.`;
      const requestedPublication = toPublish.length > 0;
      for (const item of pending) {
        let draftSaved = false;
        setMessage(`Saving ${item.record.title || item.record.content_key}…`);
        try {
          let row = item.row!;
          const confirmText = (result: CsvContentRow) => {
            const actual = csvRecordForRow(result);
            if (result.content_key !== item.record.content_key || Object.keys(actual).some(column =>
              !['format', 'content_id', 'saved_version', 'content_type', 'publish'].includes(column) && actual[column] !== item.record[column]
            )) throw new Error('The saved text could not be confirmed exactly.');
          };
          if (item.changes.length) {
            row = await saveRow(item.record);
            if (row.status !== 'DRAFT') throw new Error('The API did not confirm a saved draft.');
            confirmText(row);
            count++; draftSaved = true;
            setPreview(current => current.map(entry => entry.record.content_id === item.record.content_id ? { ...entry, row, saved: true } : entry));
          }
          if (item.publish) {
            setMessage(`Publishing ${item.record.title || item.record.content_key}…`);
            row = await publishRow(row);
            if (row.status !== 'LIVE') throw new Error('Publication was not confirmed.');
            confirmText(row);
            published++;
            setPreview(current => current.map(entry => entry.record.content_id === item.record.content_id ? { ...entry, row, saved: true, published: true } : entry));
          }
        } catch (error) {
          setNeedsReload(true);
          setPreview(current => current.map(entry => entry.record.content_id === item.record.content_id ? { ...entry, error: errorText(error) } : entry));
          const receipt = requestedPublication ? publicationSummary() : `${count} ${count === 1 ? 'draft' : 'drafts'} confirmed saved.`;
          const result = `${receipt} Stopped at ${item.record.content_key}: ${errorText(error)}${draftSaved && item.publish ? ' This edit was saved as a draft; publication was not confirmed.' : ''} Check its current status and export current rows before retrying; this request may have reached storage.`;
          setMessage(result); onResult(result);
          return;
        }
      }
      const result = requestedPublication ? `${publicationSummary()} Other saved edits remain drafts.`
        : `${count} ${count === 1 ? 'draft' : 'drafts'} saved. Review and publish them in Studio when ready.`;
      setMessage(result); onResult(result);
    });
  }
  return <div className="studio-csv-tools">
    <div className="admin-toolbar-actions">
      <StudioButton type="button" disabled={disabled || busy} onClick={() => { setOpen(true); setMessage(''); }}>Export CSV</StudioButton>
      <StudioButton type="button" disabled={disabled || busy} onClick={() => { setOpen(true); file.current?.click(); }}>Import CSV</StudioButton>
      <input ref={file} className="studio-csv-file" type="file" accept=".csv,text/csv" aria-label="Import Content Studio CSV" disabled={busy || disabled} onChange={event => {
        const input = event.target.files?.[0]; event.target.value = ''; if (input) { setOpen(true); void importCsv(input); }
      }} />
    </div>
    {open && <section className="admin-detail-card studio-csv-panel" aria-label="CSV offline editing" aria-busy={busy}>
      <p>Export saved text, edit it in Excel or Numbers, then save as UTF-8 CSV and import it here. Keep the identity columns and variable names unchanged. Set publish to yes for rows you want live, or no to save edits as drafts. Nothing changes until you review and save this import.</p>
      <p className="admin-field-hint">{selected.length ? `${selected.length} selected ${selected.length === 1 ? 'row' : 'rows'}` : `${rows.length} rows matching these filters`}. Export includes all matching pages. Unsaved sources and archived rows are excluded. Structured editions use their dedicated editor.</p>
      <details className="admin-disclosure" onToggle={event => setSelectionOpen(event.currentTarget.open)}>
        <summary>Choose rows for this export</summary>
        <p className="admin-field-hint">Leave all unchecked to export every matching saved row.</p>
        <StudioButton type="button" disabled={busy || disabled || !exportIds.size} onClick={() => setExportIds(new Set())}>Clear export selection</StudioButton>
        <div className="studio-csv-selection">
          {selectionOpen && selectable.slice(0, selectionLimit).map(row => <label key={row.id}>
            <StudioInput type="checkbox" aria-label={`Export ${row.headline || row.content_key}`} disabled={busy || disabled}
              checked={exportIds.has(row.id)} onChange={() => setExportIds(current => {
                const next = new Set(current); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next;
              })} />
            <span>{row.headline || row.content_key}</span>
          </label>)}
        </div>
        {selectionOpen && selectable.length > selectionLimit && <StudioButton type="button" disabled={busy || disabled} onClick={() => setSelectionLimit(value => value + 50)}>Show more export rows</StudioButton>}
      </details>
      <div className="admin-toolbar-actions">
        <label className="admin-field">Content type
          <AdminSelect aria-label="CSV content type" value={chosenType} disabled={busy || disabled} onChange={event => setType(event.target.value)}>
            <option value="">Choose a content type</option>
            {types.map(value => <option key={value} value={value}>{value.replaceAll('-', ' ')} ({saved.filter(row => csvContentType(row) === value).length})</option>)}
          </AdminSelect>
        </label>
        <StudioButton type="button" disabled={busy || disabled || !chosenType || !saved.length} onClick={() => void exportCsv()}>Download CSV</StudioButton>
        <StudioButton type="button" disabled={busy || disabled} onClick={() => { setOpen(false); setPreview([]); setMessage(''); }}>Close CSV</StudioButton>
      </div>
      {message && <p className="studio-csv-text" role="status">{message}</p>}
      {preview.length > 0 && <>
        <p>{changed.length} changed · {preview.filter(item => !item.changes.length && !item.error).length} unchanged · {errors.length} conflicts or errors · {preview.filter(item => item.saved).length} saved · {toPublish.length} to publish · {preview.filter(item => item.published).length} published</p>
        {changed.some(item => item.row?.status === 'LIVE' && !item.publish) && <p>These edits include live content. Studio creates a separate revision where supported. Otherwise, saving moves the live row to draft until you publish it again.</p>}
        {toPublish.length > 0 && <p>Save &amp; publish approves the marked rows for publication after their edits are saved. Studio’s existing publication checks must pass. If publication stops, saved drafts are retained and later rows are not submitted.</p>}
        {preview.filter(item => item.changes.length || item.error || csvWantsPublication(item.record)).map(item => <details className="admin-disclosure" data-csv-preview key={item.record.content_id}>
          <summary>{item.record.title || item.record.content_key} — {item.error ? 'Needs attention' : item.published ? 'Published' : item.saved ? 'Saved draft' : item.publish ? `Will publish · ${item.changes.length} changed fields` : `${item.changes.length} changed fields · Save draft`}</summary>
          {item.error && <p role="alert">{item.error}</p>}
          {item.changes.map(change => <div key={change.column} className="studio-csv-change">
            <strong>{change.column}</strong>
            <div className="studio-csv-diff">
              <div><span className="admin-field-hint">Current</span><p className="studio-csv-text">{change.before || '(empty)'}</p></div>
              <div><span className="admin-field-hint">From CSV{change.after === '' ? ' — clears this field' : ''}</span><p className="studio-csv-text">{change.after || '(empty)'}</p></div>
            </div>
          </div>)}
        </details>)}
        <StudioButton type="button" disabled={busy || disabled || !pending.length || errors.length > 0 || needsReload} onClick={() => void saveImport()}>{toPublish.length ? 'Save & publish' : `Save ${changed.length} ${changed.length === 1 ? 'draft' : 'drafts'}`}</StudioButton>
        {errors.length > 0 && <p className="admin-field-hint">Resolve the listed rows and import the CSV again before saving.</p>}
      </>}
    </section>}
  </div>;
}
