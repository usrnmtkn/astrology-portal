type DetailAvailability = { detailAvailable: boolean };

type PersonalTransitGroup<T extends DetailAvailability> = {
  key: "short" | "long";
  transits: T[];
};

export function buildFriendTransitsBriefState<
  TPersonalTransit extends DetailAvailability,
  THouseTransit extends DetailAvailability
>({
  personalTransitGroups,
  houseTransits,
  bondTransitCount,
  hasDailyForecast,
  dailyDoCount,
  dailyDontCount,
  hasActivePattern
}: {
  personalTransitGroups: PersonalTransitGroup<TPersonalTransit>[];
  houseTransits: THouseTransit[];
  bondTransitCount: number;
  hasDailyForecast: boolean;
  dailyDoCount: number;
  dailyDontCount: number;
  hasActivePattern: boolean;
}) {
  const visiblePersonalTransitGroups = personalTransitGroups.map((group) => ({
    ...group,
    transits: group.transits.filter((transit) => transit.detailAvailable)
  }));
  const visibleHouseTransits = houseTransits.filter((transit) => transit.detailAvailable);
  const shortTermTransits = visiblePersonalTransitGroups.find((group) => group.key === "short")?.transits ?? [];
  const longTermTransits = visiblePersonalTransitGroups.find((group) => group.key === "long")?.transits ?? [];
  const personalTransitCount = shortTermTransits.length + longTermTransits.length;

  return {
    visibleHouseTransits,
    shortTermTransits,
    longTermTransits,
    hasDailyGuidance: dailyDoCount === 3 && dailyDontCount === 3,
    hasAnyTransit: hasDailyForecast
      || personalTransitCount > 0
      || visibleHouseTransits.length > 0
      || bondTransitCount > 0
      || hasActivePattern
  };
}
