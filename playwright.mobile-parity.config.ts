import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,
 testMatch:['mobile-parity.spec.ts','connection-transit-separation.spec.ts','planetary-horoscope-navigation.spec.ts','friends-pair-forecast.spec.ts'],
 timeout:120_000,workers:1,
 use:{...base.use,baseURL:'http://127.0.0.1:4381'},
 webServer:{command:'npm run build:web && npm run preview -w @tldr/web -- --port 4381 --strictPort',url:'http://127.0.0.1:4381',reuseExistingServer:false,timeout:180_000,
 env:{VITE_SUPABASE_URL:'https://visual-smoke.supabase.test',VITE_SUPABASE_ANON_KEY:'visual-smoke-placeholder',VITE_ENABLE_NATAL_ASPECT_PATTERNS:'true'}},
 projects:[
  ...[390,1440].flatMap(width=>['light','dark'].map(colorScheme=>({name:`${width}-${colorScheme}`,use:{browserName:'chromium' as const,viewport:{width,height:900},colorScheme:colorScheme as 'light'|'dark'}}))),
  ...['light','dark'].map(colorScheme=>({name:`390-webkit-${colorScheme}`,use:{browserName:'webkit' as const,viewport:{width:390,height:844},colorScheme:colorScheme as 'light'|'dark'}})),
  {name:'320-light',use:{browserName:'chromium' as const,viewport:{width:320,height:568},colorScheme:'light' as const}},
  {name:'430-dark',use:{browserName:'webkit' as const,viewport:{width:430,height:740},colorScheme:'dark' as const}}
 ]
});
