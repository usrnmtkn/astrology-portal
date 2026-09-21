import { cloneElement, forwardRef, lazy, Suspense, useImperativeHandle, isValidElement, useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { requestStudioReturnAfterSave, returnToStudioParentEditor, studioEditorReturnContext } from "./studioEditorReturn";
import { installStudioStatusCompatibility } from "./studioStatusCompatibility";

installStudioStatusCompatibility();

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function replaceNodeText(node: ReactNode, from: string, to: string): ReactNode {
  if (typeof node === "string") return node.replace(from, to);
  if (Array.isArray(node)) return node.map((child) => replaceNodeText(child, from, to));
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    return cloneElement(node, undefined, replaceNodeText(node.props.children, from, to));
  }
  return node;
}

/** Studio controls preserve native semantics and use one visual contract. */
export const StudioButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(
  function StudioButton({ type = "button", className = "", children, onClick, title, "aria-label": ariaLabel, ...props }, ref) {
    const returnContext = studioEditorReturnContext();
    const text = nodeText(children).trim();
    const nestedEditorClose = Boolean(returnContext && className.split(/\s+/u).includes("admin-editor-close"));
    const visibleCloseControl = Boolean(children && ariaLabel?.startsWith("Close") && !/[A-Za-z]/u.test(text));
    const saveAndPublishReturn = Boolean(returnContext?.saveReturns && text === "Save & publish");
    const saveDraftReturn = Boolean(returnContext?.saveReturns && text === "Save draft");
    const saveMode = saveAndPublishReturn ? "published" : saveDraftReturn ? "any" : null;
    const statusNormalizedChildren = text.includes("Not live") ? replaceNodeText(children, "Not live", "Inactive") : children;
    const displayedChildren = saveAndPublishReturn
      ? replaceNodeText(statusNormalizedChildren, "Save & publish", "Save & return")
      : saveDraftReturn
        ? replaceNodeText(statusNormalizedChildren, "Save draft", "Save draft & return")
        : statusNormalizedChildren;
    const resolvedClassName = `${className}${visibleCloseControl ? " studio-icon-button" : ""}`.trim();

    return <button
      {...props}
      type={type}
      ref={ref}
      data-studio-component="button"
      className={resolvedClassName}
      title={nestedEditorClose ? `Back to ${returnContext?.label ?? "previous editor"}` : title}
      aria-label={nestedEditorClose ? `Back to ${returnContext?.label ?? "previous editor"}` : ariaLabel}
      onClick={(event) => {
        if (nestedEditorClose && returnToStudioParentEditor()) {
          event.preventDefault();
          return;
        }
        if (saveMode) requestStudioReturnAfterSave(saveMode);
        onClick?.(event);
      }}
    >{displayedChildren}</button>;
  }
);

/** Icon-only controls use the same hit target, radius, hover and focus treatment. */
export const StudioIconButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(
  function StudioIconButton({ type = "button", className = "", ...props }, ref) {
    return <button {...props} type={type} ref={ref} data-studio-component="icon-button" className={`studio-icon-button ${className}`.trim()} />;
  }
);

export const StudioInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  function StudioInput(props, ref) {
    return <input {...props} ref={ref} data-studio-component="input" />;
  }
);
const StudioFormattingEditor = lazy(() => import("./StudioFormattingEditor"));
export const StudioTextarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea"> & { formatting?: boolean }>(
  function StudioTextarea({ formatting = true, ...props }, ref) {
    const textarea = useRef<HTMLTextAreaElement>(null);
    const [format, setFormat] = useState<{ value: string; label: string } | null>(null);
    useImperativeHandle(ref, () => textarea.current!, []);
    const close = () => { setFormat(null); requestAnimationFrame(() => textarea.current?.focus()); };
    return <span className="studio-writing-field">
      <textarea {...props} ref={textarea} hidden={Boolean(format)} data-studio-component="textarea" />
      {format ? <Suspense fallback={<span role="status">Loading formatting…</span>}>
        <StudioFormattingEditor value={typeof props.value === "string" ? props.value : format.value} label={format.label} maxLength={props.maxLength} onDone={close} onChange={value => {
          const field = textarea.current;
          if (field && value !== field.value) {
            // Dispatch through the existing native field so every editor keeps its own save/validation path.
            Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(field, value);
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }} />
      </Suspense> : formatting && !props.readOnly && !props.disabled && props.onChange ? <StudioButton className="studio-formatting-open" onClick={() => {
        const field = textarea.current;
        if (field) setFormat({ value: field.value, label: props["aria-label"] || field.labels?.[0]?.querySelector("span")?.textContent?.trim() || "Writing" });
      }} aria-label={`Format ${props["aria-label"] || "text"}`}><span aria-hidden="true">Format text · B / I / Lists</span></StudioButton> : null}
    </span>;
  }
);

export type StudioStatusTone = "live" | "ready" | "draft" | "inactive" | "retired" | "archived" | "error" | "unknown";
export function StudioStatusBadge({ children, tone, title, className = "", "aria-label": ariaLabel }: {
  children: ReactNode;
  tone: StudioStatusTone;
  title?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return <span aria-label={ariaLabel} className={`studio-status-badge status-${tone} ${className}`.trim()} title={title}>{children}</span>;
}

/** Tabs switch a content panel. Arrow keys move focus; Enter/Space selects. */
export function StudioTabs<T extends string>({ label, tabs, value, onValueChange, children, hidden = false }: {
  label: string;
  tabs: readonly { value: T; label: ReactNode }[];
  value: T;
  onValueChange: (value: T) => void;
  children: ReactNode;
  hidden?: boolean;
}) {
  const id = useId();
  const [focused, setFocused] = useState<T | null>(null);
  const tabList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = tabList.current;
    const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    // Route changes can select an off-screen tab without focusing it. Scroll only the strip.
    if (list && selected) list.scrollLeft += selected.getBoundingClientRect().left - list.getBoundingClientRect().left;
  }, [value, hidden]);
  return <div className="studio-tabs">
    {!hidden && <div ref={tabList} role="tablist" aria-label={label}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null); }}
      onKeyDown={event => {
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }}>
      {tabs.map(tab => <StudioButton key={tab.value} id={`${id}-${tab.value}`} role="tab"
        aria-selected={value === tab.value} aria-controls={`${id}-panel`}
        tabIndex={(focused ?? value) === tab.value ? 0 : -1}
        onFocus={event => {
          setFocused(tab.value);
          event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
        }} onClick={() => onValueChange(tab.value)}>
        {tab.label}
      </StudioButton>)}
    </div>}
    <div className="studio-tab-panel" id={`${id}-panel`} role={hidden ? undefined : "tabpanel"}
      aria-labelledby={hidden ? undefined : `${id}-${value}`} tabIndex={hidden ? undefined : 0}>
      {children}
    </div>
  </div>;
}
