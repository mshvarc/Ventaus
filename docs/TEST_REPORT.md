# Test report — Aurora Gallery modules

Дата последней проверки: 24 августа 2026 года.

## Статус

Финальная локальная сборка с выбранным пользователем компактным вариантом 2 для `AuroraTechnical` прошла статические, unit и полные E2E-проверки. Деплой этой ветки не выполнялся; публичный `https://polini.shvlab.ru/` остаётся на предыдущем утверждённом релизе.

## Результаты

| Проверка | Результат | Детали |
|---|---|---|
| ESLint | PASS | 0 warnings, `--max-warnings 0` |
| TypeScript | PASS | 0 diagnostics |
| Unit/API | PASS | 6 файлов, 27/27 тестов |
| Production build | PASS | Vite 8.2.1; 93 модуля; JS 297.20 kB / gzip 88.76 kB; CSS 31.14 kB / gzip 6.61 kB |
| Full E2E | PASS | 128 passed; 8 expected skipped; 0 failed; 8 viewport-проектов |
| Browser interaction | PASS | единое состояние конфигуратора меняет preview и скрытое поле формы |
| Responsive overflow | PASS | browser-rendered проверки и E2E: горизонтального скролла нет |
| Browser console | PASS | 0 errors, 0 warnings после взаимодействий |
| Technical assets | PASS | 5/5 изображений загружены, `naturalWidth > 0` |
| Visual QA | PASS | source/actual сравнения без оставшихся P0/P1/P2; ограничения контента документированы |

## E2E-матрица

- desktop: 1920×1080, 1440×900, 1366×768;
- tablet: 1024×768, 768×1024;
- mobile: 430×932, 390×844, 360×800.

Проверки охватывают:

1. Порядок `top → about → scenarios → controls → technical → request`.
2. Единственный встроенный `#configurator` и отсутствие прежнего modal-дубля.
3. Неизменённую статичную галерею из пяти фотографий без регуляторов.
4. RGB-цвет, яркость, высоту, число стержней, режимы и preset-сценарии.
5. Сохранение полной комбинации в `localStorage`.
6. Передачу полной комбинации в payload формы.
7. Валидацию, повторную отправку, успешный и ошибочный сценарии формы.
8. Мобильное меню, клавиатуру, touch viewport и `prefers-reduced-motion`.
9. Ошибки JavaScript, HTTP 4xx/5xx, mixed content и горизонтальное переполнение.
10. Загрузку всех технических изображений и корректность footer/контактов.

## Воспроизведение

```powershell
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run build
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4196'
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:PLAYWRIGHT_BYPASS_PROXY='1'
pnpm run test:e2e:external
```

E2E выполнялся против свежего `dist` на локальном preview `http://127.0.0.1:4174/` с системным Chrome. Локальный preview для просмотра пользователем продолжает работать на этом адресе.

HTML-отчёт: `playwright-report/index.html`.
