import type { ElementType, HTMLAttributes, ReactNode } from "react";

type Gap = "xs" | "sm" | "md" | "lg" | "xl";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type StackProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  gap?: Gap;
  children: ReactNode;
};

export function Stack({ as: Tag = "div", gap = "lg", className, children, ...props }: StackProps) {
  return <Tag className={cx("studio-stack", className)} data-gap={gap} {...props}>{children}</Tag>;
}

type InlineProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  gap?: Gap;
  align?: "start" | "center";
  justify?: "start" | "between" | "end";
  children: ReactNode;
};

export function Inline({ as: Tag = "div", gap = "sm", align = "start", justify, className, children, ...props }: InlineProps) {
  return (
    <Tag
      className={cx("studio-inline", className)}
      data-gap={gap}
      data-align={align}
      data-justify={justify}
      {...props}
    >
      {children}
    </Tag>
  );
}

type BoxProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padding?: "sm" | "md" | "lg";
  radius?: "sm" | "md";
  children: ReactNode;
};

export function Box({ as: Tag = "div", padding, radius, className, children, ...props }: BoxProps) {
  return (
    <Tag className={cx("studio-box", className)} data-padding={padding} data-radius={radius} {...props}>
      {children}
    </Tag>
  );
}

type GridProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
};

export function Grid({ as: Tag = "div", className, children, ...props }: GridProps) {
  return <Tag className={cx("studio-grid", className)} {...props}>{children}</Tag>;
}

type ContainerProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export function Container({ className, children, ...props }: ContainerProps) {
  return <div className={cx("studio-container", className)} {...props}>{children}</div>;
}

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: "p" | "span" | "small";
  size?: "body" | "meta" | "label";
  tone?: "primary" | "secondary";
  children: ReactNode;
};

export function Text({ as: Tag = "p", size = "body", tone = "primary", className, children, ...props }: TextProps) {
  return (
    <Tag className={cx("studio-text", className)} data-size={size} data-tone={tone} {...props}>
      {children}
    </Tag>
  );
}
