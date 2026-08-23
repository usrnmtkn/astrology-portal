/**
 * Normalize a zodiac sign identifier at the resolver boundary.
 *
 * Kept in a dependency-free module so the Node reference resolver and the
 * browser resolver cannot drift or refer to layer-specific helpers.
 */
export function normalizeLunationSign(value) {
  return String(value ?? "").trim().toLowerCase();
}
