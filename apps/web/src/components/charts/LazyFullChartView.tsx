import { lazy, Suspense, type ComponentProps } from "react";
import { PageLoading } from "../PageLoading";
import type { FullChartView as ChartView } from "./FullChartView";

const View = lazy(() => import("./FullChartView"));
export function FullChartView(props: ComponentProps<typeof ChartView>) {
  return <Suspense fallback={<PageLoading message="Loading full chart…"/>}><View {...props}/></Suspense>;
}
