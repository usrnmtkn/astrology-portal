export type HoroscopeWriterChoice = 'current' | 'gemini' | 'claude';
export type HoroscopeWriter = {
  id: HoroscopeWriterChoice;
  label: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  model: string;
  key: string;
};
export const HOROSCOPE_WRITERS: readonly HoroscopeWriter[];
export function horoscopeWriterConfig(choice?: HoroscopeWriterChoice, period?: string): {
  provider: HoroscopeWriter['provider']; model: string; maxOutputTokens: number;
  reasoningEffort?: string; thinkingLevel?: string;
};
export function horoscopeWriterOptions(env: Record<string,string | undefined>): Array<Omit<HoroscopeWriter,'key'> & {
  available: boolean; unavailableReason: string | null;
}>;
export function isHoroscopeResponseId(config: {provider?: string} | null, id: unknown): boolean;
