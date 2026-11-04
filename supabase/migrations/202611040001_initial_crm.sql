-- Run in Supabase SQL editor or via `supabase db push`.
create type public.app_role as enum ('manager', 'worker');
create type public.task_status as enum ('new', 'in_progress', 'on_review', 'accepted', 'returned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'worker',
  full_name text,
  created_at timestamptz not null default now()
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  address text not null check (char_length(trim(address)) > 0),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  object_id uuid not null references public.objects(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id),
  status public.task_status not null default 'new',
  author_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_history (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  from_status public.task_status,
  to_status public.task_status not null,
  comment text,
  created_at timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks(object_id);
create index tasks_assignee_id_idx on public.tasks(assignee_id);
create index task_history_task_id_idx on public.task_history(task_id, created_at);

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_history enable row level security;

-- All helper functions have a fixed search_path to avoid search-path attacks.
create function public.is_manager()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager') $$;

create function public.can_access_task(p_task_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_manager() or exists (select 1 from public.tasks where id = p_task_id and assignee_id = auth.uid()) $$;

grant execute on function public.is_manager(), public.can_access_task(uuid) to authenticated;

create policy "users read own profile; managers read all" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_manager());
create policy "managers manage objects" on public.objects for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
create policy "workers read assigned objects" on public.objects for select to authenticated
  using (exists (select 1 from public.tasks t where t.object_id = objects.id and t.assignee_id = auth.uid()));
create policy "managers read every task" on public.tasks for select to authenticated using (public.is_manager());
create policy "workers read assigned tasks" on public.tasks for select to authenticated using (assignee_id = auth.uid());
create policy "read task history for accessible tasks" on public.task_history for select to authenticated
  using (public.can_access_task(task_id));

-- Direct task/history mutation is deliberately unavailable. These functions are the only write path.
revoke insert, update, delete on public.tasks, public.task_history from authenticated;

create function public.create_task(p_title text, p_description text, p_object_id uuid, p_assignee_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_task_id uuid;
begin
  if not public.is_manager() then raise exception 'Only managers can create tasks' using errcode = '42501'; end if;
  insert into public.tasks (title, description, object_id, assignee_id, author_id)
  values (p_title, nullif(trim(coalesce(p_description, '')), ''), p_object_id, p_assignee_id, auth.uid()) returning id into v_task_id;
  insert into public.task_history (task_id, actor_id, from_status, to_status, comment)
  values (v_task_id, auth.uid(), null, 'new', 'Task created');
  return v_task_id;
end; $$;

create function public.update_task_details(p_task_id uuid, p_title text, p_description text, p_object_id uuid, p_assignee_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then raise exception 'Only managers can edit tasks' using errcode = '42501'; end if;
  update public.tasks set title = p_title, description = nullif(trim(coalesce(p_description, '')), ''), object_id = p_object_id,
    assignee_id = p_assignee_id, updated_at = now() where id = p_task_id;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
end; $$;

create function public.delete_task(p_task_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then raise exception 'Only managers can delete tasks' using errcode = '42501'; end if;
  delete from public.tasks where id = p_task_id;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
end; $$;

create function public.transition_task_status(p_task_id uuid, p_to_status public.task_status, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_task public.tasks; v_manager boolean := public.is_manager(); v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
  if (not v_manager) and v_task.assignee_id <> auth.uid() then raise exception 'Task is not assigned to you' using errcode = '42501'; end if;
  if not (
    (v_task.status = 'new' and p_to_status = 'in_progress' and v_task.assignee_id = auth.uid()) or
    (v_task.status = 'in_progress' and p_to_status = 'on_review' and v_task.assignee_id = auth.uid()) or
    (v_task.status = 'on_review' and p_to_status in ('accepted', 'returned') and v_manager) or
    (v_task.status = 'returned' and p_to_status = 'in_progress' and v_task.assignee_id = auth.uid())
  ) then raise exception 'This status transition is not allowed' using errcode = '22023'; end if;
  if p_to_status = 'returned' and v_comment is null then raise exception 'A comment is required when returning a task' using errcode = '22023'; end if;
  update public.tasks set status = p_to_status, updated_at = now() where id = v_task.id;
  insert into public.task_history (task_id, actor_id, from_status, to_status, comment)
  values (v_task.id, auth.uid(), v_task.status, p_to_status, v_comment);
end; $$;

grant execute on function public.create_task(text, text, uuid, uuid), public.update_task_details(uuid, text, text, uuid, uuid),
  public.delete_task(uuid), public.transition_task_status(uuid, public.task_status, text) to authenticated;

-- Create each profile on first Auth user creation. Roles default to worker; promote managers manually in SQL.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
