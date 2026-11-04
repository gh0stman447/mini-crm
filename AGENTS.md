# Mini-CRM Agent Guide

## Project Identity

A mini-CRM for a construction company. Next.js (App Router) + Supabase.
Roles: Manager (Постановщик) and Worker (Исполнитель).

## Hard Rules (Security & Logic)

1. **NEVER expose the Supabase `service_role` key.** Only use `NEXT_PUBLIC_SUPABASE_ANON_KEY` on the client. Server actions must use the standard SSR client, not the admin client, unless strictly required.
2. **Row Level Security (RLS) is mandatory.** Every table (`objects`, `tasks`, `task_history`, `profiles`) MUST have RLS enabled. Workers must only see their own tasks.
3. **Status transitions MUST be validated in the database.** Do not rely on UI hiding. Use the Postgres RPC function `transition_task_status`.
4. **History is immutable.** The `task_history` table must not allow UPDATE or DELETE operations via the API. Only INSERT.
5. **No public sign-ups.** Authentication is email/password via Supabase Auth, but registration is disabled.

## Workflow

Before writing any database migration or Supabase client code, read this file. After writing, verify the RLS policies are present.
