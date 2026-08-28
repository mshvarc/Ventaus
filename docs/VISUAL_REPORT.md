# Visual report — Aurora Gallery modules

Дата последней проверки: 24 августа 2026 года.

## Статус

`LOCAL_DESIGN_QA_PASS / PUBLIC_SITE_UNCHANGED`

Два согласованных модуля локально вставлены строго между секциями `Создавайте настроение` и `Подберём свет под ваш интерьер`. Технический модуль переработан только в пределах выбранного пользователем компактного варианта 2. Опубликованный `https://polini.shvlab.ru/` этой веткой не изменён.

## Источники визуальной истины

- неизменяемая основа Aurora Gallery: `docs/visual-diff/reference-aurora-gallery.png`;
- функции управления и конфигуратор: `references/modules/reference-controls-configurator.png`;
- концептуальный технический модуль: `references/modules/reference-technical-module.png`;
- указанная позиция вставки: `references/modules/reference-insertion-location.png`.

## Browser-rendered evidence

- полный desktop 1440×900: `docs/visual-diff/aurora-modules-desktop-1440.png`;
- mobile 390×844: `docs/visual-diff/aurora-modules-mobile-390.png`;
- сфокусированный блок управления: `docs/visual-diff/aurora-controls-actual-1440.png`;
- сфокусированный технический блок: `docs/visual-diff/aurora-technical-actual-1440.png`;
- source/actual управления: `docs/visual-diff/comparison-controls-reference-actual.png`;
- source/actual технического модуля: `docs/visual-diff/comparison-technical-reference-actual.png`;
- положение до/после: `docs/visual-diff/comparison-location-before-after.png`.
- выбранный компактный вариант 2: `docs/visual-diff/technical-compact-reference.png`;
- финальная реализация блока: `docs/visual-diff/technical-compact-actual-desktop.png`;
- reference/implementation в одном кадре: `docs/visual-diff/technical-compact-comparison.png`;
- mobile 390×844: `docs/visual-diff/technical-compact-actual-mobile.png`, `technical-compact-actual-mobile-lower.png`.

## Проверенные поверхности

| Поверхность | Результат |
|---|---|
| Композиция | Исходные `top`, `about`, `scenarios` и `request` не перестроены; новые `controls` и `technical` находятся между `scenarios` и `request`. |
| Типографика | Оба модуля используют тот же локальный Montserrat Aurora, тонкие display-веса, uppercase и межбуквенные интервалы основного сайта. |
| Цвет и токены | Использованы существующие `--aurora-*`: глубокий фон, серый текст, мятный акцент, тонкие линии. Отдельный визуальный язык не введён. |
| Сетка и интервалы | Desktop-конфигуратор сохраняет двухколоночную структуру референса; technical-модуль использует утверждённую compact-editorial сетку 52/48, две фото-зоны и единый dossier справа. |
| Иконки | Только Phosphor Icons; кастомных SVG, emoji и CSS-иллюстраций нет. |
| Изображения | Превью, детали и интерьер используют реальные клиентские фотографии; схемы явно обозначены как концептуальные, не инженерные. |
| Copy | Неподтверждённые функции и параметры помечены как концепция или «Данные уточняются»; выдуманные характеристики не добавлены. |
| Responsive | В браузере проверены 1024×768, 768×1024, 430×932, 390×844 и 360×800; горизонтального переполнения нет. |
| Interaction | RGB, высота, число стержней, режим, яркость и preset меняют единое состояние; сериализованная комбинация обновляется в скрытом поле формы. |
| Accessibility | `section#configurator`, `input#brightness`, общий technical `h2`, видимый focus; range hit-area 32 px; мелкие подписи имеют усиленный контраст. |
| Console | После взаимодействий browser console: 0 errors, 0 warnings. |

## Осознанные ограничения

1. Технические PNG повторяют круглое основание концептуального макета, тогда как реальные фотографии показывают иное основание. Поэтому они подписаны как концептуальные и не выдаются за CAD/чертёж.
2. Реальное preview-фото содержит пять стержней; варианты 3/4/6/7 отображаются только как условная настройка и прямо оговорены в подписи.
3. Точная комплектация приложения, голосового управления, музыкального отклика и таймеров требует подтверждения клиента; на preview они помечены как концепция.
4. Точный Cygre отсутствует; сохранён легальный Montserrat по OFL.

Эти ограничения относятся к недостающему контенту и подтверждению продукта, а не к ошибкам layout или работоспособности.
