import type { ReactNode } from "react";

type FriendsRouteProps = {
  children: ReactNode;
};

export function FriendsRoute({ children }: FriendsRouteProps) {
  return <>{children}</>;
}
