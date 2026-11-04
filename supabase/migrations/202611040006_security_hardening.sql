-- Restrict task mutations to signed-in callers and worker assignees.

create or replace function public.create_task(p_title text, p_description text, p_object_id uuid, p_assignee_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_task_id uuid;
begin
  if not public.is_manager() then raise exception 'Only managers can create tasks' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_assignee_id and role = 'worker') then
    raise exception 'Assignee must have worker role' using errcode = '22023';
  end if;
  insert into public.tasks (title, description, object_id, assignee_id, author_id)
  values (p_title, nullif(trim(coalesce(p_description, '')), ''), p_object_id, p_assignee_id, auth.uid()) returning id into v_task_id;
  insert into public.task_history (task_id, actor_id, from_status, to_status, comment)
  values (v_task_id, auth.uid(), null, 'new', 'Task created');
  return v_task_id;
end; $$;

create or replace function public.update_task_details(p_task_id uuid, p_title text, p_description text, p_object_id uuid, p_assignee_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_manager() then raise exception 'Only managers can edit tasks' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_assignee_id and role = 'worker') then
    raise exception 'Assignee must have worker role' using errcode = '22023';
  end if;
  update public.tasks set title = p_title, description = nullif(trim(coalesce(p_description, '')), ''), object_id = p_object_id,
    assignee_id = p_assignee_id, updated_at = now() where id = p_task_id;
  if not found then raise exception 'Task not found' using errcode = 'P0002'; end if;
end; $$;

create or replace function public.transition_task_status(p_task_id uuid, p_to_status public.task_status, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_task public.tasks; v_manager boolean := public.is_manager(); v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
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

revoke execute on function public.create_task(text, text, uuid, uuid), public.update_task_details(uuid, text, text, uuid, uuid), public.delete_task(uuid), public.transition_task_status(uuid, public.task_status, text) from public, anon;
grant execute on function public.create_task(text, text, uuid, uuid), public.update_task_details(uuid, text, text, uuid, uuid), public.delete_task(uuid), public.transition_task_status(uuid, public.task_status, text) to authenticated;
