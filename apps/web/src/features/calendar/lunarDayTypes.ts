import type { LunarCalendarActiveAspect, LunarCalendarEvent } from "../../services/ephemeris";
import type { LocationInput } from "../../types";

export type LunarDayTransitType = "ingress" | "retrograde" | "station" | "aspect" | "eclipse";
export type LunarDayArcSpan = "twoWeek" | "sixMonth";
export type LunarDayCheckpointRole =
  | "origin"
  | "waxingCheckpoint"
  | "culmination"
  | "releaseCheckpoint"
  | "integration"
  | "eclipse";

export type LunarDayTransit = {
  type: LunarDayTransitType;
  title: string;
  bodies: string[];
  symbolKey: string;
  exactAt: string;
  activeRange?: {
    start: string;
    end?: string;
  };
  relation?: "ingress" | "retrograde" | "aspect" | "eclipse";
  sourceEvent: LunarCalendarEvent;
};

export type LunarDayArcPoint = {
  sign: string;
  degree: number | null;
  datetime: string;
  title?: string;
  eclipseType?: "solar" | "lunar" | null;
};

export type LunarDayEditorialTransitNote = {
  transitRef: string;
  copyKey: string;
  title?: string;
  body: string | null;
};

export type LunarDay = {
  date: string;
  timezone: string;
  location: LocationInput;
  traditional: {
    phase: string;
    moonSign: string;
    illumination: number;
    lunarDayNumber: number;
    voc: {
      start: string;
      end: string;
      durationMin: number | null;
      nextSign: string | null;
    } | null;
    transits: LunarDayTransit[];
    activeAspects: LunarCalendarActiveAspect[];
  };
  arc: {
    season: {
      sign: string;
      start: string;
      end: string;
    };
    origin: LunarDayArcPoint | null;
    checkpoint: {
      phaseType: string;
      role: LunarDayCheckpointRole;
    };
    culmination: LunarDayArcPoint | null;
    arcSpan: LunarDayArcSpan;
    spans: {
      twoWeek: {
        origin: LunarDayArcPoint | null;
        culmination: LunarDayArcPoint | null;
      };
      sixMonth: {
        origin: LunarDayArcPoint | null;
        culmination: LunarDayArcPoint | null;
      };
    };
  } | null;
  editorial: {
    body: string | null;
    practice: string | null;
    reflect: string | null;
    ritual: string | null;
    eclipseWitness: string | null;
    callback: string | null;
    arcLesson: string | null;
    arcSeeded: string | null;
    journalPrompt: string | null;
    season: string | null;
    transitNotes: LunarDayEditorialTransitNote[];
  };
  source: {
    lunationId: string | null;
    seasonId: string;
    signId: string;
  };
};
