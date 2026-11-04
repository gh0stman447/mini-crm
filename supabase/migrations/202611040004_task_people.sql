-- Return identities only for participants in a task visible to the caller.
create function public.get_task_people(p_task_id uuid)
returns table (id uuid, full_name text, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.can_access_task(p_task_id) then
    raise exception 'Task is not accessible' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, u.email::text
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id in (
      select t.assignee_id from public.tasks t where t.id = p_task_id
      union select t.author_id from public.tasks t where t.id = p_task_id
      union select h.actor_id from public.task_history h where h.task_id = p_task_id
    );
end;
$$;
revoke all on function public.get_task_people(uuid) from public, anon;
grant execute on function public.get_task_people(uuid) to authenticated;
