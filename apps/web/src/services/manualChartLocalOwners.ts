const localManualChartsKeyPrefix = "tldrastro:manualCharts:";

type LocalStorageKeyReader = Pick<Storage, "key" | "length">;

export function localManualChartUserIdsFromStorage(storage: LocalStorageKeyReader): string[] {
  const userIds: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (!key?.startsWith(localManualChartsKeyPrefix)) {
      continue;
    }

    const userId = key.slice(localManualChartsKeyPrefix.length);

    if (userId) {
      userIds.push(userId);
    }
  }

  return userIds;
}

export function listLocalManualChartUserIds(): string[] {
  try {
    return localManualChartUserIdsFromStorage(window.localStorage);
  } catch {
    return [];
  }
}
