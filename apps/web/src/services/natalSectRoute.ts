import { natalReadingHref, natalReadingTriggerId, openNatalReadingPage, closeNatalReadingPage } from "./natalReadingRoute";
export { natalSectRoute } from "./natalSectPath";
export function natalSectHref(chartId?: string) { return natalReadingHref("sect", chartId); }
export function natalSectTriggerId(chartId?: string) { return natalReadingTriggerId("sect", chartId); }
export const openNatalSectPage = openNatalReadingPage;
export function closeNatalSectPage(chartId?: string) { closeNatalReadingPage("sect", chartId); }
