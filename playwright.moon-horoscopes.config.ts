import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/visual',testMatch:'dated-moon-horoscopes.spec.ts',timeout:90000,expect:{timeout:20000},workers:1,retries:0,reporter:'list',
  use:{baseURL:'http://127.0.0.1:4198',actionTimeout:20000,screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'npm run build:admin && npm run preview -w @tldr/admin -- --port 4198 --strictPort',url:'http://127.0.0.1:4198',reuseExistingServer:false,timeout:180000}});
