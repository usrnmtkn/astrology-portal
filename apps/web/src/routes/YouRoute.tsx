import type { ReactNode } from "react";

type YouRouteProps = {
  children: ReactNode;
};

export function YouRoute({ children }: YouRouteProps) {
  return <>{children}</>;
}
