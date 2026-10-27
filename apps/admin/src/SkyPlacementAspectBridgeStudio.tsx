import { useState } from 'react';
import { AdminSelect } from './AdminNativeControls';
import { StudioButton } from './StudioControls';
import { placementBridgeAspects, placementBridgeBodies, placementBridgeNatalPoints, skyPlacementAspectBridgeKey } from '../../web/src/content/skyPlacementAspectBridge';

const title = (value: string) => value.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
export default function SkyPlacementAspectBridgeStudio({ onEdit, busy }: { onEdit: (key: string) => void; busy: boolean }) {
  const [house, setHouse] = useState(8);
  const [transiting, setTransiting] = useState('venus');
  const [aspect, setAspect] = useState('trine');
  const [natal, setNatal] = useState('mars');
  const key = skyPlacementAspectBridgeKey({ house, transiting, aspect, natal })!;
  return <section className="studio-surface studio-section" aria-label="House × aspect bridges">
    <header className="admin-section-heading-row"><div>
      <h2>House × aspect bridges</h2>
      <p>Connect the house reading to an aspect in “Where it lands for you.”</p>
    </div></header>
    <p>Each reading uses its timing, your published bridge, and the complete existing aspect passage. Write only the connecting passage here; the reader supplies timing once.</p>
    <div className="admin-review-filter-grid admin-filter-form">
      <label>House<AdminSelect value={house} onChange={event => setHouse(Number(event.target.value))}>
        {Array.from({ length: 12 }, (_, index) => index + 1).map(value => <option key={value} value={value}>House {value}</option>)}
      </AdminSelect></label>
      <label>Transiting planet<AdminSelect value={transiting} onChange={event => setTransiting(event.target.value)}>
        {placementBridgeBodies.map(value => <option key={value} value={value}>{title(value)}</option>)}
      </AdminSelect></label>
      <label>Aspect<AdminSelect value={aspect} onChange={event => setAspect(event.target.value)}>
        {placementBridgeAspects.map(value => <option key={value} value={value}>{title(value)}</option>)}
      </AdminSelect></label>
      <label>Natal point<AdminSelect value={natal} onChange={event => setNatal(event.target.value)}>
        {placementBridgeNatalPoints.map(value => <option key={value} value={value}>{title(value)}</option>)}
      </AdminSelect></label>
    </div>
    <StudioButton disabled={busy} onClick={() => onEdit(key)}>Open bridge</StudioButton>
    <p className="admin-field-hint">Saved bridges apply to this house and contact across zodiac signs. Saving a draft and publishing remain separate actions.</p>
  </section>;
}
