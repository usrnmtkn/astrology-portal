import { lazy, type ComponentProps, type ComponentType, type ReactNode } from "react";

type PanelErrorProps = { error?: unknown };

export function StudioPanelLoadError({ children, error }: PanelErrorProps & { children?: ReactNode }) {
  return <div className="app-loading" role="alert">
    <span>This section could not load. Save your changes, then reload the page to try again.</span>
    {error !== undefined && <details><summary>Error details</summary><p>{error instanceof Error ? `${error.name}: ${error.message}` : String(error)}</p></details>}
    {children}
  </div>;
}

function PanelLoadError(props: PanelErrorProps) { return <StudioPanelLoadError {...props} />; }

/** Contain an optional panel's import failure below its existing draft owner. */
export function studioLazy<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
  FailedPanel: ComponentType<ComponentProps<T> & PanelErrorProps> = PanelLoadError
) {
  return lazy<ComponentType<ComponentProps<T>>>(() => load().catch(error => {
    console.error("Content Studio panel import failed:", error);
    return { default: (props: ComponentProps<T>) => <FailedPanel {...props} error={error} /> };
  }));
}
