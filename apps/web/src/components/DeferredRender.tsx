import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type DeferredRenderProps = {
  children: ReactNode;
  delay?: number;
  fallback?: ReactNode;
};

export function DeferredRender({ children, delay = 80, fallback = null }: DeferredRenderProps) {
  const [ready, setReady] = useState(() => typeof window === "undefined");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setReady(true), delay);

    return () => window.clearTimeout(timeoutId);
  }, [delay]);

  return ready ? <>{children}</> : <>{fallback}</>;
}
