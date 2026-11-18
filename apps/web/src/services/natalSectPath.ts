import { natalReadingRoute } from "./natalReadingPath";

export function natalSectRoute(pathname: string) {
  const route = natalReadingRoute(pathname);
  return route?.kind === "sect" ? { audience: route.audience, chartId: route.chartId } : null;
}

