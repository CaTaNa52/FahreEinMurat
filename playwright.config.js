import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir: './tests/e2e', timeout: 45000, retries: process.env.CI ? 1 : 0,
 reporter: 'list',
 use: { baseURL: 'http://127.0.0.1:4173',
   screenshot: 'only-on-failure', trace: 'retain-on-failure',
   launchOptions: { args: ['--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] } },
 projects: [
  { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile-chromium', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
 ],
 webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
   url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 60000 }
});
