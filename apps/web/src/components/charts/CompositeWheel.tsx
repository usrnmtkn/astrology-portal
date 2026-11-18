import { memo, useMemo } from "react";
import { SkyWheel, zodiacLongitude, type SkyWheelProps } from "./Wheels";
import { fittedWheelMarkerLayouts } from "./fittedWheelGeometry";
import { longitudeToChartAngle } from "./wheelGeometry";

export const CompositeWheel = memo(function CompositeWheel(props: Omit<SkyWheelProps, "variant" | "markerLayouts">) {
  const { positions, ascendantLongitude } = props;
  const markerLayouts = useMemo(() => fittedWheelMarkerLayouts(
    positions, position => position.planet, zodiacLongitude,
    { radius: 212, minimumRadius: 142, center: 300, minimumSpacing: 37.5,
      rowSpacing: 54, glyphSize: 26, annotationOffset: 22,
      angleForLongitude: longitude => longitudeToChartAngle(longitude, ascendantLongitude, typeof ascendantLongitude === "number") }
  ), [positions, ascendantLongitude]);
  return <SkyWheel {...props} variant="composite" markerLayouts={markerLayouts} />;
});
