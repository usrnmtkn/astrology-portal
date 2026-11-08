import { useState, type ReactNode } from 'react';
import StudioSidePanel from './StudioSidePanel';
import { StudioButton, StudioTextarea } from './StudioControls';
import { WRITEUP_HOROSCOPE_SIGNS, type WriteupHoroscope } from '../../../src/shared/skyWriteupHoroscopes.js';

type Props = {
  passages?: WriteupHoroscope[]; period: string; busy: boolean; canSave: boolean; articleReady: boolean;
  message: string; error: string;
  open: boolean; onOpenChange: (open: boolean) => void; publicationControls: ReactNode;
  onChange: (passages: WriteupHoroscope[]) => void; onSave: () => void;
};
const title = (sign: string) => sign[0].toUpperCase() + sign.slice(1);

export default function SkyWriteupHoroscopesEditor(props: Props) {
  const [sign, setSign] = useState('aries');
  const passages = WRITEUP_HOROSCOPE_SIGNS.map(sign => ({ sign, body: props.passages?.find(passage => passage.sign === sign)?.body ?? '' }));
  const complete = passages.filter(passage => passage.body.trim()).length;
  return <>
    <StudioButton disabled={props.busy} onClick={() => props.onOpenChange(true)}>Horoscopes</StudioButton>
    {props.open && <StudioSidePanel title="Horoscopes for this write-up" className="studio-writeup-horoscopes-panel" busy={props.busy} onClose={() => props.onOpenChange(false)}>
      <p>{props.period}</p>
      <p>Enter a reading for each sign. These horoscopes belong to this write-up and are saved with its draft.</p>
      <p role="status">{complete} of 12 signs entered. You can save a partial draft; complete all 12 before publishing horoscopes.</p>
      <div className="admin-horoscope-signs" role="group" aria-label="Write-up horoscope signs">
        {passages.map(passage => <StudioButton key={passage.sign} aria-pressed={sign === passage.sign} disabled={props.busy}
          onClick={() => setSign(passage.sign)}>{title(passage.sign)}{passage.body.trim() ? ' ✓' : ''}</StudioButton>)}
      </div>
      <label className="admin-review-copy-editor"><span>{title(sign)} &amp; {title(sign)} Rising</span>
        <StudioTextarea aria-label={`${title(sign)} write-up horoscope`} rows={16} disabled={props.busy}
          value={passages.find(passage => passage.sign === sign)!.body}
          onChange={event => props.onChange(passages.map(passage => passage.sign === sign ? { ...passage, body: event.target.value } : passage))} />
      </label>
      <div className="admin-toolbar-actions"><StudioButton className="admin-primary-button" disabled={!props.canSave}
        onClick={props.onSave}>Save draft</StudioButton><StudioButton disabled={props.busy} onClick={() => props.onOpenChange(false)}>Back to write-up</StudioButton></div>
      {!props.articleReady && <p>Add the write-up’s title, content and summary before saving.</p>}
      {props.message && <p role="status">{props.message}</p>}{props.error && <p role="alert">{props.error}</p>}
      <p>These readings publish with the write-up in its Horoscopes by rising sign section. Save the draft, then use Publication below.</p>
      {props.publicationControls}
    </StudioSidePanel>}
  </>;
}
