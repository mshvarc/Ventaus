import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const outputDirectory = resolve(process.env.VISUAL_OUTPUT_DIR || 'docs/visual-diff');
const outputPath = resolve(outputDirectory, 'footer-current-desktop.png');

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-proxy-server'],
});

const context = await browser.newContext({
  viewport: { width: 1672, height: 620 },
  colorScheme: 'dark',
  locale: 'ru-RU',
  reducedMotion: 'reduce',
  serviceWorkers: 'block',
});

try {
  const page = await context.newPage();
  const response = await page.goto(baseURL, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`Page returned ${response?.status() ?? 'no response'}`);

  const footer = page.locator('footer');
  await footer.scrollIntoViewIfNeeded();
  await page.evaluate(async () => document.fonts.ready);
  await footer.screenshot({ path: outputPath, animations: 'disabled', caret: 'hide' });
  process.stdout.write(`${outputPath}\n`);
} finally {
  await context.close();
  await browser.close();
}
