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
  id
}: {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  scroll?: boolean;
  id?: string;
}) {
  const classes = [
    "segmented-control",
    compact ? "segmented-control--compact" : "",
    scroll ? "segmented-control--scroll" : "",
    className
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} id={id} role="tablist" aria-label={ariaLabel}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`segmented-control__item${isActive ? " segmented-control__item--active" : ""}`}
            key={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
