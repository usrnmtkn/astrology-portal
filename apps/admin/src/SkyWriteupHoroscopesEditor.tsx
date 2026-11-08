import { Suspense,useState, type ReactNode } from 'react';
import {studioLazy as lazy} from './studioLazy';
import StudioSidePanel from './StudioSidePanel';
import { StudioButton, StudioTextarea } from './StudioControls';
import { WRITEUP_HOROSCOPE_SIGNS, type WriteupHoroscope } from '../../../src/shared/skyWriteupHoroscopes.js';
const SkyWriteupHoroscopeWriter=lazy(()=>import('./SkyWriteupHoroscopeWriter'));

type Props = {
  passages?: WriteupHoroscope[]; period: string; busy: boolean; canSave: boolean; articleReady: boolean;
  message: string; error: string;
  open: boolean; onOpenChange: (open: boolean) => void; publicationControls: ReactNode;
  row?:{id:string;updated_at?:string|null}|null;request:<T>(path:string,options?:RequestInit)=>Promise<T>;onBusyChange:(busy:boolean)=>void;aiDirty:boolean;onAiDirtyChange:(dirty:boolean)=>void;
  onChange: (passages: WriteupHoroscope[]) => void; onSave: () => void;
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
    {props.open && <StudioSidePanel title="Horoscopes for this write-up" className="studio-writeup-horoscopes-panel" busy={props.busy} onClose={close}>
      <p>{props.period}</p>
      <p>Enter a reading for each sign. These horoscopes belong to this write-up and are saved with its draft.</p>
      <p role="status">{complete} of 12 signs entered. You can save a partial draft; complete all 12 before publishing horoscopes.</p>
      <div className="admin-horoscope-signs" role="group" aria-label="Write-up horoscope signs">
        {passages.map(passage => <StudioButton key={passage.sign} aria-pressed={sign === passage.sign} disabled={props.busy}
          onClick={() => {if(passage.sign!==sign&&discardAi()){setAiOpen(false);setSign(passage.sign);}}}>{title(passage.sign)}{passage.body.trim() ? ' ✓' : ''}</StudioButton>)}
      </div>
      <label className="admin-review-copy-editor"><span>{title(sign)} &amp; {title(sign)} Rising</span>
        <StudioTextarea aria-label={`${title(sign)} write-up horoscope`} rows={16} disabled={props.busy}
          value={passages.find(passage => passage.sign === sign)!.body}
          onChange={event => props.onChange(passages.map(passage => passage.sign === sign ? { ...passage, body: event.target.value } : passage))} />
      </label>
    <StudioButton disabled={props.busy} onClick={()=>{if(!aiOpen||discardAi())setAiOpen(value=>!value);}}>{aiOpen?'Close AI draft':'Write with AI'}</StudioButton>
      {aiOpen&&<Suspense fallback={<p role="status">Loading horoscope writer…</p>}><SkyWriteupHoroscopeWriter row={props.row} sign={sign}
        currentText={passages.find(p=>p.sign===sign)!.body} disabled={props.busy} request={props.request} onBusyChange={props.onBusyChange} onDirtyChange={props.onAiDirtyChange}
        onUse={body=>props.onChange(passages.map(p=>p.sign===sign?{...p,body}:p))}/></Suspense>}
      <div className="admin-toolbar-actions"><StudioButton className="admin-primary-button" disabled={!props.canSave}
        onClick={props.onSave}>Save draft</StudioButton><StudioButton disabled={props.busy} onClick={close}>Back to write-up</StudioButton></div>
      {!props.articleReady && <p>Add the write-up’s title, content and summary before saving.</p>}
      {props.message && <p role="status">{props.message}</p>}{props.error && <p role="alert">{props.error}</p>}
      <p>These readings publish with the write-up in its Horoscopes by rising sign section. Save the draft, then use Publication below.</p>
      <p>Published readings also appear in Planets for the matching sign and period. When no matching reading is published, the evergreen horoscope is used.</p>
      {props.publicationControls}
    </StudioSidePanel>}
  </>;
}
