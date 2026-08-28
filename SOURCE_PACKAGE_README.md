# ANNITI SMART — пакет исходников

Этот архив содержит исходный код текущей локальной версии сайта. Каталоги зависимостей, Git-история, production-сборка, кэши, временные файлы и тяжёлые QA-скриншоты намеренно исключены.

## Требования

- Node.js 22.15 или новее
- pnpm 11.19

## Запуск

```powershell
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 4174
```

## Проверка и сборка

```powershell
pnpm lint
pnpm typecheck
pnpm test -- --run
pnpm build
```

Основные файлы сайта находятся в `src`, клиентские изображения и шрифты — в `public`, тесты — в `tests` и `e2e`.
