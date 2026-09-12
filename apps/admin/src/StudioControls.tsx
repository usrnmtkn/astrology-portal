import { forwardRef, useId, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

/** Studio controls preserve native semantics and use one visual contract. */
export const StudioButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(
  function StudioButton({ type = "button", ...props }, ref) {
    return <button {...props} type={type} ref={ref} data-studio-component="button" />;
  }
);
export const StudioInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  function StudioInput(props, ref) {
    return <input {...props} ref={ref} data-studio-component="input" />;
  }
);
export const StudioTextarea = forwardRef<HTMLTextAreaElement, ComponentPropsWithoutRef<"textarea">>(
  function StudioTextarea(props, ref) {
    return <textarea {...props} ref={ref} data-studio-component="textarea" />;
  }
);

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
  return <div className="studio-tabs">
    {!hidden && <div role="tablist" aria-label={label}
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
