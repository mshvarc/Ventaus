# Reference files — Aurora Gallery

Дата фиксации: 21 августа 2026 года.

## Утверждённый макет

| Назначение | Имя | Расположение | Размер | SHA-256 |
|---|---|---|---:|---|
| Исходник, предоставленный пользователем | `2.png` | `\\192.168.77.65\BoxPro\Диски\STUDIYA\YandexDisk\BOXPRO\ДОГОВОРА С КЛИЕНТАМИ\ВЕНТАУС\МАКЕТЫ\2.png` | 1 518 298 B, 864×1821 px | `2EDC141457B796302EDC24C592AFB856CC9FCE71B1B4FD34D89C6C0327B40A09` |
| Каноническая неизменённая копия проекта | `aurora-gallery-approved.png` | `/srv/nas/BoxPro/Диски/STUDIYA/YandexDisk/BOXPRO/САЙТЫ/ANNITI_SMART/references/aurora-gallery-approved.png` | 1 518 298 B, 864×1821 px | `2EDC141457B796302EDC24C592AFB856CC9FCE71B1B4FD34D89C6C0327B40A09` |
| Локальная QA-копия | `reference-aurora-gallery.png` | `docs/visual-diff/reference-aurora-gallery.png` | 1 518 298 B, 864×1821 px | `2EDC141457B796302EDC24C592AFB856CC9FCE71B1B4FD34D89C6C0327B40A09` |

Совпадающий SHA-256 подтверждает, что локальная и каноническая копии не изменены относительно исходного файла.

## Дополнительные модули, предоставленные 21 августа 2026 года

| Назначение | Файл | Размер | SHA-256 |
|---|---|---:|---|
| Управление и RGB-конфигуратор | `references/modules/reference-controls-configurator.png` | 1 469 619 B | `92B44691F1E24E498CEC73FB3440E84C91EF5EDD6106CB1C6A1E7A9671EA3B9E` |
| Концептуальная геометрия, детали, интерьер и таблицы | `references/modules/reference-technical-module.png` | 404 888 B | `0D997CCCC506914AE89DEAF6E894093132E56187CDFFB9AC219590FAF0F55859` |
| Указанное место вставки между сценариями и формой | `references/modules/reference-insertion-location.png` | 1 263 403 B | `180FCB92AFC4896FC146480E31BD1D58AD7222D97307864CABA32D67AB1B049F` |

Эти файлы фиксируют функциональную структуру новых модулей. Их визуальный язык полностью адаптируется под утверждённый Aurora Gallery; они не меняют первые три секции и финальную форму.

## Локальные материалы, используемые runtime

Это реальные предоставленные фотографии, выбранные как ближайшие честные замены недоступным исходным рендерам из макета.

| Файл | Размер | SHA-256 |
|---|---:|---|
| `public/assets/images/cyan-studio.jpg` | 61 436 B | `ABFC92F4CDEF18EAB4A52DB4D8BA27914F73A7CA7E66D88CA2715CA34312F861` |
| `public/assets/images/cyan-home.jpg` | 149 921 B | `6E8FB99F76E47B620639DA6F440D4A5A7881F09DCE48521433E6255D6E479D3A` |
| `public/assets/images/violet-studio.jpg` | 56 446 B | `14C648F63DB536136EDFA56B47704A14FCC3DC4008C7C41AEA98F86204C3B5EF` |
| `public/assets/images/warm-home.jpg` | 133 965 B | `9B2848A7C01E8EB029C19981B728DC566555B93C106503EB1CFC65CC65B412E1` |
| `public/assets/images/outdoor.jpg` | 553 009 B | `D33B844792F05B902BA12E5D01BFCD2FFEB486EF03CD2757FFB5C4C4A98262F9` |
| `public/assets/images/detail-home.jpg` | 158 093 B | `C9CF24808B1B6A9C32A226CFBC2442DF442FB2E8CD787B97A748050699AA6FEF` |

## Концептуальные изображения технического модуля

| Файл | Размер | SHA-256 |
|---|---:|---|
| `public/assets/technical/anniti-smart-overall-geometry-v1.png` | 1 047 252 B | `6C6F2BF248369AB850BC1AE9930F537B055CFA772DF7FCDCBE30DD416E711635` |
| `public/assets/technical/anniti-smart-base-geometry-v1.png` | 1 079 093 B | `DFE89F426723947B444B917B887F907C234EDEEE1BB9276B37C2D88921C115E2` |
| `public/assets/technical/anniti-smart-exploded-construction-v1.png` | 813 313 B | `047388820FA4061A5728F4F5A97C61A4080278FEF5EBDE9D7E9399831CF7556A` |

Эти PNG воспроизводят концепцию из макета с круглым основанием, тогда как реальные фотографии показывают другое основание. Поэтому сайт прямо называет их концептуальными эскизами и не использует как инженерные чертежи.

## Шрифт-замена

| Файл | Размер | SHA-256 |
|---|---:|---|
| `public/fonts/Montserrat-Variable.ttf` | 744 936 B | `0F7B311B2F3279E4EEF9B2F968BCDBAB6E28F4DAEB1F049F4F278A902BCD82F7` |
| `public/fonts/Montserrat-Variable.woff2` | 216 076 B | `26C6EB7F2BF7060E4AD2FBCD51184B60CEB305C21E6ACB696608B2173B3B994B` |

Montserrat распространяется по OFL; текст лицензии находится в `public/fonts/OFL-Montserrat.txt`. Это не точный Cygre из эталона.

## Правила использования

- Утверждённый макет используется только как визуальный эталон.
- Нельзя размещать его целиком фоном страницы или вырезать из него текст, кнопки и интерфейс.
- Оригинальные файлы и каноническая копия в `references` не редактируются.
- Оптимизированные runtime-копии должны храниться отдельно от оригиналов.
