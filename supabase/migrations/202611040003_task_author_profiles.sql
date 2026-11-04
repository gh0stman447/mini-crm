-- Assigned workers can read the author profile of their tasks.
create policy "assignees read task author profile" on public.profiles
for select to authenticated
using (exists (
  select 1 from public.tasks t
  where t.author_id = profiles.id and t.assignee_id = auth.uid()
));
