import { adminFetchJson, AdminHttpError, adminStorageRows } from "./admin-http.js";
type FetchLike = typeof fetch;

export type SupabaseReportAdmin = ReturnType<typeof createSupabaseReportAdmin>;

export function createSupabaseReportAdmin(input: {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  fetchImpl?: FetchLike;
} = {}) {
  const supabaseUrl = (input.supabaseUrl ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
  const serviceRoleKey = input.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const fetchImpl = input.fetchImpl ?? fetch;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service configuration is unavailable.");
  const headers = {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json"
  };

  async function request<T>(path: string, init: RequestInit = {}) {
    const response = await adminFetchJson(`${supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers ?? {}) }
    }, undefined, fetchImpl);
    const payload = response.payload as T;
    if (!response.ok) throw new AdminHttpError(502, `Supabase ${path} failed with ${response.status}: ${JSON.stringify(payload)}`);
    return payload;
  }

  return {
    request,
    async selectOne<T>(table: string, params: URLSearchParams) {
      params.set("limit", "1");
      const rows = await request<T[]>(`${table}?${params}`);
      return adminStorageRows(rows)[0] as T ?? null;
    },
    async insert<T>(table: string, row: Record<string, unknown>, options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
      const params = new URLSearchParams({ select: "*" });
      if (options.onConflict) params.set("on_conflict", options.onConflict);
      const prefer = options.onConflict
        ? `${options.ignoreDuplicates ? "resolution=ignore-duplicates" : "resolution=merge-duplicates"},return=representation`
        : "return=representation";
      return request<T[]>(`${table}?${params}`, { method: "POST", headers: { prefer }, body: JSON.stringify(row) });
    },
    async update<T>(table: string, query: string, row: Record<string, unknown>) {
      return request<T[]>(`${table}?${query}`, { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify(row) });
    }
  };
}
