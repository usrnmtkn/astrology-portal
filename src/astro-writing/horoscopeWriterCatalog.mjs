// Browser-safe display catalog. Provider configuration stays in horoscopeWriterModels.mjs.
export const HOROSCOPE_WRITERS = Object.freeze([
  {id:'current',label:'Current writer',provider:'openai',model:'gpt-5.6-sol',key:'OPENAI_API_KEY'},
  {id:'gemini',label:'Gemini 3.1 Pro (preview)',provider:'gemini',model:'gemini-3.1-pro-preview',key:'GEMINI_API_KEY'},
  {id:'claude',label:'Claude Sonnet 5.5',provider:'anthropic',model:'claude-sonnet-5-5',key:'ANTHROPIC_API_KEY'}
]);
