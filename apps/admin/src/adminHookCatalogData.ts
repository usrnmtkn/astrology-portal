export type AdminHookCatalogDomain = "sky" | "you" | "friends" | "modifier";
type Index = {schemaVersion: 1; packageVersion: string; rows: Array<{key: string; surface: AdminHookCatalogDomain; label?: string}>};
type Bodies = {schemaVersion: 1; rows: Array<{key: string; body: string}>};
const root = `${import.meta.env.BASE_URL}generated`;

async function catalogJson<T>(fileName: string): Promise<T> {
  const response = await fetch(`${root}/${fileName}`, {cache: "no-cache"});
  if (!response.ok) throw new Error(`Hook catalog package ${fileName} failed with HTTP ${response.status}.`);
  return response.json() as Promise<T>;
}

export async function loadAdminHookCatalogIndex(labelForKey: (key: string) => string) {
  const payload = await catalogJson<Index>("admin-hook-catalog-index-v1.json");
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.rows)) throw new Error("Hook catalog index failed validation.");
  if (typeof payload.packageVersion !== "string" || !payload.packageVersion) throw new Error("Hook catalog index is missing its package version.");
  const definitions = payload.rows.map(({key, surface, label: packagedLabel}) => {
    const label = packagedLabel ?? labelForKey(key);
    return {key, label, surface: surface === "friends" ? "relationship" as const : surface, mode: "feed" as const,
      copy: {headline: label, summary: "", body: ""}};
  });
  return {definitions, packageVersion: payload.packageVersion};
}

export async function loadAdminHookCatalogBodies(surface: AdminHookCatalogDomain): Promise<Map<string, string>> {
  const payload = await catalogJson<Bodies>(`admin-hook-catalog-${surface}-v1.json`);
  if (payload.schemaVersion !== 1 || !Array.isArray(payload.rows)) throw new Error(`Hook catalog ${surface} package failed validation.`);
  return new Map(payload.rows.map(({key, body}) => [key, body]));
}
