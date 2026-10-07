import {defineConfig} from '@playwright/test';
// Both the build and browser fixtures must use the same isolated auth project.
process.env.VITE_SUPABASE_URL??='https://visual-smoke.supabase.test';
process.env.VITE_SUPABASE_ANON_KEY??='visual-smoke-placeholder';
export default defineConfig({
 testDir:'./tests/visual',testMatch:['horoscope-model-choice.spec.ts','horoscope-seasonal-composition.spec.ts','horoscope-monthly.spec.ts','horoscope-publication-claims.spec.ts','horoscope-seasonal-sources.spec.ts','horoscope-reader.spec.ts','horoscope-personalization.spec.ts','horoscope-recovery.spec.ts','horoscope-published-navigation.spec.ts','horoscope-reader-ux.spec.ts','horoscope-header-navigation.spec.ts'],timeout:180000,expect:{timeout:20000},workers:1,retries:0,reporter:[['list']],
 use:{baseURL:process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:43179',actionTimeout:20000,trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:'npm run build && npm run preview -w @tldr/web -- --port 43179 --strictPort',url:'http://127.0.0.1:43179',reuseExistingServer:false,timeout:180000}
});
