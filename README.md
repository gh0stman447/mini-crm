# BuildFlow mini-CRM

Next.js App Router + Supabase CRM for construction objects and tasks.

## Setup

1. Create a Supabase project. In **Authentication → Providers → Email**, keep email/password enabled and disable new-user signups for production.
2. Apply all SQL files in `supabase/migrations/` in filename order, using the Supabase SQL editor or CLI.
3. Copy `.env.example` to `.env.local` and enter the project URL and **publishable** key. Never add a `service_role` key to this app.
4. Create test users manually in Supabase Auth. New profiles default to `worker`; promote managers manually:

```sql
update public.profiles set role = 'manager' where id = '<auth-user-uuid>';
```

5. Install and run:

```bash
pnpm install
pnpm dev
```

## Security model

- RLS is enabled on every application table.
- Workers can only read assigned tasks, their objects, and task histories.
- Authenticated clients cannot mutate tasks or status history directly.
- The approved RPCs validate the actor, role, permitted transition, and required return comment; every transition appends history.

## Checks

```bash
pnpm lint
pnpm build
```

The build uses webpack because this environment prevents Turbopack's internal CSS helper from binding a local port.
