# Rollback — Aurora Gallery preview

Текущий релиз:

`20260821T161418Z-9983ef193125`

Проверенный предыдущий релиз:

`20260821T140609Z-386e065d3c05`

Команда отката:

```bash
cd "/srv/nas/BoxPro/Диски/STUDIYA/YandexDisk/BOXPRO/САЙТЫ/ANNITI_SMART/site"
bash scripts/deploy/rollback.sh 20260821T140609Z-386e065d3c05
```

Скрипт атомарно переключает `current`, пересоздаёт только контейнер `anniti-smart-preview` и проверяет build ID через `/healthz`. Другие сайты, контейнеры и vhost не затрагиваются.

После rollback проверить:

```bash
wget --quiet --output-document=- http://127.0.0.1:3086/healthz
readlink -f /srv/www/anniti-smart/current
docker inspect -f '{{.State.Status}} {{.State.Health.Status}}' anniti-smart-preview
```
