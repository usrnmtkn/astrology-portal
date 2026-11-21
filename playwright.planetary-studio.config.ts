import {defineConfig} from '@playwright/test';
const baseURL=process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:4193';
const local=['127.0.0.1','localhost','::1'].includes(new URL(baseURL).hostname);
export default defineConfig({testDir:'./tests/visual',testMatch:'planetary-horoscope-writing.spec.ts',timeout:120000,expect:{timeout:20000},workers:1,retries:0,reporter:'list',
  use:{baseURL,screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:local?{command:`npm run build:admin && npm run preview -w @tldr/admin -- --port ${new URL(baseURL).port||4193} --strictPort`,url:baseURL,reuseExistingServer:false,timeout:180000}:undefined});
