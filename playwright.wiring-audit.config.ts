import { defineConfig } from '@playwright/test';

// This audit serves the public web app, whose Studio entry has this path.
process.env.STUDIO_PRODUCTION_ENTRY ??= '1';

export default defineConfig({
  testDir: './tests/visual',
  projects: [
    { name: 'studio', testMatch: [
      'studio-owner-publishing.spec.ts', 'studio-composite-review.spec.ts',
      'natal-friend-publication.spec.ts', 'compatibility-aspect-create.spec.ts',
      'content-studio-reader-destinations.spec.ts', 'sky-placement-sources.spec.ts',
      'composition-complete-sources.spec.ts', 'lunation-eclipse-publication.spec.ts',
      'studio-shared-wording.spec.ts', 'studio-publication-status.spec.ts'
    ] },
    { name: 'natal-studio', testMatch: 'content-dashboard-admin-user-flows.spec.ts',
      grep: /Natal Chart sidebar|new natal aspect|approved natal aspect stuck|Natal Empty Houses|Empty-house preview|Natal planet introductions|Natal editorial library|Natal placement sect drafts|Aspect Patterns authenticates/ },
    { name: 'lunar-tools', testMatch: ['lunation-studio.spec.ts', 'lunation-writing-studio.spec.ts'] },
    { name: 'sky-composition', testMatch: 'sky-placement-composition.spec.ts',
      use: { baseURL: 'http://127.0.0.1:4398' } },
    { name: 'reader', testMatch: 'client-facing-user-flows.spec.ts',
      grep: /Sky placement|Sky Placement|published|Natal|natal|synastry|composite|relationship|canonical V4|SKY V4|SKY placement|Uranus|Chiron|Moon in|Jupiter in|Venus in|Where it lands/ }
  ],
  timeout: 90_000,
  // Match the standard fresh-preview suite's calculated-content hydration wait.
  expect: { timeout: 15_000 },
  workers: 3,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4397', viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure', trace: 'retain-on-failure'
  },
  webServer: [{
    command: 'npm run build:web && npm run preview -w @tldr/web -- --port 4397 --strictPort',
    url: 'http://127.0.0.1:4397', reuseExistingServer: false, timeout: 180_000,
    env: { VITE_SUPABASE_URL: 'https://visual-smoke.supabase.test', VITE_SUPABASE_ANON_KEY: 'visual-smoke-placeholder', VITE_SUPABASE_PUBLISHABLE_KEY: '' }
  }, {
    command: 'npm run build:admin && npm run preview -w @tldr/admin -- --port 4398 --strictPort',
    url: 'http://127.0.0.1:4398', reuseExistingServer: false, timeout: 180_000
  }]
});
