import type { SkyDebilityDisplayPosition } from "./skyDebilityPresentation";
export const SKY_DEBILITY_INTERPRETATION_PREFIX: string;
export const skyDebilityInterpretationSlots: string[];
export function skyDebilityInterpretationKey(positions: readonly SkyDebilityDisplayPosition[]): string | null;
export function skyDebilityInterpretationPlacements(key: string): SkyDebilityDisplayPosition[] | null;
export function skyDebilityInterpretationErrors(key: string, body: string, headline?: string | null): string[];
