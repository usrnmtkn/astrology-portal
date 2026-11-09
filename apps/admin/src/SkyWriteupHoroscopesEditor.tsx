import { Suspense,useState, type ReactNode } from 'react';
import {studioLazy as lazy} from './studioLazy';
import StudioSidePanel from './StudioSidePanel';
import { StudioButton, StudioTextarea } from './StudioControls';
import { AdminDisclosureSummary, AdminSelect } from './AdminNativeControls';
import { WRITEUP_HOROSCOPE_SIGNS, type WriteupHoroscope } from '../../../src/shared/skyWriteupHoroscopes.js';
const SkyWriteupHoroscopeWriter=lazy(()=>import('./SkyWriteupHoroscopeWriter'));

type Props = {
  passages?: WriteupHoroscope[]; period: string; busy: boolean; canSave: boolean;
  message: string; error: string;
  open: boolean; onOpenChange: (open: boolean) => void; publicationControls: ReactNode;
  row?:{id:string;updated_at?:string|null}|null;request:<T>(path:string,options?:RequestInit)=>Promise<T>;onBusyChange:(busy:boolean)=>void;aiDirty:boolean;onAiDirtyChange:(dirty:boolean)=>void;
  onChange: (passages: WriteupHoroscope[]) => void; onSave: () => void;
  missingFields: string[]; onPublish: () => void; publishDisabled: boolean;
};
const title = (sign: string) => sign[0].toUpperCase() + sign.slice(1);

export default function SkyWriteupHoroscopesEditor(props: Props) {
  const [sign, setSign] = useState('aries');
  const [aiOpen,setAiOpen]=useState(false);
  const discardAi=()=>!props.aiDirty||window.confirm('Discard the unused AI draft and direction? Your sign readings are kept.');
  const close=()=>{if(!props.busy&&discardAi()){setAiOpen(false);props.onOpenChange(false);}};
  const passages = WRITEUP_HOROSCOPE_SIGNS.map(sign => ({ sign, body: props.passages?.find(passage => passage.sign === sign)?.body ?? '' }));
  const complete = passages.filter(passage => passage.body.trim()).length;
  return <>
    <StudioButton disabled={props.busy} onClick={() => props.onOpenChange(true)}>Horoscopes</StudioButton>
    {props.open && <StudioSidePanel title="Planetary horoscopes" className="studio-writeup-horoscopes-panel" busy={props.busy} onClose={close} actions={<>
      <StudioButton disabled={!props.canSave} onClick={props.onSave}>Save draft</StudioButton>
      <StudioButton className="admin-primary-button" disabled={props.publishDisabled || complete !== 12} onClick={props.onPublish}>Publish</StudioButton>
    </>}>
      <div className="studio-editor-context"><span>{props.period}</span><span role="status">{complete}/12 complete</span></div>
      {props.missingFields.length > 0 && <div className="admin-toolbar-actions"><span className="admin-field-hint">To publish: {props.missingFields.join(', ')}</span><StudioButton onClick={close}>Edit article</StudioButton></div>}
      <div className="studio-entry-editor">
      <label className="studio-entry-select"><span>Sign</span><AdminSelect aria-label="Horoscope sign" value={sign} disabled={props.busy} onChange={event => { if (discardAi()) { setAiOpen(false); setSign(event.target.value); } }}>
        {passages.map(passage => <option key={passage.sign} value={passage.sign}>{title(passage.sign)}{passage.body.trim() ? ' ✓' : ''}</option>)}
      </AdminSelect></label>
      <nav className="studio-entry-navigation" aria-label="Write-up horoscope signs">
        {passages.map(passage => <StudioButton key={passage.sign} aria-pressed={sign === passage.sign} disabled={props.busy}
          onClick={() => {if(passage.sign!==sign&&discardAi()){setAiOpen(false);setSign(passage.sign);}}}>{title(passage.sign)}{passage.body.trim() ? ' ✓' : ''}</StudioButton>)}
      </nav>
      <div className="studio-entry-writing">
      <label className="admin-review-copy-editor"><span>{title(sign)} &amp; {title(sign)} Rising</span>
        <StudioTextarea aria-label={`${title(sign)} write-up horoscope`} rows={12} disabled={props.busy}
          value={passages.find(passage => passage.sign === sign)!.body}
          onChange={event => props.onChange(passages.map(passage => passage.sign === sign ? { ...passage, body: event.target.value } : passage))} />
      </label>
    <StudioButton disabled={props.busy} onClick={()=>{if(!aiOpen||discardAi())setAiOpen(value=>!value);}}>{aiOpen?'Close AI draft':'Write with AI'}</StudioButton>
      {aiOpen&&<Suspense fallback={<p role="status">Loading horoscope writer…</p>}><SkyWriteupHoroscopeWriter row={props.row} sign={sign}
        currentText={passages.find(p=>p.sign===sign)!.body} disabled={props.busy} request={props.request} onBusyChange={props.onBusyChange} onDirtyChange={props.onAiDirtyChange}
        onUse={body=>props.onChange(passages.map(p=>p.sign===sign?{...p,body}:p))}/></Suspense>}
      </div></div>
      {props.message.startsWith('Draft saved') && <p role="status">{props.message}</p>}{props.error && <p role="alert">{props.error}</p>}
      <div aria-label="Horoscope publication">{props.publicationControls}</div>
      <details className="studio-contained-disclosure"><AdminDisclosureSummary>Help</AdminDisclosureSummary>
        <p>Saved with this article. Complete all 12 signs to publish.</p>
        <p>Published readings appear in the article and Planets for this period. Evergreen readings cover periods without a published reading.</p>
      </details>
    </StudioSidePanel>}
  </>;
}
