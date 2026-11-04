-- Explicit API privileges; row access remains controlled by RLS.
revoke all on public.profiles, public.objects, public.tasks, public.task_history from anon, authenticated;
grant select on public.profiles, public.objects, public.tasks, public.task_history to authenticated;
grant insert, update, delete on public.objects to authenticated;
