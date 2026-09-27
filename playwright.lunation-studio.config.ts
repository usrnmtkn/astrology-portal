import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/visual',testMatch:'lunation-studio.spec.ts',timeout:90000,expect:{timeout:20000},workers:1,retries:0,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4191',screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'npm run build:admin && npm run preview -w @tldr/admin -- --port 4191 --strictPort',url:'http://127.0.0.1:4191',reuseExistingServer:false,timeout:180000}});
