import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4194';
const projectRoot = existsSync(resolve('..', 'references')) ? resolve('..') : resolve('.');
const outputDirectory = resolve(projectRoot, 'docs/visual-diff/approved-blocks');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({
  headless: true,
  executablePath: executablePath || undefined,
  args: process.env.PLAYWRIGHT_BYPASS_PROXY === '1' ? ['--no-proxy-server'] : undefined,
});

await mkdir(outputDirectory, { recursive: true });
const captures = [];

const capture = async ({ name, width, height, selector, isMobile = false, hasTouch = false }) => {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile,
    hasTouch,
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
  if (!response || response.status() >= 400) throw new Error(`${baseURL} returned ${response?.status()}`);
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: 'visible' });
  await page.evaluate(async (activeSelector) => {
    await document.fonts.ready;
    const root = document.querySelector(activeSelector);
    if (!root) throw new Error(`Capture selector was not found: ${activeSelector}`);
    await Promise.all(Array.from(root.querySelectorAll('img')).map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolveImage) => {
        image.addEventListener('load', resolveImage, { once: true });
        image.addEventListener('error', resolveImage, { once: true });
      });
    }));
  }, selector);
  const box = await locator.boundingBox();
  const path = resolve(outputDirectory, `${name}.png`);
  await locator.screenshot({ path, animations: 'disabled', caret: 'hide' });
  captures.push({ name, width, height, selector, path, box, consoleErrors, pageErrors, badResponses });
  await context.close();
};

try {
  await capture({ name: 'configurator-desktop-864', width: 864, height: 900, selector: '#configurator' });
  await capture({ name: 'recommendations-desktop-1440', width: 1440, height: 1000, selector: '#colors' });
  await capture({ name: 'technical-desktop-1440', width: 1440, height: 1000, selector: '#technical' });
  await capture({ name: 'configurator-mobile-390', width: 390, height: 844, selector: '#configurator', isMobile: true, hasTouch: true });
  await capture({ name: 'recommendations-mobile-390', width: 390, height: 844, selector: '#colors', isMobile: true, hasTouch: true });
  await capture({ name: 'technical-mobile-390', width: 390, height: 844, selector: '#technical', isMobile: true, hasTouch: true });
} finally {
  await browser.close();
}

await writeFile(
  resolve(outputDirectory, 'metadata.json'),
  `${JSON.stringify({ baseURL, capturedAt: new Date().toISOString(), captures }, null, 2)}\n`,
  'utf8',
);

const failures = captures.flatMap((item) => [
  ...item.consoleErrors.map((value) => `${item.name} console: ${value}`),
  ...item.pageErrors.map((value) => `${item.name} page: ${value}`),
  ...item.badResponses.map((value) => `${item.name} response: ${value}`),
]);
if (failures.length) throw new Error(failures.join('\n'));
process.stdout.write(`${JSON.stringify({ ok: true, captures }, null, 2)}\n`);
