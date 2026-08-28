# ANNITI SMART — локальная сборка Aurora Gallery

Адаптивный одностраничный preview-сайт ANNITI SMART, пересобранный по утверждённому макету **Aurora Gallery**. Неизменяемая основа — `references/aurora-gallery-approved.png`; дополнительные согласованные модули находятся в `references/modules`.

Статус: предыдущая утверждённая сборка опубликована на `https://polini.shvlab.ru/`. Текущая ветка с новым встроенным конфигуратором и техническим модулем проверена локально, но ещё не развёрнута: перед публикацией требуется просмотр preview и явное разрешение пользователя.

## Эталон и границы реализации

- Эталон: 864×1821 px.
- SHA-256: `2EDC141457B796302EDC24C592AFB856CC9FCE71B1B4FD34D89C6C0327B40A09`.
- Макет воспроизведён HTML/CSS/React-компонентами; изображение эталона не используется как фон сайта и не нарезается на элементы интерфейса.
- Исходные `Hero`, `Возможности`, `Создавайте настроение` и финальная форма не перестроены.
- Согласованные `Управление как удобно / Конфигуратор` и `Технический модуль` вставлены строго между сценариями и формой.
- Конфигуратор встроен в поток страницы; прежнего modal-дубля нет.

Точные исходники интерьерного hero, пяти единообразных студийных рендеров, макрофотографии циановых стержней и шрифта Cygre не предоставлены. В локальной версии используются реальные фотографии клиента и легальный локальный Montserrat. Полный перечень ограничений — в `docs/MISSING_CONTENT.md`.

## Требования

- Node.js 22.15+;
- pnpm 11.19.0;
- Chromium для Playwright;
- Python 3 для расчёта visual diff.

Docker Compose и Caddy нужны только для последующего preview-деплоя после согласования.

## Локальный запуск

```bash
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 4174
```

Production-проверка:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm preview --host 127.0.0.1 --port 4174
```

## E2E и визуальная проверка

```bash
pnpm exec playwright install chromium
pnpm exec playwright test --workers=1
node scripts/visual/capture.mjs
python scripts/visual/compose_aurora_comparison.py
python scripts/visual/compare.py
python scripts/visual/build-aurora-module-comparisons.py
```

Артефакты сохраняются в `docs/visual-diff`:

- `actual-reference-viewport.png` — реализация при 864×1821;
- `comparison-reference-actual.png` — эталон и реализация рядом;
- `overlay-reference-actual.png` — совмещение;
- `diff-reference-actual.png` — пиксельная разница;
- `actual-desktop.png`, `actual-tablet.png`, `actual-mobile.png` — адаптивные состояния;
- `metrics.json` — числовой результат сравнения.
- `aurora-modules-desktop-1440.png`, `aurora-modules-mobile-390.png` — текущая локальная итерация;
- `comparison-controls-reference-actual.png`, `comparison-technical-reference-actual.png` — focused source/actual новых модулей.

Старый глобальный pixel gate всей страницы остаётся неприменим к новым секциям без обновлённого полного макета: ранее он не проходил из-за отсутствующих исходных фотографий и точного шрифта. Для этой итерации выполнены отдельные source/actual сравнения модулей и browser-rendered design QA; результат зафиксирован в `design-qa.md` без подмены старых метрик.

## Структура проекта

- `src/content/siteContent.ts` — видимые тексты, контакты и подписи;
- `src/data/product.ts` — RGB-цвета, сценарии и сериализация выбранной конфигурации;
- `src/sections/Hero.tsx` — первый экран;
- `src/sections/AuroraFeatures.tsx` — блок возможностей;
- `src/sections/AuroraScenarios.tsx` — неизменённая статичная фотогалерея и ссылка к настройке;
- `src/sections/AuroraConfigurator.tsx` — способы управления и единый RGB-конфигуратор;
- `src/sections/AuroraTechnical.tsx` — концептуальная геометрия, реальные детали/интерьер и таблицы уточняемых данных;
- `src/sections/AuroraModules.css` — адаптация новых модулей к токенам Aurora;
- `src/sections/LeadForm.tsx` — компактная форма и payload заявки;
- `public/assets/images` — локальные фотографии клиента;
- `public/fonts/Montserrat-Variable.*` — локальный открытый шрифт, лицензия `public/fonts/OFL-Montserrat.txt`;
- `src/styles/tokens.css` — токены Aurora Gallery;
- `src/styles/global.css` — композиция, состояния и адаптивность;
- `server/index.mjs` — runtime и изолированный preview endpoint формы.

Соответствие частей макета компонентам зафиксировано в `docs/REFERENCE_MAP.md`, хэши источников — в `docs/REFERENCE_FILES.md`.

## Форма и тестовые заявки

`POST /api/preview-lead` выполняет серверную валидацию, проверяет honeypot, rate limit и идемпотентность. Выбранные RGB-цвет, яркость, режим, высота, количество стержней и сценарий добавляются к заявке.

После будущего preview-деплоя тестовые заявки хранятся отдельно от production:

```text
/var/lib/anniti-smart-preview/submissions/test-submissions.jsonl
```

Файл находится вне web root. В локальном статическом preview успешную отправку формы следует тестировать через mock или локально запущенный `server/index.mjs`.

## Preview deploy

Канонический путь исходников на NAS:

```text
/srv/nas/BoxPro/Диски/STUDIYA/YandexDisk/BOXPRO/САЙТЫ/ANNITI_SMART/site
```

Структура релизов:

```text
/srv/www/anniti-smart/releases/<BUILD_ID>
/srv/www/anniti-smart/current
```

Для последующих утверждённых релизов:

```bash
cd "/srv/nas/BoxPro/Диски/STUDIYA/YandexDisk/BOXPRO/САЙТЫ/ANNITI_SMART/site"
bash scripts/deploy/deploy-preview.sh
```

Актуальные доказательства текущего релиза, внешние проверки и контрольные скриншоты находятся в `docs/DEPLOYMENT.md` и `docs/deployment/20260821T161418Z-9983ef193125/`.

Rollback после будущего деплоя:

```bash
bash scripts/deploy/rollback.sh
# либо
bash scripts/deploy/rollback.sh <BUILD_ID>
```

## Текущий QA-статус

- lint: PASS;
- typecheck: PASS;
- unit/API: 27/27 PASS;
- production build: PASS;
- полный E2E на восьми viewport-проектах: 128 passed, 8 expected skipped, 0 failed;
- focused design QA новых модулей: PASS;
- deployment текущей ветки: НЕ ВЫПОЛНЕН;
- внешний сайт: предыдущий утверждённый релиз без изменений.

Актуальные результаты без завышения статуса — в `docs/TEST_REPORT.md`, `docs/VISUAL_REPORT.md` и `design-qa.md`.
