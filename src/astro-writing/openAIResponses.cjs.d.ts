export type AstrologyProseRole = "MEANING_PLANNER" | "WRITER" | "REVIEWER" | "REVISER" | "CARD_WRITER_V3" | "CARD_REVISER_V3" | "CARD_REVIEWER_V3";

export function instructionsForRole(role: AstrologyProseRole, taskInstructions?: string): string;

export function callOpenAIResponses<T = Record<string, unknown>>(options: {
  apiKey: string;
  role: AstrologyProseRole;
  request: Record<string, unknown>;
  taskInstructions?: string;
  governedInstructions?: string;
  surface?: string;
  family?: string;
  fetchImpl?: typeof fetch;
}): Promise<{
  response: Response;
  payload: T;
  role: AstrologyProseRole;
  instructions: string;
}>;

export const startStoredWritingResponse: typeof callOpenAIResponses;
export function storedWritingResponse(options: {apiKey: string; responseId: string; cancel?: boolean; fetchImpl?: typeof fetch}): Promise<Response>;
