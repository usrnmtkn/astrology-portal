import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import type { LocationInput } from "../types";
import type { LunarCalendarEvent } from "../services/ephemeris";
import type { LiveGeneratedContent } from "../services/generatedContent";
import type { SkyPlacementContentStatus } from "../features/sky/skyPlacementContentState";
import "../styles/lunar-calendar.css";

const LunarCalendar = lazy(() =>
  import("../features/calendar/LunarCalendar").then((module) => ({
    default: module.LunarCalendar
  }))
);

type CalendarRouteProps = {
  fallback: ReactNode;
  generatedContent: Map<string, LiveGeneratedContent>;
  generatedContentStatus?: "idle" | "loading" | "ready";
  skyPlacementContentStatus?: SkyPlacementContentStatus;
  contentVersion?: number;
  location: LocationInput;
  onLocationChange: (location: LocationInput) => void;
  onGeneratedContentRequest?: (request: { cacheKey: string; contentKeys: string[] }) => void;
  onOpenTransit?: (event: LunarCalendarEvent, description?: string) => void;
  showJournalPrompts?: boolean;
};

export function CalendarRoute({
  fallback,
  generatedContent,
  generatedContentStatus,
  skyPlacementContentStatus,
  contentVersion,
  location,
  onLocationChange,
  onGeneratedContentRequest,
  onOpenTransit,
  showJournalPrompts = true
}: CalendarRouteProps) {
  return (
    <Suspense fallback={fallback}>
      <LunarCalendar
        generatedContent={generatedContent}
        generatedContentStatus={generatedContentStatus}
        skyPlacementContentStatus={skyPlacementContentStatus}
        contentVersion={contentVersion}
        location={location}
        onLocationChange={onLocationChange}
        onGeneratedContentRequest={onGeneratedContentRequest}
        onOpenTransit={onOpenTransit}
        showJournalPrompts={showJournalPrompts}
      />
    </Suspense>
  );
}
