import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  value: T;
  label: ReactNode;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  compact = false,
  scroll = false,
  id,
  panelId
}: {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  scroll?: boolean;
  id?: string;
  panelId?: string;
}) {
  const classes = [
    "segmented-control",
    compact ? "segmented-control--compact" : "",
    scroll ? "segmented-control--scroll" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} id={id} role="tablist" aria-label={ariaLabel}>
      {options.map((option, optionIndex) => {
        const isActive = option.value === value;
        const tabId = id ? `${id}-${option.value}-tab` : undefined;

        return (
          <button
            type="button"
            role="tab"
            id={tabId}
            aria-selected={isActive}
            aria-controls={panelId}
            tabIndex={isActive ? 0 : -1}
            className={`segmented-control__item${isActive ? " segmented-control__item--active" : ""}`}
            key={option.value}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

              event.preventDefault();
              const nextIndex = event.key === "Home"
                ? 0
                : event.key === "End"
                  ? options.length - 1
                  : (optionIndex + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
              const nextOption = options[nextIndex];

              if (!nextOption) return;
              onChange(nextOption.value);
              const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
              window.requestAnimationFrame(() => tabs?.[nextIndex]?.focus());
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
