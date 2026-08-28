# Deployment — Aurora Gallery preview

Дата публикации: 21 августа 2026 года.

> Примечание: этот документ описывает предыдущий активный релиз. Локальная ветка `codex/aurora-gallery-modules` с двумя новыми модулями ещё не развёрнута и не меняла сервер.

## Активный релиз

- URL: `https://polini.shvlab.ru/`;
- origin: собственный сервер заказчика `77.91.193.144`;
- canonical source: `/srv/nas/BoxPro/Диски/STUDIYA/YandexDisk/BOXPRO/САЙТЫ/ANNITI_SMART/site`;
- deployment root: `/srv/www/anniti-smart`;
- release: `/srv/www/anniti-smart/releases/20260821T161418Z-9983ef193125`;
- build ID: `20260821T161418Z-9983ef193125`;
- runtime commit: `9983ef193125827dafa173b026da7989acb20488`;
- container: `anniti-smart-preview`, состояние `running healthy`;
- reverse proxy: Caddy → `127.0.0.1:3086`.

Внешние хостинги не используются. DNS указывает на собственный сервер; runtime и файлы релиза находятся на нём.

## Резервная копия

Перед переносом коммита создан backup:

`/srv/nas/BoxPro/Диски/STUDIYA/YandexDisk/BOXPRO/САЙТЫ/ANNITI_SMART/backup/2026-08-21_16-13-48_before_aurora_deploy`

Предыдущий runtime-релиз сохранён:

`/srv/www/anniti-smart/releases/20260821T140609Z-386e065d3c05`

## Проверки

- frozen pnpm install: PASS;
- lint: PASS;
- typecheck: PASS;
- unit/API: 24/24 PASS;
- production build: PASS;
- server health-check: PASS;
- external DNS A: `77.91.193.144`;
- HTTPS: 200;
- HTTP redirect: 308 → HTTPS;
- TLS: 1.3, Let’s Encrypt, CN `polini.shvlab.ru`, действует до 19 ноября 2026 года;
- security/noindex headers: PASS;
- HTML-referenced assets: 6/6 returned 200;
- external Playwright: 112 passed, 8 expected skipped, 0 failed;
- external test lead: HTTP 201, single preview-journal record;
- post-deploy 5xx: 0;
- runtime error matches: 0;
- Caddy config validation: PASS;
- Lighthouse 13.4.1 desktop: Performance 100, Accessibility 100, Best Practices 100, LCP 484.9 мс, CLS 0.000353, TBT 0 мс.

## Артефакты

Каталог `docs/deployment/20260821T161418Z-9983ef193125/` содержит:

- `actual-reference-viewport.png`;
- `actual-desktop.png`;
- `actual-tablet.png`;
- `actual-mobile.png`;
- `capture-metadata.json`;
- `lighthouse-desktop.json`.

Тестовые заявки: `/var/lib/anniti-smart-preview/submissions/test-submissions.jsonl`.

## Caddy

Существующий vhost уже соответствовал preview-схеме, поэтому Caddyfile не изменялся и сервис не перезапускался. После релиза выполнена только проверка конфигурации.
