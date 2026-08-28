import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const siteDirectory = resolve(scriptDirectory, '../..');
const outputDirectory = resolve(process.env.VISUAL_OUTPUT_DIR || resolve(siteDirectory, 'docs/visual-diff'));
const baseURL = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const bypassSystemProxy = process.env.PLAYWRIGHT_BYPASS_PROXY === '1';

const targets = [
  { name: 'reference-viewport', width: 864, height: 1821, isMobile: false, hasTouch: false },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: 'tablet', width: 768, height: 1024, isMobile: false, hasTouch: true },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: chromiumExecutablePath || undefined,
  args: bypassSystemProxy ? ['--no-proxy-server'] : undefined,
});
const captures = [];

try {
  for (const target of targets) {
    const context = await browser.newContext({
      viewport: { width: target.width, height: target.height },
      isMobile: target.isMobile,
      hasTouch: target.hasTouch,
      colorScheme: 'dark',
      locale: 'ru-RU',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const badResponses = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
    });

    const response = await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    if (!response || response.status() >= 400) {
      throw new Error(`Visual target returned ${response?.status() ?? 'no response'}: ${baseURL}`);
    }

    await page.evaluate(async () => {
      await document.fonts.ready;
      const pageEnd = document.documentElement.scrollHeight;
      for (let y = 0; y < pageEnd; y += Math.max(320, Math.floor(innerHeight * 0.7))) {
        scrollTo(0, y);
        await new Promise((resolveStep) => setTimeout(resolveStep, 50));
      }
      scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');

    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
      viewport: { width: innerWidth, height: innerHeight },
      sections: Array.from(document.querySelectorAll('main > section')).map((section) => ({
        id: section.id,
        top: Math.round(section.getBoundingClientRect().top + scrollY),
        height: Math.round(section.getBoundingClientRect().height),
      })),
    }));

    const path = resolve(outputDirectory, `actual-${target.name}.png`);
    await page.screenshot({ path, animations: 'disabled', caret: 'hide', fullPage: true });

    captures.push({ ...target, path, layout, consoleErrors, pageErrors, badResponses });
    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  resolve(outputDirectory, 'capture-metadata.json'),
  `${JSON.stringify({ baseURL, capturedAt: new Date().toISOString(), captures }, null, 2)}\n`,
  'utf8',
);

const failures = captures.flatMap((capture) => [
  ...capture.consoleErrors.map((error) => `${capture.name} console: ${error}`),
  ...capture.pageErrors.map((error) => `${capture.name} page: ${error}`),
  ...capture.badResponses.map((error) => `${capture.name} response: ${error}`),
]);

if (failures.length > 0) throw new Error(`Visual capture detected runtime errors:\n${failures.join('\n')}`);

process.stdout.write(`${JSON.stringify({ ok: true, baseURL, captures }, null, 2)}\n`);
