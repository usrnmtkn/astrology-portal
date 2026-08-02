import type { FriendProfileTab } from "./friendsRouting";

export type FriendProfileWork = {
  compatibility: boolean;
  composite: boolean;
  synastry: boolean;
  synastryContacts: boolean;
  transits: boolean;
};

const friendProfileWorkByTab: Record<FriendProfileTab, FriendProfileWork> = {
  compatibility: {
    compatibility: true,
    composite: false,
    synastry: false,
    synastryContacts: true,
    transits: false
  },
  transits: {
    compatibility: false,
    composite: false,
    synastry: false,
    synastryContacts: true,
    transits: true
  },
  natal: {
    compatibility: false,
    composite: false,
    synastry: false,
    synastryContacts: false,
    transits: false
  },
  synastry: {
    compatibility: false,
    composite: false,
    synastry: true,
    synastryContacts: true,
    transits: false
  },
  composite: {
    compatibility: false,
    composite: true,
    synastry: false,
    synastryContacts: false,
    transits: false
  }
};

export function friendProfileWorkForTab(tab: FriendProfileTab) {
  return friendProfileWorkByTab[tab];
}
