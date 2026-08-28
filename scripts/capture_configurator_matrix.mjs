import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4175';
const outputDir = path.resolve('docs/visual-check/matrix-current');
const extremesDir = path.resolve('docs/visual-check/extremes-current');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const states = [
  { slug: 'green', color: '#05E627' },
  { slug: 'purple', color: '#C61DDA' },
];

await mkdir(outputDir, { recursive: true });
await mkdir(extremesDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});

await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(`${baseUrl}/#configurator`, { waitUntil: 'networkidle' });
await page.evaluate(() => window.localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

const configurator = page.getByTestId('inline-configurator');
await configurator.scrollIntoViewIfNeeded();
await page.getByTestId('configurator-height').filter({ hasText: '140 см' }).click();
await page.getByTestId('configurator-mode').filter({ hasText: 'Динамический RGB' }).click();
await page.getByRole('slider', { name: 'Яркость' }).fill('76');
await page.getByRole('slider', { name: 'Насыщенность' }).fill('78');

const report = [];

for (const state of states) {
  await page.locator(`[data-testid="configurator-color"][data-value="${state.color}"]`).click();

  for (const count of [3, 4, 5, 6, 7]) {
    await page.locator(`[data-testid="configurator-rods"][data-value="${count}"]`).click();
    await page.waitForTimeout(420);

    const preview = page.getByTestId('configurator-preview');
    const image = preview.locator('.aurora-live-preview__image');
    const base = page.getByTestId('configurator-preview-base');
    const plate = page.getByTestId('configurator-preview-plate');
    const rods = page.getByTestId('configurator-preview-rod');

    const fullPath = path.join(outputDir, `${state.slug}-${count}-full.png`);
    const previewPath = path.join(outputDir, `${state.slug}-${count}-preview.png`);
    await configurator.screenshot({ path: fullPath, animations: 'disabled' });
    await image.screenshot({ path: previewPath, animations: 'disabled' });

    report.push({
      color: state.color,
      count,
      fullPath,
      previewPath,
      previewBox: await preview.boundingBox(),
      imageBox: await image.boundingBox(),
      baseBox: await base.boundingBox(),
      plateSrc: await plate.getAttribute('src'),
      renderedRods: await rods.count(),
    });
  }
}

await writeFile(
  path.join(outputDir, 'matrix-meta.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);

const extremes = [];
for (const viewport of [
  { slug: 'desktop-1440', width: 1440, height: 1050 },
  { slug: 'tablet-1024', width: 1024, height: 768 },
]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.locator('[data-testid="configurator-color"][data-value="#C61DDA"]').click();

  for (const height of ['height-80', 'height-160']) {
    await page.locator(`[data-testid="configurator-height"][data-value="${height}"]`).click();

    for (const count of [3, 7]) {
      await page.locator(`[data-testid="configurator-rods"][data-value="${count}"]`).click();
      await page.waitForTimeout(420);

      const preview = page.getByTestId('configurator-preview');
      const image = preview.locator('.aurora-live-preview__image');
      const base = page.getByTestId('configurator-preview-base');
      const previewBox = await preview.boundingBox();
      const imageBox = await image.boundingBox();
      const baseBox = await base.boundingBox();
      const screenshotPath = path.join(
        extremesDir,
        `${viewport.slug}-${height}-${count}-preview.png`,
      );
      await image.screenshot({ path: screenshotPath, animations: 'disabled' });

      extremes.push({
        viewport,
        height,
        count,
        screenshotPath,
        previewBox,
        imageBox,
        baseBox,
        baseRelative: previewBox && imageBox && baseBox
          ? {
              x: baseBox.x - imageBox.x,
              bottom: imageBox.y + imageBox.height - (baseBox.y + baseBox.height),
              width: baseBox.width,
              height: baseBox.height,
            }
          : null,
      });
    }
  }
}

await writeFile(
  path.join(extremesDir, 'extremes-meta.json'),
  `${JSON.stringify(extremes, null, 2)}\n`,
  'utf8',
);

await browser.close();
console.log(`Captured ${report.length} color/count states and ${extremes.length} height/count extremes`);
