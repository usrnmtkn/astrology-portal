type InventoryRecord = {
  id: string;
  content_key?: string;
  updated_at?: string | null;
  inventory_only?: boolean;
  package_starter?: boolean;
};

export function isPackageStarterRow(row: Pick<InventoryRecord, "id" | "package_starter">) {
  return Boolean(row.package_starter || String(row.id).startsWith("package:"));
}

export function dropSupersededPackageStarters<T extends InventoryRecord>(rows: T[]): T[] {
  const savedKeys = new Set(
    rows
      .filter((row) => row.content_key && !isPackageStarterRow(row))
      .map((row) => row.content_key as string)
  );
  return rows.filter((row) => !(row.content_key && savedKeys.has(row.content_key) && isPackageStarterRow(row)));
}

// List pages are intentionally incomplete. They must not erase a hydrated
// document or a newer save that arrived while the page request was in flight.
export function mergeContentInventory<T extends InventoryRecord>(current: T[], incoming: T[], retainMissing = true): T[] {
  const previous = new Map(current.map((row) => [row.id, row]));
  const merged = incoming.map((row) => {
    const saved = previous.get(row.id);
    if (!saved) return row;
    const savedTime = Date.parse(saved.updated_at ?? "") || 0;
    const incomingTime = Date.parse(row.updated_at ?? "") || 0;
    if (savedTime > incomingTime || (savedTime === incomingTime && !saved.inventory_only && row.inventory_only)) return saved;
    return row;
  });
  if (!retainMissing) return dropSupersededPackageStarters(merged);
  const ids = new Set(incoming.map((row) => row.id));
  const savedKeys = new Set(
    incoming
      .filter((row) => row.content_key && !isPackageStarterRow(row))
      .map((row) => row.content_key)
  );
  return dropSupersededPackageStarters([
    ...merged,
    ...current.filter((row) => (
      !ids.has(row.id)
      && !(row.content_key && savedKeys.has(row.content_key) && isPackageStarterRow(row))
    ))
  ]);
}
