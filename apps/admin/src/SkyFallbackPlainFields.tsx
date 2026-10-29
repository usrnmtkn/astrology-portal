import { useEffect, useRef } from "react";
import { StudioTextarea } from "./StudioControls";
import { surfaceSection } from "./studio-ds/recipes";
import type { SkyFallbackField } from "./skyFallbackWorkspace";

export default function SkyFallbackPlainFields({ fields, kind, initialField, disabled, onChange }: {
  fields: SkyFallbackField[];
  kind: string;
  initialField?: string;
  disabled: boolean;
  onChange: (path: string, value: unknown) => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!initialField) return;
    const frame = requestAnimationFrame(() => {
      textarea.current?.focus({ preventScroll: true });
      textarea.current?.scrollIntoView({ block: "center", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialField]);
  return <section className={`${surfaceSection} admin-sky-edition-fields`} aria-label="Editable fallback fields">
    <header>
      <p className="admin-eyebrow">Editable copy</p>
      <h3>{kind === "article" ? "Article paragraphs" : "Aspect audience versions"}</h3>
      <p>{kind === "article" ? "Each field is a section of the complete article, not a reusable variable." : "Each field is the complete aspect passage for its named reader surface."}</p>
    </header>
    {fields.map(item => <label className="admin-review-copy-editor" key={item.key}>
      <span>{item.label}</span>
      <small className="admin-field-hint">Internal source field: <code>{item.key}</code></small>
      <StudioTextarea ref={item.key === initialField ? textarea : undefined} disabled={disabled} aria-label={`Fallback field ${item.label}`} data-sky-field={item.key} value={item.value} onChange={event => onChange(item.key, event.target.value)} />
    </label>)}
  </section>;
}
