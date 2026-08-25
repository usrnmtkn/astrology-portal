export type AstrologyProseRole = "MEANING_PLANNER" | "WRITER" | "COLD_REVIEWER" | "REVIEWER" | "REVISER" | "CARD_WRITER_V3" | "CARD_REVISER_V3" | "CARD_REVIEWER_V3";

export function instructionsForRole(role: AstrologyProseRole, taskInstructions?: string, context?: { surface?: string; family?: string }): string;

export function callOpenAIResponses<T = Record<string, unknown>>(options: {
  apiKey: string;
  role: AstrologyProseRole;
  request: Record<string, unknown>;
  taskInstructions?: string;
  surface?: string;
  family?: string;
  fetchImpl?: typeof fetch;
}): Promise<{
  response: Response;
  payload: T;
  role: AstrologyProseRole;
  instructions: string;
}>;
