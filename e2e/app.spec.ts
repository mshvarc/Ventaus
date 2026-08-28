import { expect, test, type Page } from '@playwright/test';
import { heights, rgbPresets, rodCounts, scenarioPresets, storageKey } from '../src/data/product';

const openPage = async (page: Page) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response, 'Главная страница должна вернуть HTTP response').not.toBeNull();
  expect(response!.status()).toBeLessThan(400);
  await expect(page.locator('main')).toBeVisible();
};

const openConfigurator = async (page: Page) => {
  const configurator = page.locator('#configurator');
  await configurator.scrollIntoViewIfNeeded();
  await expect(configurator).toBeVisible();
  return configurator;
};

test('1. страница открывается и содержит один h1', async ({ page }) => {
  await openPage(page);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText(/свет.*как.*искусство/i);
});

test('2. внутренние ссылки указывают на существующие цели', async ({ page }) => {
  await openPage(page);
  const hrefs = await page.locator('a[href^="#"]').evaluateAll((links) =>
    Array.from(new Set(links.map((link) => link.getAttribute('href')).filter(Boolean))) as string[],
  );
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(await page.locator(href).count(), `Нет цели для ссылки ${href}`).toBeGreaterThan(0);
  }
});

test('3. адаптивное меню открывается и закрывается', async ({ page }) => {
  await openPage(page);
  const toggle = page.getByRole('button', { name: 'Открыть меню' });
  test.skip(!(await toggle.isVisible()), 'На данном viewport используется desktop navigation');
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Закрыть меню' })).toHaveAttribute('aria-expanded', 'true');
  const navigation = page.locator('#primary-navigation');
  await expect(navigation).toBeVisible();
  const firstLink = navigation.locator('a').first();
  const href = await firstLink.getAttribute('href');
  await firstLink.click();
  expect(page.url()).toContain(href!);
  await expect(page.getByRole('button', { name: 'Открыть меню' })).toHaveAttribute('aria-expanded', 'false');
});

test('4. статичная галерея содержит пять фото и не содержит регуляторов', async ({ page }) => {
  await openPage(page);
  const gallery = page.getByTestId('static-color-gallery');
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery.locator('img')).toHaveCount(5);
  await expect(gallery.locator('input, button, [role="slider"]')).toHaveCount(0);
});

test('4a. новые модули стоят между сценариями и формой', async ({ page }) => {
  await openPage(page);
  const ids = await page.locator('main > section').evaluateAll((sections) => sections.map((section) => section.id));
  expect(ids).toEqual(['top', 'about', 'scenarios', 'controls', 'technical', 'request']);
  await expect(page.locator('#controls section#configurator')).toHaveCount(1);
  await expect(page.locator('#configurator input#brightness')).toHaveCount(1);
  await expect(page.locator('dialog.aurora-config')).toHaveCount(0);
});

test('5. готовый сценарий применяет полную комбинацию', async ({ page }) => {
  await openPage(page);
  const preset = scenarioPresets[2];
  await openConfigurator(page);
  await page.locator('[data-testid="configurator-height"][data-value="height-140"]').click();
  await page.locator('[data-testid="configurator-rods"][data-value="6"]').click();
  await page.locator(`[data-testid="configurator-scenario"][data-value="${preset.id}"]`).click();
  await openConfigurator(page);
  const preview = page.getByTestId('configurator-preview');
  await expect(preview).toHaveAttribute('data-preset', preset.id);
  await expect(preview).toHaveAttribute('data-color', preset.color);
  await expect(preview).toHaveAttribute('data-brightness', String(preset.brightness));
  await expect(preview).toHaveAttribute('data-mode', preset.controlMode);
  await expect(preview).toHaveAttribute('data-height', preset.height);
  await expect(preview).toHaveAttribute('data-rods', String(preset.rodCount));
});

test('5a. основание закреплено по высоте, а стержни входят в него из того же ракурса', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPage(page);
  await openConfigurator(page);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });

  const base = page.locator('.aurora-live-preview__base');
  const baseImage = base.locator('img');
  const previewCard = page.getByTestId('configurator-preview');
  await expect(baseImage).toHaveAttribute('src', '/assets/images/configurator/lamp-base-clean-5.png');
  await expect.poll(() => baseImage.evaluate((image) => {
    const element = image as HTMLImageElement;
    return element.complete && element.naturalWidth > 0;
  })).toBe(true);

  const initial = await base.evaluate((layer) => {
    const rect = layer.getBoundingClientRect();
    const frame = layer.parentElement!.getBoundingClientRect();
    return {
      x: rect.x - frame.x,
      bottom: frame.bottom - rect.bottom,
      width: rect.width,
      height: rect.height,
      transform: getComputedStyle(layer).transform,
    };
  });
  const initialCard = await previewCard.evaluate((layer) => {
    const rect = layer.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });

  const expectConstantBase = async () => {
    const current = await base.evaluate((layer) => {
      const rect = layer.getBoundingClientRect();
      const frame = layer.parentElement!.getBoundingClientRect();
      return {
        x: rect.x - frame.x,
        bottom: frame.bottom - rect.bottom,
        width: rect.width,
        height: rect.height,
        transform: getComputedStyle(layer).transform,
      };
    });
    for (const key of ['x', 'bottom', 'width', 'height'] as const) {
      expect(Math.abs(current[key] - initial[key]), `${key} основания изменился`).toBeLessThanOrEqual(0.5);
    }
    expect(current.transform).toBe(initial.transform);
    const card = await previewCard.evaluate((layer) => {
      const rect = layer.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    for (const key of ['width', 'height'] as const) {
      expect(Math.abs(card[key] - initialCard[key]), `${key} карточки изменился`).toBeLessThanOrEqual(0.5);
    }
  };

  const rodHeights = new Set<number>();
  for (const height of heights) {
    await page.locator(`[data-testid="configurator-height"][data-value="${height.id}"]`).click();
    await expect(page.getByTestId('configurator-preview')).toHaveAttribute('data-height', height.id);
    rodHeights.add(Math.round(await page.getByTestId('configurator-preview-rod').first().evaluate((rod) =>
      rod.getBoundingClientRect().height,
    )));
    await expectConstantBase();
  }
  expect(rodHeights.size, 'Каждая кнопка высоты должна менять только длину стержней').toBe(heights.length);

  const imageTop = await page.locator('.aurora-live-preview__image').evaluate((frame) => frame.getBoundingClientRect().top);
  const tallestTop = await page.getByTestId('configurator-preview-rod').evaluateAll((items) =>
    Math.min(...items.map((item) => item.getBoundingClientRect().top)),
  );
  expect(tallestTop, 'Стержни 160 см не должны обрезаться сверху').toBeGreaterThanOrEqual(imageTop - 1);

  for (const rodCount of rodCounts) {
    await page.locator(`[data-testid="configurator-rods"][data-value="${rodCount}"]`).click();
    await expectConstantBase();
    await expect(baseImage).toHaveAttribute('src', `/assets/images/configurator/lamp-base-clean-${rodCount}.png`);
    await expect(page.getByTestId('configurator-preview-rod')).toHaveCount(rodCount);
    await expect(baseImage).toHaveAttribute('data-hole-count', String(rodCount));
    await expect.poll(() => baseImage.evaluate((image) => {
      const element = image as HTMLImageElement;
      return element.complete && element.naturalWidth > 0;
    })).toBe(true);
  }
});

test('6. RGB-настройка работает мышью', async ({ page }) => {
  await openPage(page);
  await openConfigurator(page);
  const color = rgbPresets[7].value;
  await page.locator(`[data-testid="configurator-color"][data-value="${color}"]`).click();
  await page.getByRole('slider', { name: 'Яркость' }).fill('53');
  await page.locator('[data-testid="configurator-mode"][data-value="music-responsive"]').click();
  const preview = page.getByTestId('configurator-preview');
  await expect(preview).toHaveAttribute('data-color', color);
  await expect(preview).toHaveAttribute('data-brightness', '53');
  await expect(preview).toHaveAttribute('data-mode', 'music-responsive');
  await expect(preview).toHaveAttribute('data-preset', 'custom');
});

test('7. RGB-настройка работает с клавиатуры', async ({ page }) => {
  await openPage(page);
  await openConfigurator(page);
  const color = page.locator(`[data-testid="configurator-color"][data-value="${rgbPresets[5].value}"]`);
  await color.focus();
  await page.keyboard.press('Enter');
  await expect(color).toHaveAttribute('aria-pressed', 'true');
  const brightness = page.getByRole('slider', { name: 'Яркость' });
  await brightness.focus();
  await page.keyboard.press('Home');
  await expect(brightness).toHaveValue('0');
  await page.keyboard.press('ArrowUp');
  await expect(brightness).toHaveValue('1');
});

test('8. RGB-настройка работает на touch viewport', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, 'Проверка предназначена для touch viewport');
  await openPage(page);
  await openConfigurator(page);
  const color = rgbPresets[3].value;
  await page.locator(`[data-testid="configurator-color"][data-value="${color}"]`).tap();
  await page.getByRole('slider', { name: 'Яркость' }).fill('47');
  await expect(page.getByTestId('configurator-preview')).toHaveAttribute('data-color', color);
  await expect(page.getByTestId('configurator-preview')).toHaveAttribute('data-brightness', '47');
});

test('9. настройка сохраняется после перезагрузки', async ({ page }) => {
  await openPage(page);
  await openConfigurator(page);
  const color = rgbPresets[6].value;
  await page.locator(`[data-testid="configurator-color"][data-value="${color}"]`).click();
  await page.getByRole('slider', { name: 'Яркость' }).fill('41');
  await page.waitForFunction((key) => {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}') as { brightness?: number };
    return saved.brightness === 41;
  }, storageKey);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openConfigurator(page);
  await expect(page.getByTestId('configurator-preview')).toHaveAttribute('data-color', color);
  await expect(page.getByRole('slider', { name: 'Яркость' })).toHaveValue('41');
});

test('10. форма отправляет выбранную конфигурацию', async ({ page }) => {
  const expectedColor = rgbPresets[8].value;
  await page.route('**/api/preview-lead', async (route) => {
    const payload = route.request().postDataJSON() as {
      consent?: boolean;
      config?: Record<string, unknown>;
      configurationText?: string;
    };
    expect(payload.consent).toBe(true);
    expect(payload.config).toEqual(expect.objectContaining({
      color: expectedColor,
      brightness: 64,
      saturation: 70,
      controlMode: 'music-responsive',
      scenario: 'custom',
    }));
    expect(payload.configurationText).toContain('RGB:');
    expect(route.request().headers()['idempotency-key']).toBeTruthy();
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });

  await openPage(page);
  await openConfigurator(page);
  await page.locator(`[data-testid="configurator-color"][data-value="${expectedColor}"]`).click();
  await page.getByRole('slider', { name: 'Яркость' }).fill('64');
  await page.getByRole('slider', { name: 'Насыщенность' }).fill('70');
  await page.locator('[data-testid="configurator-mode"][data-value="music-responsive"]').click();
  await page.getByRole('link', { name: /добавить выбранное к заявке/i }).click();
  const form = page.getByTestId('lead-form');
  await form.getByLabel('Имя').fill('E2E пользователь');
  await form.getByLabel('Телефон').fill('+7 999 123-45-67');
  await form.getByLabel('Комментарий').fill('E2E preview');
  await form.getByRole('checkbox', { name: /политик/i }).check();
  await form.getByRole('button', { name: /подобрать свой свет/i }).click();
  await expect(page.getByTestId('lead-status')).toContainText(/заявка принята/i);
});

test('11. неполная форма не отправляется', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/preview-lead', (route) => { requests += 1; return route.continue(); });
  await openPage(page);
  const form = page.getByTestId('lead-form');
  await form.getByRole('button', { name: /подобрать свой свет/i }).click();
  await expect(form.getByText('Введите имя')).toBeVisible();
  await expect(form.getByText('Введите телефон')).toBeVisible();
  await expect(form.getByText('Нужно согласие на обработку данных')).toBeVisible();
  expect(requests).toBe(0);
});

test('12. форма показывает серверную ошибку', async ({ page }) => {
  await page.route('**/api/preview-lead', (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'e2e-test' }),
  }));
  await openPage(page);
  const form = page.getByTestId('lead-form');
  await form.getByLabel('Имя').fill('E2E пользователь');
  await form.getByLabel('Телефон').fill('+7 999 123-45-67');
  await form.getByRole('checkbox', { name: /политик/i }).check();
  await form.getByRole('button', { name: /подобрать свой свет/i }).click();
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: /не удалось отправить/i })).toBeVisible();
});

test('13. нет JS errors, 404/500, failed requests, mixed content и горизонтального скролла', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const badResponses: string[] = [];
  const failedRequests: string[] = [];
  const mixedContent: string[] = [];
  const externalBaseIsHttps = String(testInfo.project.use.baseURL || '').startsWith('https://');
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() === 404 || response.status() >= 500) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText || 'failed'}`));
  page.on('request', (request) => {
    if (externalBaseIsHttps && request.url().startsWith('http://')) mixedContent.push(request.url());
  });
  await openPage(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(badResponses).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(mixedContent).toEqual([]);
  expect(overflow.document).toBeLessThanOrEqual(overflow.viewport + 1);
});

test('14. основной контент доступен при prefers-reduced-motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPage(page);
  await expect(page.locator('#about')).toBeVisible();
  await expect(page.locator('#scenarios')).toBeVisible();
  await expect(page.locator('#controls')).toBeVisible();
  await expect(page.locator('#configurator')).toBeVisible();
  await expect(page.locator('#technical')).toBeVisible();
  await expect(page.locator('#request')).toBeVisible();
});

test('14a. технические изображения загружаются без ошибок', async ({ page }) => {
  await openPage(page);
  const technical = page.locator('#technical');
  await technical.scrollIntoViewIfNeeded();
  const images = technical.locator('img');
  await expect(images).toHaveCount(5);
  await expect.poll(async () => images.evaluateAll((items) => items.every((item) => {
    const image = item as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  }))).toBe(true);
});

test('15. контакты и компактная подпись разработчика корректны', async ({ page }) => {
  await openPage(page);
  const footer = page.locator('footer');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.getByRole('link', { name: '+7 499 110-17-78' })).toHaveAttribute('href', 'tel:+74991101778');
  await expect(footer).toContainText('polinilight.ru');
  const developerLink = footer.getByRole('link', { name: /SHV\.Lab — сайт разработчика/i });
  await expect(developerLink).toHaveAttribute('href', 'https://shvlab.ru/');
  await expect(developerLink).toHaveAttribute('target', '_blank');
});
