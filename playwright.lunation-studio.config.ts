import {defineConfig} from '@playwright/test';
const baseURL=process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:4191';
const local=['127.0.0.1','localhost','::1'].includes(new URL(baseURL).hostname);
export default defineConfig({testDir:'./tests/visual',testMatch:['calendar-daily-writing.spec.ts','lunation-studio.spec.ts','lunation-writing-studio.spec.ts'],timeout:90000,expect:{timeout:20000},workers:1,retries:0,reporter:'list',
 use:{baseURL,screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:local?{command:`npm run build:admin && npm run preview -w @tldr/admin -- --port ${new URL(baseURL).port||4191} --strictPort`,url:baseURL,reuseExistingServer:false,timeout:180000}:undefined});
