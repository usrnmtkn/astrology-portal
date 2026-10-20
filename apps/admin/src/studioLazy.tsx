import { lazy, type ComponentProps, type ComponentType, type ReactNode } from "react";

export function StudioPanelLoadError({ children }: { children?: ReactNode }) {
  return <div className="app-loading" role="alert">
    <span>This section could not load. Save your changes, then reload the page to try again.</span>
    {children}
  </div>;
}

function PanelLoadError() { return <StudioPanelLoadError />; }

/** Contain an optional panel's import failure below its existing draft owner. */
export function studioLazy<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
  FailedPanel: ComponentType<ComponentProps<T>> = PanelLoadError
) {
  return lazy<ComponentType<ComponentProps<T>>>(() => load().catch(() => ({ default: FailedPanel })));
}
