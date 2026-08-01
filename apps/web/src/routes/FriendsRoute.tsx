import type { ReactNode } from "react";
import "../styles/friends-route.css";
import "../styles/friends-compare-picker.css";

type FriendsRouteProps = {
  children: ReactNode;
};

export function FriendsRoute({ children }: FriendsRouteProps) {
  return <>{children}</>;
}
