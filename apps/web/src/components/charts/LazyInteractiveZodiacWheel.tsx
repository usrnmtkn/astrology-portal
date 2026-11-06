import { lazy, Suspense, type ComponentProps } from "react";
import { PageLoading } from "../PageLoading";
import type { InteractiveZodiacWheel as WheelComponent } from "./InteractiveZodiacWheel";

const Wheel = lazy(() => import("./InteractiveZodiacWheel").then(module => ({ default: module.InteractiveZodiacWheel })));

// Only chart views download the interactive drawing, inspection styles and copy.
export function InteractiveZodiacWheel(props: ComponentProps<typeof WheelComponent>) {
  return <Suspense fallback={<PageLoading layout="wheel" message="Loading chart…" />}>
    <Wheel {...props} />
  </Suspense>;
}
