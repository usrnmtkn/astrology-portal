import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/visual',testMatch:['horoscope-reader.spec.ts'],timeout:90000,expect:{timeout:20000},workers:1,retries:0,reporter:[['list']],
 use:{baseURL:process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:43179',actionTimeout:20000,trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:'npm run build && npm run preview -w @tldr/web -- --port 43179 --strictPort',url:'http://127.0.0.1:43179',reuseExistingServer:false,timeout:180000}
});
