type InventoryRecord = { id: string; updated_at?: string | null; inventory_only?: boolean };

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
  if (!retainMissing) return merged;
  const ids = new Set(incoming.map((row) => row.id));
  return [...merged, ...current.filter((row) => !ids.has(row.id))];
}
