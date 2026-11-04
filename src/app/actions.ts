'use server';

import { errorMessage } from '@/lib/error-message';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { TaskStatus } from '@/lib/supabase/types';

export async function createTask(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Войдите в систему повторно.' };
  const title = String(form.get('title') || '').trim();
  const objectId = String(form.get('objectId') || '');
  const assigneeId = String(form.get('assigneeId') || '');
  if (!title || !objectId || !assigneeId)
    return { error: 'Укажите название задачи и исполнителя.' };
  const { data, error } = await supabase.rpc('create_task', {
    p_title: title,
    p_description: String(form.get('description') || '').trim() || null,
    p_object_id: objectId,
    p_assignee_id: assigneeId,
  });
  if (error) return { error: errorMessage(error) };
  revalidatePath(`/objects/${objectId}`);
  revalidatePath('/my-tasks');
  redirect(`/tasks/${data}`);
}

export async function transitionTask(taskId: string, toStatus: TaskStatus, comment: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Войдите в систему повторно.' };
  if (toStatus === 'returned' && !comment.trim())
    return { error: 'При возврате задачи укажите комментарий.' };
  const { error } = await supabase.rpc('transition_task_status', {
    p_task_id: taskId,
    p_to_status: toStatus,
    p_comment: comment.trim() || null,
  });
  if (error) return { error: errorMessage(error) };
  revalidatePath('/objects', 'layout');
  revalidatePath('/my-tasks');
  revalidatePath(`/tasks/${taskId}`);
  return { error: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function createObject(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Войдите в систему повторно.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'manager') return { error: 'Создавать объекты может только постановщик.' };
  const name = String(form.get('name') || '').trim();
  const address = String(form.get('address') || '').trim();
  if (!name || !address) return { error: 'Укажите название и адрес.' };
  const { data: object, error } = await supabase
    .from('objects')
    .insert({ name, address, created_by: user.id })
    .select('id')
    .single();
  if (error) return { error: errorMessage(error) };
  revalidatePath('/objects');
  redirect(`/objects/${object.id}`);
}

export async function updateObject(objectId: string, form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Войдите в систему повторно.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'manager')
    return { error: 'Редактировать объекты может только постановщик.' };
  const name = String(form.get('name') || '').trim();
  const address = String(form.get('address') || '').trim();
  if (!name || !address) return { error: 'Укажите название и адрес.' };
  const { data, error } = await supabase
    .from('objects')
    .update({ name, address })
    .eq('id', objectId)
    .select('id')
    .single();
  if (error || !data) return { error: error ? errorMessage(error) : 'Объект не найден.' };
  revalidatePath('/objects');
  revalidatePath(`/objects/${objectId}`);
  return { error: null };
}

export async function deleteObject(objectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Войдите в систему повторно.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'manager') return { error: 'Удалять объекты может только постановщик.' };
  const { data, error } = await supabase
    .from('objects')
    .delete()
    .eq('id', objectId)
    .select('id')
    .single();
  if (error || !data) return { error: error ? errorMessage(error) : 'Объект не найден.' };
  revalidatePath('/', 'layout');
  redirect('/objects');
}

export async function updateTask(taskId: string, form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Войдите в систему повторно.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'manager')
    return { error: 'Редактировать задачи может только постановщик.' };
  const title = String(form.get('title') || '').trim();
  const assigneeId = String(form.get('assigneeId') || '');
  if (!title || !assigneeId) return { error: 'Укажите название задачи и исполнителя.' };
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('object_id, assignee_id')
    .eq('id', taskId)
    .single();
  if (taskError || !task) return { error: 'Задача не найдена.' };
  const { data: assignee } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', assigneeId)
    .single();
  if (!assignee || (assignee.role !== 'worker' && assigneeId !== task.assignee_id))
    return { error: 'Выберите исполнителя из списка.' };
  const { error } = await supabase.rpc('update_task_details', {
    p_task_id: taskId,
    p_title: title,
    p_description: String(form.get('description') || '').trim() || null,
    p_object_id: task.object_id,
    p_assignee_id: assigneeId,
  });
  if (error) return { error: errorMessage(error) };
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/objects/${task.object_id}`);
  revalidatePath('/my-tasks');
  return { error: null };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Войдите в систему повторно.' };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'manager') return { error: 'Удалять задачи может только постановщик.' };
  const { data: task } = await supabase.from('tasks').select('object_id').eq('id', taskId).single();
  if (!task) return { error: 'Задача не найдена.' };
  const { error } = await supabase.rpc('delete_task', { p_task_id: taskId });
  if (error) return { error: errorMessage(error) };
  revalidatePath('/', 'layout');
  redirect(`/objects/${task.object_id}`);
}
