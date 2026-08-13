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

`.env.local` в git не попадает.

## Команды

```bash
npm install     # установка зависимостей
npm run dev      # локальный запуск на http://localhost:3000
npm run build    # production-сборка
npm run lint     # ESLint
npm run seed     # залить демо-данные из seed-data.json (нужен .env.local)
npm run seed:dry # проверить данные без записи в БД
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
3. Примени миграции к проекту Supabase: `supabase db push` (или прогони
   `supabase/00*.sql` по порядку). Детали — в `supabase/README.md`.
4. Выдай себе права админа (`app_metadata.is_admin = true`), включи Email-провайдер
   (magic link) и добавь `<домен>/admin/auth/confirm` в Redirect URLs Supabase.
5. Залей демо-данные при необходимости: `npm run seed` (нужен
   `SUPABASE_SERVICE_ROLE_KEY`).
6. Deploy. Домен `NEXT_PUBLIC_SITE_URL` должен совпадать с реальным.

## Статус

Фаза 1 — каталог, расписание, бронирование. Порядок реализации по шагам — в `PROMPTS.md`.
Готово: **0–7** (инициализация, схема БД, i18n, сид, каталог, афиша, админка,
слоты и бронирование), **9. Перед запуском** (SEO, sitemap, robots, JSON-LD) и
**10. Фундамент под платное продвижение** (`lib/ranking.ts`, `provider_events`,
сбор событий, аналитика в админке — саму рекламу не реализуем).
Дальше: **8. Участники занятия** (Фаза 2, требует пользовательских аккаунтов).

### Админка

Закрытый раздел `/admin` (не локализован, не индексируется). Вход — magic link
через Supabase Auth. Доступ и запись требуют `app_metadata.is_admin = true` у
пользователя (см. `supabase/README.md`). CRUD провайдеров (все поля, услуги,
расписание, языки, переводы) и событий; загрузка фото в Storage.
