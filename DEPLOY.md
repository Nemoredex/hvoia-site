# Запуск сайта «Хвоя»

Пошагово: от VPS до проверки в Яндекс Вебмастере. Домен остаётся прежним — `https://www.hvoia-event.ru/`, поэтому «Переезд сайта» в Вебмастере **не нужен**. Нужны только 301 со старых адресов, а они уже готовы.

## 0. Перед запуском (блокеры)

`npm run seo:check` должен проходить без ошибок. Сейчас не хватает:
- [x] PDF «Правила проживания» → `public/docs/pravila-prozhivaniya.pdf` (взят со старого сайта; свежую версию от заказчика класть под тем же именем)
- [ ] ОГРН → `src/data/company.json`, поле `legal.ogrn`
- [ ] текст политики ПДн → `src/pages/politika-konfidencialnosti.astro`
- [ ] все `[заглушки]` из SEO-отчёта (`npm run seo` → `seo-report.html`)
- [ ] настоящее фото организатора и его имя (блок заявки)

## 1. Сервер

VPS в РФ (Timeweb Cloud, Selectel, Beget VPS) — из-за 152-ФЗ: форма собирает персональные данные. Ubuntu 24.04, Node 24, nginx, certbot.

```bash
sudo apt install nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - && sudo apt install nodejs
sudo mkdir -p /var/www/hvoia && sudo chown $USER /var/www/hvoia
git clone <репозиторий> /var/www/hvoia && cd /var/www/hvoia
cp .env.example .env   # заполнить: TELEGRAM_*, SMTP_*, PUBLIC_METRIKA_ID
npm ci && npm run build && node scripts/redirects.mjs
```

`PUBLIC_*` переменные читаются **при сборке**: после их изменения пересобрать (`npm run build`).

## 2. nginx и API

```bash
sudo certbot certonly --nginx -d www.hvoia-event.ru -d hvoia-event.ru
sudo ln -s /var/www/hvoia/deploy/nginx.conf /etc/nginx/sites-enabled/hvoia.conf
sudo nginx -t && sudo systemctl reload nginx
sudo cp deploy/hvoia-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now hvoia-api
```

Что делает `deploy/nginx.conf`:
- `http://` и адрес без `www` → 301 на `https://www.hvoia-event.ru`;
- 79 правил 301 со старого Drupal-сайта (`deploy/nginx-redirects.conf`);
- `/kottedzh` → `/kottedzh/`;
- настоящий код 404 со страницей сайта;
- gzip, кеш `/_astro/` на год, HTML на 5 минут;
- `/api/` → Node на `127.0.0.1:4321`.

Конфиг написан, но **на живом nginx ещё не проверен** — `nginx -t` обязателен.

Хостинг без nginx (Apache, `.htaccess`) — правила 301 лежат в `deploy/htaccess-redirects`.

## 3. Проверка после выкладки (15 минут)

Всё про сервер одной командой (коды ответов, 301 со всех старых адресов, 404, сжатие, кеш, зеркала, robots):

```bash
node scripts/check-server.mjs https://www.hvoia-event.ru
```

То же вручную:

```bash
curl -sI http://hvoia-event.ru/ | head -3                    # 301 → https://www.
curl -sI https://www.hvoia-event.ru/kottedzh | head -3       # 301 → /kottedzh/
curl -sI https://www.hvoia-event.ru/stoimost | head -3       # 301 → /ceny/
curl -sI https://www.hvoia-event.ru/net-takoy/ | head -1     # 404
curl -s https://www.hvoia-event.ru/robots.txt
```

- [ ] Заявка с сайта пришла в Telegram и на почту
- [ ] PageSpeed Insights (pagespeed.web.dev), мобильный: LCP < 2,5 с, CLS < 0,1, INP < 200 мс
- [ ] Валидатор микроразметки Яндекса (webmaster.yandex.ru/tools/microtest/) — главная, коттедж, свадьбы, цены, фото
- [ ] validator.schema.org — те же страницы

## 4. Поисковики и карты

- [ ] **Яндекс Вебмастер:** права на сайт уже есть со старого сайта → «Файлы Sitemap» → `https://www.hvoia-event.ru/sitemap-index.xml`; «Проверка ответа сервера» для 5–6 страниц; «Переобход страниц» для всех 8.
- [ ] **Регион «Воронеж»** берётся из карточки в Яндекс Бизнесе (организация 200587327520). Адрес, телефоны и сайт в карточке должны совпадать с сайтом символ в символ.
- [ ] **Google Search Console:** подтвердить домен, добавить sitemap.
- [ ] **Яндекс Метрика:** `PUBLIC_METRIKA_ID` в `.env` → пересобрать. Цели в интерфейсе Метрики: JavaScript-события `lead`, `phone`, `messenger`, `booking`.
- [ ] **IndexNow** (необязательно): ускоряет переобход в Яндексе.

## 5. Первые две недели

- Вебмастер → «Страницы в поиске»: старые адреса уходят, новые появляются.
- Вебмастер → «Диагностика» и «Ссылки → Битые» — исправлять сразу.
- Если в «Исключённых» всплывают неизвестные старые адреса — дописать их в `_migration/old-urls.csv`, затем `node scripts/redirects.mjs` и `sudo systemctl reload nginx`.

## Демо на GitHub Pages

`.github/workflows/deploy.yml` собирает копию в подпапку и закрывает её от индексации (`robots.txt: Disallow: /` и `noindex`). Включение: Settings → Pages → Source: GitHub Actions. Формы на демо не отправляются — на Pages нет сервера, поэтому они показывают телефоны.
