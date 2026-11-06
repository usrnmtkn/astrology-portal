import { lazy, Suspense, type ComponentProps } from "react";
import { PageLoading } from "../PageLoading";
import type { InteractiveZodiacWheel as WheelComponent } from "./InteractiveZodiacWheel";

const Wheel = lazy(() => import("./InteractiveZodiacWheel").then(module => ({ default: module.InteractiveZodiacWheel })));

export function InteractiveWheelLoading({ message = "Loading chart…" }: { message?: string }) {
  return <div className="wheel-loading"><PageLoading layout="wheel" message={message}/><span aria-hidden="true"/></div>;
}

// Only chart views download the interactive drawing, inspection styles and copy.
export function InteractiveZodiacWheel(props: ComponentProps<typeof WheelComponent>) {
  return <Suspense fallback={<InteractiveWheelLoading />}>
    <Wheel {...props} />
  </Suspense>;
}
