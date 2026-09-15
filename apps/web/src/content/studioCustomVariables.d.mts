export type StudioVariableOverride = { scope: "planet" | "sign" | "placement"; planet: string; sign: string; value: string };
export type StudioVariableDefinition = { name: string; label: string; description: string; value: string; tags: string[]; overrides: StudioVariableOverride[]; id?: string; updatedAt?: string };
export const STUDIO_VARIABLE_PREFIX: string;
export const STUDIO_VARIABLE_SCHEMA: string;
export const VARIABLE_SIGNS: string[];
export const VARIABLE_PLANETS: string[];
export function studioVariableTokens(value: unknown): string[];
export function validateStudioVariable(value: unknown, reservedNames?: string[]): StudioVariableDefinition;
export function studioVariableContext(context?: Record<string, any>): { planet: string; sign: string };
export function studioVariableValue(definition: Pick<StudioVariableDefinition, "value" | "overrides">, context?: Record<string, any>): { value: string; scope: string };
export function mapStudioVariableCopy<T extends Record<string, any>>(record: T, map: (copy: string) => string): T;
export function studioRecordVariableNames(record: Record<string, any>): string[];
export function resolveStudioVariableCopy(copy: unknown, bindings?: StudioVariableDefinition[], context?: Record<string, any>): string;
export function resolveStudioVariableRecord<T extends Record<string, any>>(record: T, context?: Record<string, any>): T;
export function bindStudioVariableRenderer<T extends Record<string, any>>(renderer: T, create: (collections: any[][]) => T, collections: any[][]): T;

export function bindStudioVariableReference<T extends (...args: any[]) => any>(render: T, containers: Array<Map<any, any> | any[]>): T;
