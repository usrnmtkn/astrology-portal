import { defineConfig } from '@playwright/test';
process.env.STUDIO_DRAFT_TRANSPORT_MODE='late-cold-module';
export default defineConfig({testDir:'./tests/visual',testMatch:'connection-transit-separation.spec.ts',timeout:90000,workers:1,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4298',screenshot:'only-on-failure',trace:'retain-on-failure',reducedMotion:'reduce'},
 projects:[390,1440].flatMap(width=>(['light','dark'] as const).map(colorScheme=>({name:`${width}-${colorScheme}`,use:{viewport:{width,height:1000},colorScheme}}))),
 webServer:{command:'npm run build:web && npm run preview -w @tldr/web -- --port 4298 --strictPort',url:'http://127.0.0.1:4298',reuseExistingServer:false,timeout:180000,
 env:{VITE_SUPABASE_URL:'https://visual-smoke.supabase.test',VITE_SUPABASE_ANON_KEY:'visual-smoke-placeholder'}}});
