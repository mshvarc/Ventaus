# QA contract

## Unit gates

Файлы Configurator.test.tsx, LeadForm.test.tsx и StaticColorGallery.test.tsx покрывают десять обязательных пунктов из задания. Тесты основаны на доступных именах, aria-состояниях и фактических изменениях preview; декоративная структура CSS не является тестовым контрактом.

## E2E contract

Стабильные селекторы:

- Header: кнопка с aria-label Открыть меню / Закрыть меню; nav#primary-navigation.
- Configurator: section#configurator, кнопки по доступному имени, input#brightness.
- Static gallery: data-testid static-color-gallery.
- Form: section#request, поля name, phone, comment, consent и endpoint /api/preview-lead.
- Internal navigation: ссылки href, начинающиеся с #, обязаны иметь существующую цель.

Если доступные имена меняются, тесты обновляются одновременно с контентом. Нельзя добавлять testid вместо корректных label и aria-атрибутов.

## Execution order

1. npm run lint
2. npm run typecheck
3. npm run test
4. npm run build
5. npm run test:e2e

До завершения интеграции тесты не считаются выполненными. Факт запуска и результаты фиксируются в корневом docs/TEST_REPORT.md.
