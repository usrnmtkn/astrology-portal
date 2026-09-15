import {defineConfig} from '@playwright/test';
const port=4398;
export default defineConfig({
 testDir:'./tests/visual',testMatch:'monthly-template-writing.spec.ts',outputDir:'./test-results/monthly-writing',timeout:60000,workers:1,reporter:'list',
 use:{baseURL:`http://127.0.0.1:${port}`,timezoneId:'America/New_York',screenshot:'only-on-failure',trace:'retain-on-failure',...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}}:{})},
 webServer:{command:`${process.env.MONTHLY_TEST_SKIP_BUILD?'':'npm run build:admin && '}npm run preview -w @tldr/admin -- --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false,timeout:300000}
});
