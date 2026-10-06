import type { SkySummaryField } from "./skyDailySummaryCatalog";
import { skyDebilityInterpretationPlacements, skyDebilityInterpretationSlots } from "./skyDebilityIdentity.mjs";
export { SKY_DEBILITY_INTERPRETATION_PREFIX, skyDebilityInterpretationSlots, skyDebilityInterpretationKey, skyDebilityInterpretationPlacements, skyDebilityInterpretationErrors } from "./skyDebilityIdentity.mjs";

export function skyDebilityInterpretationField(key: string): SkySummaryField | undefined {
  if (!skyDebilityInterpretationPlacements(key)) return undefined;
  return { key, label: "Complete card for these placements", group: "Things may take more effort right now", body: "", allowedSlots: [...skyDebilityInterpretationSlots] };
}
