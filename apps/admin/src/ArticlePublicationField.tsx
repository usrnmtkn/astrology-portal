import { validArticlePublishAt } from "../../../src/shared/articleLibrary";
import { StudioInput } from "./StudioControls";

export function ArticlePublicationField({ sections, onChange }: {
  sections: Record<string, unknown>; onChange: (sections: Record<string, unknown>) => void;
}) {
  const at = (sections.articlePublication as { publishAt?: unknown } | null)?.publishAt;
  const date = validArticlePublishAt(at) ? new Date(at) : null;
  const localValue = date ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <label className="admin-title-field">
    <span>Publish date</span>
    <StudioInput type="datetime-local" aria-label="Publish date" value={localValue} onChange={event => {
      const value = event.target.value;
      if (value && !Number.isFinite(Date.parse(value))) return;
      onChange({ ...sections, articlePublication: value ? { publishAt: new Date(value).toISOString(), timeZone: zone } : null });
    }} />
    <small className="admin-field-hint">{zone}. Future dates schedule; blank publishes now. Drafts stay private.</small>
  </label>;
}
