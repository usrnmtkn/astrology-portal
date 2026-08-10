export type AstrologyProseRole = "MEANING_PLANNER" | "WRITER" | "REVIEWER" | "REVISER";

export function instructionsForRole(role: AstrologyProseRole, taskInstructions?: string): string;

export function callOpenAIResponses<T = Record<string, unknown>>(options: {
  apiKey: string;
  role: AstrologyProseRole;
  request: Record<string, unknown>;
  taskInstructions?: string;
  fetchImpl?: typeof fetch;
}): Promise<{
  response: Response;
  payload: T;
  role: AstrologyProseRole;
  instructions: string;
}>;
