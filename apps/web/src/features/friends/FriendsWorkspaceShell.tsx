import type { ReactNode } from "react";
import {
  FriendsPageShell,
  type FriendsPageShellProps
} from "../../components/FriendsPageShell";
import {
  FriendChartsList,
  type FriendChartsListProps
} from "./FriendChartsList";
import {
  SocialFriendsPanel,
  type SocialFriendsPanelProps
} from "./SocialFriendsPanel";

export type FriendsWorkspaceShellProps = Omit<FriendsPageShellProps, "beforeTabs" | "children"> & {
  chartListProps: Omit<FriendChartsListProps, "embedded">;
  children: ReactNode;
  socialPanelProps: Omit<SocialFriendsPanelProps, "chartContent">;
};

export function FriendsWorkspaceShell({
  chartListProps,
  children,
  socialPanelProps,
  ...shellProps
}: FriendsWorkspaceShellProps) {
  return (
    <FriendsPageShell
      {...shellProps}
      beforeTabs={(
        <SocialFriendsPanel
          {...socialPanelProps}
          chartContent={<FriendChartsList {...chartListProps} embedded />}
        />
      )}
    >
      {children}
    </FriendsPageShell>
  );
}
