import type { ReactNode } from "react";

type SettingsRouteProps = {
  children: ReactNode;
};

export function SettingsRoute({ children }: SettingsRouteProps) {
  return <>{children}</>;
}
