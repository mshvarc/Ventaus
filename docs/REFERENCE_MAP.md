# Reference map — Aurora Gallery

Карта связывает участки утверждённого макета с реальными компонентами и данными. Визуальный эталон не является runtime-ресурсом.

| Участок макета | Компонент | Исходный материал | Допустимое поведение | Источник текста/данных |
|---|---|---|---|---|
| Header: бренд, четыре пункта, два круглых social-control | `src/components/Header.tsx` | Геометрия из `aurora-gallery-approved.png` | Якорная навигация; мобильное меню; WhatsApp/Telegram неактивны до получения URL | `src/content/siteContent.ts`; названия соцсетей из макета |
| Hero 0–768 px: заголовок слева, светильник справа, CTA, три тезиса | `src/sections/Hero.tsx` | `public/assets/images/cyan-studio.jpg` как честная замена недоступного hero-render | CTA прокручивает к сценариям; фото не управляет конфигуратором | Тексты из `src/content/siteContent.ts`; фотография клиента |
| Возможности 768–1115 px: вводный текст и сетка 3×2 | `src/sections/AuroraFeatures.tsx` | Иконки Phosphor, токены из `src/styles/tokens.css` | Статичный информационный блок | `src/content/siteContent.ts`; неподтверждённые характеристики не выводятся числом |
| Сценарии 1115–1504 px: интро слева и пять вертикальных фото | `src/sections/AuroraScenarios.tsx` | `cyan-studio.jpg`, `cyan-home.jpg`, `violet-studio.jpg`, `warm-home.jpg`, `outdoor.jpg` | Пять компактных preset-кнопок меняют конфигурацию; сама фотогалерея остаётся статичной | Подписи — `src/content/siteContent.ts`; состояния — `src/data/product.ts` |
| Текстовое действие «Настроить свой свет» | `src/sections/AuroraScenarios.tsx` | Геометрия и подпись из Aurora Gallery | Якорь прокручивает к единственному встроенному конфигуратору; модального дубля нет | Действие — `src/content/siteContent.ts` |
| Управление и RGB-конфигуратор | `src/sections/AuroraConfigurator.tsx` | `references/modules/reference-controls-configurator.png`; реальное фото `cyan-studio.jpg` | Четыре концептуальных способа управления; единый RGB-цвет всех стержней; оттенок, высота, число стержней, режим, яркость и preset; выбор сохраняется и передаётся в форму | Структура — новый пользовательский reference; значения — `src/data/product.ts`; оговорки — `src/content/siteContent.ts` |
| Концептуальная геометрия, детали, интерьер и характеристики | `src/sections/AuroraTechnical.tsx` | `references/modules/reference-technical-module.png`; три concept PNG; `detail-home.jpg`; `cyan-home.jpg` | Статичный информационный модуль; неподтверждённые параметры выводятся как «Данные уточняются»; эскизы прямо не называются техчертежами | Таблицы — `src/data/product.ts`; честные подписи — `src/content/siteContent.ts` |
| Финальная панель после новых модулей: оффер, поля, CTA, macro справа | `src/sections/LeadForm.tsx` | `cyan-studio.jpg` как замена отсутствующего cyan macro | Клиентская и серверная валидация; honeypot; idempotency; выбранная конфигурация входит в payload | Форма — `src/content/siteContent.ts`; сериализация — `src/data/product.ts`; endpoint — `server/index.mjs` |
| Компактный footer поверх нижней панели | `src/components/Footer.tsx` | Не отдельная секция макета; интегрирован без изменения высоты страницы | Телефон, домен, маленькая ссылка разработчика SHV.Lab | Подтверждённые данные в `src/content/siteContent.ts` |

## Design tokens

Единый источник визуальных токенов — `src/styles/tokens.css`:

- фон `#1e1e1d`, глубокий фон `#020507`;
- поля `#292927`;
- display-текст `#c0c0c2`, body-текст `#858789`;
- мятный акцент `#77c0a0`;
- тонкие полупрозрачные линии;
- локальный Montserrat как документированная замена Cygre.

Все дополнительные интерактивные элементы используют эти токены и не вводят отдельный визуальный язык.

Порядок верхнеуровневых секций после локальной интеграции: `top → about → scenarios → controls → technical → request`. Первые три секции и финальная форма не перестроены; два согласованных модуля находятся строго в указанной позиции.
