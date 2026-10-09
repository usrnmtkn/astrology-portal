export type AstrologyProseRole = "MEANING_PLANNER" | "WRITER" | "REVIEWER" | "RHETORICAL_REVIEWER" | "REVISER" | "CARD_WRITER_V3" | "CARD_REVISER_V3" | "CARD_REVIEWER_V3" | "SEASONAL_MECHANISM" | "SEASONAL_PLANNER" | "SEASONAL_PLAN_REVIEWER" | "SEASONAL_VOICE_REVIEWER" | "SEASONAL_MEANING_REVIEWER";

export function instructionsForRole(role: AstrologyProseRole, taskInstructions?: string, context?: {surface?: string; family?: string}): string;
export function governedInstructionsForRole(role: AstrologyProseRole, options?: {taskInstructions?:string;governedInstructions?:string;surface?:string;family?:string}): string;

export function governedInstructionsForRole(role: AstrologyProseRole, options?: {taskInstructions?:string;governedInstructions?:string;surface?:string;family?:string}): string;

export function callOpenAIResponses<T = {status?: string; id?: unknown; [key: string]: unknown}>(options: {
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
