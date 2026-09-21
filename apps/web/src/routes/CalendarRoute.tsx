import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import type { LocationInput, SkySnapshot } from "../types";
import type { LunarCalendarEvent } from "../services/ephemeris";
import type { LiveGeneratedContent } from "../services/generatedContent";
import type { SkyPlacementContentStatus } from "../features/sky/skyPlacementContentState";
import "../styles/lunar-calendar.css";
import "../styles/calendar-subscribe.css";

const LunarCalendar = lazy(() =>
  import("../features/calendar/LunarCalendar").then((module) => ({
    default: module.LunarCalendar
  }))
);

type CalendarRouteProps = {
  fallback: ReactNode;
  sky?: SkySnapshot | null;
  generatedContent: Map<string, LiveGeneratedContent>;
  generatedContentStatus?: "idle" | "loading" | "ready";
  skyPlacementContentStatus?: SkyPlacementContentStatus;
  contentVersion?: number;
  location: LocationInput;
  onGeneratedContentRequest?: (request: { cacheKey: string; contentKeys: string[] }) => void;
  onOpenTransit?: (event: LunarCalendarEvent, description?: string) => void;
  onSignIn?: () => void;
  showJournalPrompts?: boolean;
  natalSunSign?: string | null;
  natalMoonSign?: string | null;
};

export function CalendarRoute({
  fallback,
  sky,
  generatedContent,
  generatedContentStatus,
  skyPlacementContentStatus,
  contentVersion,
  location,
  onGeneratedContentRequest,
  onOpenTransit,
  onSignIn,
  showJournalPrompts = true,
  natalSunSign,
  natalMoonSign
}: CalendarRouteProps) {
  return (
    <Suspense fallback={fallback}>
      <LunarCalendar
        sky={sky}
        generatedContent={generatedContent}
        generatedContentStatus={generatedContentStatus}
        skyPlacementContentStatus={skyPlacementContentStatus}
        contentVersion={contentVersion}
        location={location}
        onGeneratedContentRequest={onGeneratedContentRequest}
        onOpenTransit={onOpenTransit}
        onSignIn={onSignIn}
        showJournalPrompts={showJournalPrompts}
        natalSunSign={natalSunSign}
        natalMoonSign={natalMoonSign}
      />
    </Suspense>
  );
}
