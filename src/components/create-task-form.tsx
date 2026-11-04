'use client';

import { useState } from 'react';
import { createTask } from '@/app/actions';

export function CreateTaskForm({
  objectId,
  workers,
}: {
  objectId: string;
  workers: { id: string; full_name: string | null; email: string | null }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const field = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2';
  return (
    <form
      action={async (form) => {
        setError(null);
        const result = await createTask(form);
        setError(result.error);
      }}
      className='mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5'
    >
      <h2 className='text-lg font-semibold'>Создать задачу</h2>
      <input type='hidden' name='objectId' value={objectId} />
      <label className='block text-sm font-medium'>
        Название
        <input className={field} name='title' required />
      </label>
      <label className='block text-sm font-medium'>
        Описание
        <textarea className={field} name='description' rows={3} />
      </label>
      <label className='block text-sm font-medium'>
        Исполнитель
        <select className={field} name='assigneeId' required defaultValue=''>
          <option value='' disabled>
            Выберите исполнителя
          </option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.full_name?.trim() || worker.email || 'Исполнитель без имени'}
            </option>
          ))}
        </select>
      </label>
      {!workers.length && (
        <p className='text-sm text-slate-600'>
          Для назначения задач добавьте учётную запись исполнителя в Supabase.
        </p>
      )}
      {error && (
        <p role='alert' className='text-sm text-rose-700'>
          {error}
        </p>
      )}
      <SubmitButton disabled={!workers.length} />
    </form>
  );
}

import { useFormStatus } from 'react-dom';
function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={disabled || pending}
      className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
    >
      {pending ? 'Создание…' : 'Создать задачу'}
    </button>
  );
}
