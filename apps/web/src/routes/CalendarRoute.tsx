import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import type { LocationInput } from "../types";
import type { LunarCalendarEvent } from "../services/ephemeris";
import type { LiveGeneratedContent } from "../services/generatedContent";

const LunarCalendar = lazy(() =>
  import("../features/calendar/LunarCalendar").then((module) => ({
    default: module.LunarCalendar
  }))
);

type CalendarRouteProps = {
  fallback: ReactNode;
  generatedContent: Map<string, LiveGeneratedContent>;
  location: LocationInput;
  onLocationChange: (location: LocationInput) => void;
  onOpenTransit?: (event: LunarCalendarEvent) => void;
  showJournalPrompts?: boolean;
};

export function CalendarRoute({
  fallback,
  generatedContent,
  location,
  onLocationChange,
  onOpenTransit,
  showJournalPrompts = true
}: CalendarRouteProps) {
  return (
    <Suspense fallback={fallback}>
      <LunarCalendar
        generatedContent={generatedContent}
        location={location}
        onLocationChange={onLocationChange}
        onOpenTransit={onOpenTransit}
        showJournalPrompts={showJournalPrompts}
      />
    </Suspense>
  );
}
