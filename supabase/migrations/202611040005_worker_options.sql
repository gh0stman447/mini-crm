-- Only managers may retrieve worker identities for task assignment.
create function public.get_worker_options()
returns table (id uuid, full_name text, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_manager() then
    raise exception 'Only managers can list workers' using errcode = '42501';
  end if;
  return query
    select p.id, p.full_name, u.email::text
    from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'worker'
    order by coalesce(nullif(trim(p.full_name), ''), u.email::text), p.id;
end;
$$;
revoke all on function public.get_worker_options() from public, anon;
grant execute on function public.get_worker_options() to authenticated;
