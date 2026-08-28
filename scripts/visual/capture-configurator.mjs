import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const outputDirectory = resolve(process.env.VISUAL_OUTPUT_DIR || 'docs/visual-diff');
const viewport = { width: 1672, height: 941 };

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: process.env.PLAYWRIGHT_BYPASS_PROXY === '1' ? ['--no-proxy-server'] : undefined,
});

const context = await browser.newContext({
  viewport,
  colorScheme: 'dark',
  locale: 'ru-RU',
  reducedMotion: 'reduce',
  serviceWorkers: 'block',
});
const page = await context.newPage();
const runtimeErrors = [];

page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => runtimeErrors.push(`page: ${error.message}`));
page.on('response', (response) => {
  if (response.status() >= 400) runtimeErrors.push(`response: ${response.status()} ${response.url()}`);
});

try {
  const response = await page.goto(baseURL, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`Page returned ${response?.status() ?? 'no response'}`);

  const configurator = page.locator('#configurator');
  await configurator.scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.querySelectorAll('#configurator img'));
    await Promise.all(
      images
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolveImage) => {
          image.addEventListener('load', resolveImage, { once: true });
          image.addEventListener('error', resolveImage, { once: true });
        })),
    );
  });
  await page.evaluate(() => {
    const element = document.querySelector('#configurator');
    if (!element) throw new Error('Configurator was not found');
    scrollTo(0, element.getBoundingClientRect().top + scrollY);
  });
  await page.waitForTimeout(120);

  const bounds = await configurator.boundingBox();
  if (!bounds) throw new Error('Configurator bounds were not available');

  const actualPath = resolve(outputDirectory, 'rgb-configurator-actual-desktop.png');
  await page.screenshot({
    path: actualPath,
    animations: 'disabled',
    caret: 'hide',
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
  });

  const metadata = {
    baseURL,
    viewport,
    configuratorBounds: bounds,
    actualPath,
    runtimeErrors,
    capturedAt: new Date().toISOString(),
  };
  await writeFile(resolve(outputDirectory, 'rgb-configurator-capture.json'), `${JSON.stringify(metadata, null, 2)}\n`);

  if (runtimeErrors.length > 0) throw new Error(runtimeErrors.join('\n'));
  process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`);
} finally {
  await context.close();
  await browser.close();
}
