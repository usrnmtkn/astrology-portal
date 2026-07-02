import type { ReactNode } from "react";

type SkyRouteProps = {
  children: ReactNode;
};

export function SkyRoute({ children }: SkyRouteProps) {
  return <>{children}</>;
}
