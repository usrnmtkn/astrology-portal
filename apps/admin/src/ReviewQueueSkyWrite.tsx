import { Component, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { AdminSelect } from "./AdminNativeControls";
import { StudioButton } from "./StudioControls";
import { skyPlacementBodies, skyPlacementSigns } from "./skyWriteupRelations";
import { SKY_WRITING_LIBRARY_GROUPS } from "./skyWritingLibrary";

const titleWord = (value: string) => value.replace(/(^|[-_])([a-z])/gu, (_match, prefix: string, char: string) => (prefix ? " " : "") + char.toUpperCase());

function skyWriteupContentKey(planet: string, sign: string) {
  if (planet === "moon") return `fallback-hook/sky-placement-hook/moon/${sign}`;
  if (planet === "lilith") return `sky-lilith/article/${sign}`;
  if (planet.endsWith("-node")) return `sky-nodes/${planet}/${sign}`;
  return `sky-placement/article/${planet}/${sign}`;
}

const phraseFields = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(field => ({
  id: field.id,
  label: field.label
})));

type Selection = { planet: string; sign: string; motion: "direct" };

type Props = {
  disabled: boolean;
  onOpen: (contentKey: string, label: string, fieldPath: string, selection: Selection) => void;
};

class ReviewQueueSkyWriteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Review Queue Sky placement writing failed", error, info.componentStack);
  }
  render() {
    if (this.state.failed) {
      return <section className="admin-content-filters admin-review-queue-filters" aria-label="Write Sky placement">
        <p role="alert">Sky placement writing could not open on this queue. Use Sky Write-ups for the full library.</p>
      </section>;
    }
    return this.props.children;
  }
}

function ReviewQueueSkyWriteForm({ disabled, onOpen }: Props) {
  const [planet, setPlanet] = useState("sun");
  const [sign, setSign] = useState("virgo");
  const [field, setField] = useState("placementArticle");
  const selection = useMemo<Selection>(() => ({ planet, sign, motion: "direct" }), [planet, sign]);
  const contentKey = skyWriteupContentKey(planet, sign);
  const phrase = phraseFields.find(item => item.id === field);
  const fieldPath = field === "placementArticle" ? "placementArticle" : `ingress.sources.${field}`;
  const label = field === "placementArticle"
    ? `${titleWord(planet)} in ${titleWord(sign)} article`
    : `${phrase?.label ?? field} · ${titleWord(planet)} in ${titleWord(sign)}`;

  return <section className="admin-content-filters admin-review-queue-filters" aria-label="Write Sky placement">
    <p>Choose a planet and sign, then open the article or one phrase. Save and publish stay on this queue. Section templates and composition stay on Sky Write-ups.</p>
    <div className="admin-review-filter-grid admin-filter-form admin-filter-form--three">
      <label>
        <span>Planet or point</span>
        <AdminSelect aria-label="Review queue Sky planet" value={planet} onChange={event => setPlanet(event.target.value)}>
          {skyPlacementBodies.map(body => <option key={body} value={body}>{titleWord(body)}</option>)}
        </AdminSelect>
      </label>
      <label>
        <span>Zodiac sign</span>
        <AdminSelect aria-label="Review queue Sky sign" value={sign} onChange={event => setSign(event.target.value)}>
          {skyPlacementSigns.map(item => <option key={item} value={item}>{titleWord(item)}</option>)}
        </AdminSelect>
      </label>
      <label>
        <span>Writing</span>
        <AdminSelect aria-label="Review queue Sky writing" value={field} onChange={event => setField(event.target.value)}>
          <option value="placementArticle">Placement article</option>
          {SKY_WRITING_LIBRARY_GROUPS.map(group => <optgroup key={group.id} label={group.label}>
            {group.fields.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </optgroup>)}
        </AdminSelect>
      </label>
    </div>
    <div className="admin-new-actions">
      <StudioButton type="button" disabled={disabled || !contentKey} onClick={() => onOpen(contentKey, label, fieldPath, selection)}>
        Open writing
      </StudioButton>
    </div>
  </section>;
}

export default function ReviewQueueSkyWrite(props: Props) {
  return <ReviewQueueSkyWriteBoundary>
    <ReviewQueueSkyWriteForm {...props} />
  </ReviewQueueSkyWriteBoundary>;
}
