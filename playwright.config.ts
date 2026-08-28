import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const bypassSystemProxy = process.env.PLAYWRIGHT_BYPASS_PROXY === '1';
const launchOptions = chromiumExecutablePath || bypassSystemProxy
  ? {
      ...(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}),
      ...(bypassSystemProxy ? { args: ['--no-proxy-server'] } : {}),
    }
  : undefined;

const project = (
  name: string,
  width: number,
  height: number,
  options: { hasTouch?: boolean; isMobile?: boolean } = {},
) => ({
  name,
  use: {
    viewport: { width, height },
    hasTouch: options.hasTouch ?? false,
    isMobile: options.isMobile ?? false,
    colorScheme: 'dark' as const,
  },
});

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL,
    browserName: 'chromium',
    launchOptions,
    locale: 'ru-RU',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: process.env.PLAYWRIGHT_VIDEO === '1' ? 'retain-on-failure' : 'off',
  },
  projects: [
    project('desktop-1920x1080', 1920, 1080),
    project('desktop-1440x900', 1440, 900),
    project('desktop-1366x768', 1366, 768),
    project('tablet-1024x768', 1024, 768, { hasTouch: true }),
    project('tablet-768x1024', 768, 1024, { hasTouch: true }),
    project('mobile-430x932', 430, 932, { hasTouch: true, isMobile: true }),
    project('mobile-390x844', 390, 844, { hasTouch: true, isMobile: true }),
    project('mobile-360x800', 360, 800, { hasTouch: true, isMobile: true }),
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
