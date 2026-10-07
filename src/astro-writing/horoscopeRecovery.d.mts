export const HOROSCOPE_STARTUP_DEADLINE_MS: number;
export function horoscopeStreamCheckpointOnly(previous: any, current: any): boolean;
export function horoscopeStartupRecovery(operation: {workflow?: string;responseId?: string|null;startedAt: string;requestHash?: string}|null|undefined, now?: number): 'waiting'|'uncertain'|'not_dispatched'|null;
export function horoscopePendingReadings<T extends {sign:string;headline:string;body:string}>(edition: {passages:T[]}, generation?: {heldRequests?:Record<string,unknown>;candidateHolds?:Record<string,unknown>}|null): T[];
