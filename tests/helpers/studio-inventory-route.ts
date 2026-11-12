import type { Page, Route } from "@playwright/test";
import { studioListingFacts, studioListingRow } from "../../api/_lib/studio-listing-facts";

// The Studio reads its lists and its documents from the inventory endpoint. A request naming rows
// returns those rows' documents; a list request returns rows without their copy, the way the
// endpoint serves them in production. Six fixtures had their own copy of this and answered only the
// older path, so every list came back empty as soon as the Studio moved to the inventory endpoint.
type StudioApiCall = (message: { method: string; body?: unknown; url?: string }) => Promise<any>;

export function isBaselineRecoveryPreview(body: any): boolean {
  const sources = body?.sources;
  return !!body && Object.keys(body).sort().join(",") === (body.recoveryKind==='moon-reusable'?"action,recoveryKind,sources":"action,sources") && body.action === "preview"
    && Array.isArray(sources) && sources.length >= 1 && sources.length <= 2
    && sources.every((source: any) => source && Object.keys(source).sort().join(",") === "contentKey,expectedUpdatedAt,id"
      && [source.id, source.contentKey, source.expectedUpdatedAt].every(value => typeof value === "string" && !!value));
}

export async function routeStudioInventoryApi(page: Pick<Page, "route">, options: {
  call: StudioApiCall;
  listRows?: (rows: any[]) => any[];
  onWrite?: (write: { body: any; result: any }) => void;
  actualDocumentRoute?: boolean;
  actualInventoryList?: boolean;
  actualBaselineRecovery?: boolean;
  // Answers a fixture's own endpoints, such as reader status. Return false to take the empty reply.
  answer?: (route: Parameters<Parameters<Page["route"]>[1]>[0], url: URL) => Promise<boolean>;
}) {
  const pending = new Set<Promise<void>>();
  const answerRoute = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/admin/generated-content" || url.pathname === "/api/admin/generated-content-inventory") {
      const namesRows = ["id", "contentKey", "contentKeys", "variables", "writingProfiles", "horoscopeBrief", "horoscopeEditions"].some((key) => url.searchParams.has(key));
      if (request.method() !== "GET" || namesRows || (options.actualInventoryList && url.pathname === "/api/admin/generated-content-inventory")) {
        const body = request.postData() ? request.postDataJSON() : undefined;
        const result = await options.call({
          method: request.method(),
          body,
          url: `${options.actualDocumentRoute || options.actualInventoryList ? url.pathname : "/api/admin/generated-content"}${url.search}`
        });
        if (body) options.onWrite?.({ body, result });
        return route.fulfill({ status: result.status, json: result.payload });
      }
      const saved = await options.call({ method: "rows" });
      const rows = (options.listRows ? options.listRows(saved) : saved)
        .map((row: any) => studioListingRow(row, studioListingFacts(row)));
      return route.fulfill({ json: { ok: true, rows, nextCursor: null } });
    }
    // Most inventory fixtures have no installed baseline. Answer only the read-only
    // capability preview; unexpected recovery writes must still fail the fixture.
    // The recovery suite opts into its real API/SQL handler instead.
    if (url.pathname === "/api/admin/content-baseline-recovery" && !options.actualBaselineRecovery) {
      const body = request.method() === "POST" ? request.postDataJSON() : undefined;
      if (!isBaselineRecoveryPreview(body)) {
        throw new Error("Unexpected baseline recovery operation in inventory fixture");
      }
      return route.fulfill({ json: { ok: false, supported: false } });
    }
    if (options.answer && await options.answer(route, url)) return;
    if (url.pathname === "/api/admin/package-source") {
      const result = await options.call({ method: "GET", url: url.pathname + url.search });
      return route.fulfill({ status: result.status, json: result.payload });
    }
    return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
  };
  await page.route("**/api/**", (route) => {
    const task = answerRoute(route);
    pending.add(task);
    task.then(() => pending.delete(task), () => pending.delete(task));
    return task;
  });
  // Stop the page's request producer before draining. Removing interception
  // while callbacks await storage can continue those requests behind them.
  return async () => {
    while (pending.size) await Promise.all([...pending]);
  };
}
