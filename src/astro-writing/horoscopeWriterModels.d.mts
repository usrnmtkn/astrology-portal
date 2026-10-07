import type {HoroscopeWriterChoice, HoroscopeWriter} from './horoscopeWriterCatalog.mjs';
export {HOROSCOPE_WRITERS, type HoroscopeWriterChoice, type HoroscopeWriter} from './horoscopeWriterCatalog.mjs';
export function horoscopeWriterConfig(choice?: HoroscopeWriterChoice, period?: string): {
  provider: HoroscopeWriter['provider']; model: string; maxOutputTokens: number;
  reasoningEffort?: string; thinkingLevel?: string;
};
export function horoscopeWriterOptions(env: Record<string,string | undefined>): Array<Omit<HoroscopeWriter,'key'> & {
  available: boolean; unavailableReason: string | null;
}>;
export function isHoroscopeResponseId(config: {provider?: string} | null, id: unknown): boolean;
