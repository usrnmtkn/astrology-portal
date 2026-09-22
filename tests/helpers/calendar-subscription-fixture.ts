import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import createSubscription from "../../api/calendar-subscriptions.js";
import feed from "../../api/calendar-feed.js";
import reading from "../../api/calendar-reading.js";
import events from "../../api/admin/calendar-feed-events.js";

/** Actual handlers and migration, backed by isolated PostgreSQL in tests. */
export async function calendarSubscriptionFixture() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(readFileSync(new URL("../../apps/web/supabase/migrations/20260922000528_calendar_subscriptions.sql", import.meta.url), "utf8"));
  await db.exec(`create table content_publications(content_key text primary key,state text,revision int,row_id uuid,row_updated_at timestamptz,updated_at timestamptz);
    create table generated_interpretations(id uuid primary key,content_key text,target_date date,status text,lane text,review_state text,updated_at timestamptz,body text,summary text,headline text,sections jsonb,source_snapshot jsonb,facts jsonb,provider text,flags text[],event_type text,surface text);`);
  const savedEnv = Object.fromEntries(["NODE_ENV", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CONTENT_GENERATION_SECRET"].map(key => [key, process.env[key]]));
  process.env.NODE_ENV = "test"; process.env.SUPABASE_URL = "https://calendar-test.invalid"; process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-service"; process.env.CONTENT_GENERATION_SECRET = "fixture-owner";
  const originalFetch = globalThis.fetch;
  let failStorage = false;
  const identifier = (value: string) => { if (!/^[a-z_]+$/u.test(value)) throw new Error("Invalid fixture identifier"); return `"${value}"`; };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.origin !== "https://calendar-test.invalid") return originalFetch(input, init);
    if (failStorage) return Response.json({ error: "fixture outage" }, { status: 503 });
    const table = identifier(url.pathname.split("/").at(-1)!);
    const params: unknown[] = [], where: string[] = [];
    for (const [column, value] of url.searchParams) {
      if (["select", "order", "limit", "offset"].includes(column)) continue;
      const name = identifier(column);
      if (value === "is.null") where.push(`${name} is null`);
      else if (value === "not.is.null") where.push(`${name} is not null`);
      else if (value.startsWith("eq.")) { params.push(value.slice(3)); where.push(`${name} = $${params.length}`); }
      else if (value.startsWith("in.(")) { const values = value.slice(4, -1).split(",").map(item => item.replace(/^"|"$/gu, "")); params.push(values); where.push(`${name} = any($${params.length}::text[])`); }
      else throw new Error("Unsupported fixture filter");
    }
    const condition = where.length ? ` where ${where.join(" and ")}` : "";
    const method = init.method ?? "GET";
    let sql: string;
    if (method === "GET") {
      const columns = url.searchParams.get("select") ?? "*";
      const select = columns === "*" ? "*" : columns.split(",").map(identifier).join(",");
      const order = url.searchParams.get("order")?.split(".")[0];
      sql = `select row_to_json(r)::text as json from (select ${select} from ${table}${condition}${order ? ` order by ${identifier(order)}` : ""} limit ${Number(url.searchParams.get("limit") ?? 1000)} offset ${Number(url.searchParams.get("offset") ?? 0)}) r`;
    } else {
      const body = JSON.parse(String(init.body)); const fields = Object.keys(body);
      const argumentsSql = fields.map(field => { params.push(["draft", "published"].includes(field) ? JSON.stringify(body[field]) : body[field]); return `$${params.length}`; });
      sql = method === "POST"
        ? `insert into ${table} (${fields.map(identifier)}) values (${argumentsSql}) returning to_jsonb(${table})::text as json`
        : `update ${table} set ${fields.map((field, index) => `${identifier(field)}=${argumentsSql[index]}`).join(",")}${condition} returning to_jsonb(${table})::text as json`;
    }
    try { const result = await db.query<{ json: string }>(sql, params); return Response.json(result.rows.map(row => JSON.parse(row.json))); }
    catch (error) { throw new Error(`Fixture SQL failed: ${error instanceof Error ? error.message : error}`); }
  };
  return {
    db, setStorageFailure(value: boolean) { failStorage = value; },
    async invoke(path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) {
      const collected: Record<string, string> = {}; let responseBody = "";
      const req = { url: path, method, body, headers };
      const res = { statusCode: 200, setHeader(key: string, value: string) { collected[key.toLowerCase()] = String(value); }, end(value?: string) { responseBody = value ?? ""; } };
      const handler = path.startsWith("/api/admin/") ? events : path.startsWith("/api/calendar-reading") ? reading : path.startsWith("/feed/") || path.startsWith("/api/calendar-feed") ? feed : createSubscription;
      await handler(req as any, res as any);
      return { status: res.statusCode, headers: collected, body: responseBody, json: () => JSON.parse(responseBody) };
    },
    async close() { globalThis.fetch = originalFetch; for (const [key, value] of Object.entries(savedEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } await db.close(); }
  };
}
