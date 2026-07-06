import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import type { LocationInput } from "../types";
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
  showJournalPrompts?: boolean;
};

export function CalendarRoute({
  fallback,
  generatedContent,
  location,
  onLocationChange,
  showJournalPrompts = true
}: CalendarRouteProps) {
  return (
    <Suspense fallback={fallback}>
      <LunarCalendar
        generatedContent={generatedContent}
        location={location}
        onLocationChange={onLocationChange}
        showJournalPrompts={showJournalPrompts}
      />
    </Suspense>
  );
}
