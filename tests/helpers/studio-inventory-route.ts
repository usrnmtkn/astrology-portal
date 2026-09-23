import type { Page } from "@playwright/test";
import { studioListingFacts, studioListingRow } from "../../api/_lib/studio-listing-facts";

// The Studio reads its lists and its documents from the inventory endpoint. A request naming rows
// returns those rows' documents; a list request returns rows without their copy, the way the
// endpoint serves them in production. Six fixtures had their own copy of this and answered only the
// older path, so every list came back empty as soon as the Studio moved to the inventory endpoint.
type StudioApiCall = (message: { method: string; body?: unknown; url?: string }) => Promise<any>;

export async function routeStudioInventoryApi(page: Page, options: {
  call: StudioApiCall;
  listRows?: (rows: any[]) => any[];
  onWrite?: (write: { body: any; result: any }) => void;
  // Answers a fixture's own endpoints, such as reader status. Return false to take the empty reply.
  answer?: (route: Parameters<Parameters<Page["route"]>[1]>[0], url: URL) => Promise<boolean>;
}) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/admin/generated-content" || url.pathname === "/api/admin/generated-content-inventory") {
      const namesRows = ["id", "contentKey", "contentKeys", "variables", "writingProfiles"].some((key) => url.searchParams.has(key));
      if (request.method() !== "GET" || namesRows) {
        const body = request.method() === "GET" ? undefined : request.postDataJSON();
        const result = await options.call({
          method: request.method(),
          body,
          url: `/api/admin/generated-content${url.search}`
        });
        if (body) options.onWrite?.({ body, result });
        return route.fulfill({ status: result.status, json: result.payload });
      }
      const saved = await options.call({ method: "rows" });
      const rows = (options.listRows ? options.listRows(saved) : saved)
        .map((row: any) => studioListingRow(row, studioListingFacts(row)));
      return route.fulfill({ json: { ok: true, rows, nextCursor: null } });
    }
    if (options.answer && await options.answer(route, url)) return;
    return route.fulfill({ json: { ok: true, rows: [], statuses: [], records: [], nextCursor: null } });
  });
}
