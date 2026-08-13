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
```

## Статус

Фаза 1 — каталог, расписание, бронирование. Порядок реализации по шагам — в `PROMPTS.md`.
Текущий шаг: **0. Инициализация** (скелет проекта, клиенты Supabase, структура папок).
