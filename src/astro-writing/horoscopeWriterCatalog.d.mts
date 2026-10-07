export type HoroscopeWriterChoice = 'current' | 'gemini' | 'claude';
export type HoroscopeWriter = {
  id: HoroscopeWriterChoice;
  label: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  model: string;
  key: string;
};
export const HOROSCOPE_WRITERS: readonly HoroscopeWriter[];
