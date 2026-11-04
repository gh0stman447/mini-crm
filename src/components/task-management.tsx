'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteTask, updateTask } from '@/app/actions';

export function TaskManagement({
  task,
  workers,
}: {
  task: { id: string; title: string; description: string | null; assignee_id: string };
  workers: { id: string; full_name: string | null; email: string | null }[];
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const button =
    'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50';
  const field = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2';

  return (
    <div className='mt-5 border-t border-slate-200 pt-5'>
      <div className='flex flex-wrap gap-2'>
        <button
          className={button}
          aria-expanded={editing}
          onClick={() => {
            setEditing(!editing);
            setConfirming(false);
            setError(null);
          }}
        >
          {editing ? 'Отменить редактирование' : 'Редактировать задачу'}
        </button>
        <button
          className={`${button} text-rose-700`}
          aria-expanded={confirming}
          onClick={() => {
            setConfirming(!confirming);
            setEditing(false);
            setError(null);
          }}
        >
          {confirming ? 'Отменить удаление' : 'Удалить задачу'}
        </button>
      </div>
      {editing && (
        <form
          className='mt-4 space-y-4'
          action={async (form) => {
            setError(null);
            const result = await updateTask(task.id, form);
            if (result.error) setError(result.error);
            else setEditing(false);
          }}
        >
          <label className='block text-sm font-medium'>
            Название
            <input required name='title' defaultValue={task.title} className={field} />
          </label>
          <label className='block text-sm font-medium'>
            Описание
            <textarea
              name='description'
              defaultValue={task.description || ''}
              rows={3}
              className={field}
            />
          </label>
          <label className='block text-sm font-medium'>
            Исполнитель
            <select name='assigneeId' required defaultValue={task.assignee_id} className={field}>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.full_name?.trim() || worker.email || 'Исполнитель без имени'}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton label='Сохранить изменения' pendingLabel='Сохранение…' />
        </form>
      )}
      {confirming && (
        <form
          className='mt-4 space-y-3'
          action={async () => {
            setError(null);
            const result = await deleteTask(task.id);
            setError(result.error);
          }}
        >
          <p className='text-sm text-rose-700'>
            Удалить задачу «{task.title}»? Задача и её история будут удалены без возможности
            восстановления.
          </p>
          <SubmitButton label='Подтвердить удаление' pendingLabel='Удаление…' destructive />
        </form>
      )}
      {error && (
        <p role='alert' className='mt-3 text-sm text-rose-700'>
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  destructive = false,
}: {
  label: string;
  pendingLabel: string;
  destructive?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${destructive ? 'bg-rose-700' : 'bg-slate-900'}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
