import provider from './offlineProviderConfig.cjs';

// Deliberately scoped to horoscope prose. Planning and independent review keep
// their existing models; saved operations always retain their captured config.
import {HOROSCOPE_WRITERS} from './horoscopeWriterCatalog.mjs';
export {HOROSCOPE_WRITERS} from './horoscopeWriterCatalog.mjs';

export function horoscopeWriterConfig(choice='current',period='weekly') {
  const selected=HOROSCOPE_WRITERS.find(writer=>writer.id===choice);
  if(!selected)throw new Error('Choose a supported horoscope writing model.');
  if(selected.id==='current')return provider.normalizeProviderConfig(
    ['monthly','seasonal'].includes(period)?{reasoningEffort:'medium',maxOutputTokens:12000}:{},'writer');
  return {provider:selected.provider,model:selected.model,maxOutputTokens:12000,
    ...(selected.provider==='gemini'?{thinkingLevel:'medium',transport:'stored-interaction/v2'}:{reasoningEffort:'medium'})};
}

export function horoscopeWriterOptions(env) {
  return HOROSCOPE_WRITERS.map(({key,...writer})=>({...writer,
    available:Boolean(env[key]?.trim()&&env.OPENAI_API_KEY?.trim()),
    unavailableReason:!env[key]?.trim()?`${writer.label} needs its server API connection.`:
      !env.OPENAI_API_KEY?.trim()?'The existing planning and review connection is unavailable.':null}));
}

export function isHoroscopeResponseId(config,id) {
  if(typeof id!=='string')return false;
  if(config?.provider==='anthropic')return /^claude_[a-f0-9]{64}$/u.test(id);
  if(config?.provider==='gemini')return /^[A-Za-z0-9_-]{1,512}$/u.test(id);
  return /^resp_[A-Za-z0-9_-]+$/u.test(id);
}
