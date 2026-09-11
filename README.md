# SNG Services

Каталог и система бронирования услуг для русскоязычной аудитории в UK.
Next.js (App Router) + Supabase + Tailwind, деплой на Vercel.

Требования, интерфейс и порядок работ описаны в `DESIGN.md` и `PROMPTS.md`.
Правила разработки — в `CLAUDE.md`.

## Стек

- **Next.js 16** (App Router, TypeScript, ESLint)
- **Supabase** — Postgres, Auth, Storage (`@supabase/supabase-js`, `@supabase/ssr`)
- **Tailwind CSS 4**

## Структура

```
/app          — роуты Next.js
/components   — переиспользуемые UI-компоненты
/lib          — работа с данными, клиенты Supabase, утилиты
  /supabase   — server- и browser-клиенты Supabase
/supabase     — SQL-миграции
/types        — общие типы TypeScript
```

## Переменные окружения

Скопируй `.env.local.example` в `.env.local` и заполни:

| Переменная | Назначение |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon-ключ (безопасен для браузера) |
| `SUPABASE_SERVICE_ROLE_KEY` | сервисный ключ, только сервер, обходит RLS |
| `NEXT_PUBLIC_SITE_URL` | базовый URL сайта |
| `CRON_SECRET` | секрет для защищённого роута планировщика волн (любая длинная случайная строка) |

`.env.local` в git не попадает.

## Команды

```bash
npm install     # установка зависимостей
npm run dev      # локальный запуск на http://localhost:3000
npm run build    # production-сборка
npm run lint     # ESLint
npm run seed     # залить демо-данные из seed-data.json (нужен .env.local)
npm run seed:dry # проверить данные без записи в БД
npm run seed:test-master   # создать тестового мастера, привязанного к твоему аккаунту
npm run requests:advance   # прогнать одну итерацию волн вручную (нужен запущенный dev)
```

`npm run seed` идемпотентный: повторный запуск обновляет данные, а не дублирует.
Запускается через нативный TypeScript-стриппинг Node (без ts-node/tsx). Нужны
`NEXT_PUBLIC_SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` в `.env.local`.

## База данных

Схема — в `/supabase` (пронумерованные миграции), типы — в `/types`.
Подробности и порядок применения — в `supabase/README.md`.

## Интернационализация

next-intl, база `en`, префикс в URL всегда явный (`/en`, `/ru`). Локали и флаг
`enabled` — в `i18n/locales.ts`, переводы — в `/messages/{locale}.json`.
Включённые: `en`, `ru`. Готовы к переводу (файлы с английскими значениями,
`enabled: false`): `uk`, `kk`, `ka`, `hy`. Отсутствующий ключ падает на английский.

## SEO

- Метаданные и Open Graph на языке страницы (`generateMetadata` в layout и на
  страницах); `hreflang` для включённых локалей + `x-default`.
- `sitemap.xml` (динамический, из опубликованных провайдеров и событий, со всеми
  локалями) и `robots.txt` (закрывает `/admin`).
- JSON-LD: `LocalBusiness` на страницах провайдеров, `Event` на страницах событий.
- Секреты не утекают в клиент: `SUPABASE_SERVICE_ROLE_KEY` используется только на
  сервере; в клиентском бандле — лишь `NEXT_PUBLIC_*`.

## Деплой на Vercel

1. Импортируй репозиторий в Vercel (framework определится как Next.js).
2. Задай переменные окружения (см. таблицу выше) в Project Settings → Environment
   Variables. `NEXT_PUBLIC_SITE_URL` — продовый домен (влияет на canonical,
   hreflang, sitemap, OG).
3. Примени миграции к проекту Supabase: `supabase link --project-ref <ref>` и
   `supabase db push`. Локально — `supabase start` + `supabase db reset`. Детали —
   в `supabase/README.md`.
4. Выдай себе права админа (`app_metadata.is_admin = true`), включи Email-провайдер
   (magic link) и добавь в Redirect URLs Supabase: `<домен>/admin/auth/confirm`
   и `<домен>/*/business/auth/confirm` (вход мастеров в кабинет).
5. Залей демо-данные при необходимости: `npm run seed` (нужен
   `SUPABASE_SERVICE_ROLE_KEY`).
6. Задай `CRON_SECRET` и настрой планировщик волн (см. «Планировщик волн» ниже).
7. Deploy. Домен `NEXT_PUBLIC_SITE_URL` должен совпадать с реальным.

## Уведомления (мастерам о заявках)

Заявка доходит до мастера через `NotificationChannel` (`lib/notifications/`).
Сейчас единственная реализация — `ConsoleChannel`: печатает письмо в консоль
сервера и **ничего не отправляет**. Точки вызова расставлены как при настоящей
отправке — волны 1/2/3 (`lib/requests/advance.ts`), матч (accept и выбор отклика),
отмена (`lib/requests/guest.ts`). Факт отправки пишется в `request_targets`
(`notified_at`, `channel`), повторный прогон волны не шлёт дважды.

**Подключить Resend, когда будет свой домен:**

1. Верифицируй домен в Resend, получи API-ключ, добавь `RESEND_API_KEY` в env.
2. Установи SDK: `npm i resend` (единственная новая зависимость — согласуй).
3. Создай `lib/notifications/resend-channel.ts` c классом `ResendChannel implements
   NotificationChannel`, где `send()` вызывает Resend с `message.subject`,
   `message.body`, `message.emails` (адрес «от» — на твоём домене).
4. В `getNotificationChannel()` (`lib/notifications/channel.ts`) верни
   `ResendChannel` вместо `ConsoleChannel`. Точки вызова НЕ трогаются.
5. Письмо содержит ссылку в веб-кабинет (`ctaPath`), а не саму заявку; контакты
   клиента и адрес в письмо не попадают (раскрываются победителю после матча).

SMS и push (когда появится приложение) добавляются так же — новой реализацией
того же интерфейса; `request_targets.channel` уже хранит фактический канал.

## Планировщик волн (pg_cron + pg_net)

`advanceRequests()` продвигает заявки по волнам и истечению. Её нужно вызывать
раз в несколько минут. Vercel Cron на бесплатном тарифе запускается редко
(≈раз в сутки) — 15-минутные волны так не обслужить. Поэтому расписание держим
**в Supabase**: `pg_cron` внутри Postgres дёргает `pg_net`, который POST-ит на
защищённый роут `/api/requests/advance` (секрет `CRON_SECRET` в заголовке).
Логика волн остаётся одна, в TypeScript, дублировать её в SQL не нужно.

Настроить один раз (SQL-редактор Supabase, права владельца БД):

```sql
-- 1. расширения
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. секрет и URL держим в Vault, а не в открытом расписании
select vault.create_secret('https://<домен>/api/requests/advance', 'advance_url');
select vault.create_secret('<тот же CRON_SECRET, что в env Vercel>', 'advance_secret');

-- 3. каждые 3 минуты: прочитать секреты и вызвать роут
select cron.schedule('advance-requests', '*/3 * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'advance_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'advance_secret')
    ),
    body    := '{}'::jsonb
  );
$$);
```

Снять расписание: `select cron.unschedule('advance-requests');`. Проверить
запуски: `select * from cron.job_run_details order by start_time desc limit 10;`.
Роут без верного `Bearer $CRON_SECRET` отвечает 401, так что дёрнуть его снаружи
нельзя.

## Статус

Фаза 1 — каталог, расписание, бронирование. Порядок реализации по шагам — в `PROMPTS.md`.
Готово: **0–7**, **9. Перед запуском** (SEO), **10. Фундамент под платное
продвижение**, и **8. Участники занятия** (Фаза 2) в объёме, возможном без
пользовательских аккаунтов: тумблер `is_visible_to_group` при бронировании и
безопасный показ участников группового слота (только имя + инициал, без
контактов, через SECURITY DEFINER функцию). Персональный кабинет с тумблером и
счётчик «вы были вместе N раз» требуют аккаунтов и появятся с ними.

Все 10 шагов PROMPTS.md пройдены.

### Админка

Закрытый раздел `/admin` (не локализован, не индексируется). Вход — magic link
через Supabase Auth. Доступ и запись требуют `app_metadata.is_admin = true` у
пользователя (см. `supabase/README.md`). CRUD провайдеров (все поля, услуги,
расписание, языки, переводы) и событий; загрузка фото в Storage.
