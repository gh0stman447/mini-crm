# BuildFlow — мини-CRM

Объекты строительства и задачи для постановщиков и исполнителей. Стек: Next.js, React, TypeScript, Supabase.

## Запуск

Требуются Node.js 22+ и pnpm (версия указана в `package.json`). Все команды выполняются из папки проекта с `package.json`.

1. Создайте проект Supabase и примените SQL-файлы из `supabase/migrations/` по порядку имён. Для уже настроенной базы повторно применять миграции не нужно.
2. Создайте в корне проекта файл `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   Значения возьмите в настройках Supabase. Используйте публичный ключ, не `service_role`.

3. В Supabase Auth включите вход по email/паролю, отключите открытую регистрацию и вручную создайте пользователей. Профили получают роль `worker`. Для постановщика выполните в SQL Editor:

   ```sql
   update public.profiles set role = 'manager' where id = '<ID пользователя из Auth>';
   ```

4. Установите зависимости и запустите приложение:

   ```bash
   pnpm install
   pnpm dev
   ```

Откройте http://localhost:3000 и войдите под созданным пользователем.

## Проверка и сборка

```bash
pnpm lint
pnpm build
pnpm start
```

Решения и допущения описаны в [DECISIONS.md](DECISIONS.md).
