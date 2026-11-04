'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteObject, updateObject } from '@/app/actions';

export function ObjectActions({
  object,
}: {
  object: { id: string; name: string; address: string };
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
          {editing ? 'Отменить редактирование' : 'Редактировать объект'}
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
          {confirming ? 'Отменить удаление' : 'Удалить объект'}
        </button>
      </div>
      {editing && (
        <form
          className='mt-4 space-y-4'
          action={async (form) => {
            setError(null);
            const result = await updateObject(object.id, form);
            if (result.error) setError(result.error);
            else setEditing(false);
          }}
        >
          <label className='block text-sm font-medium'>
            Название
            <input required name='name' defaultValue={object.name} className={field} />
          </label>
          <label className='block text-sm font-medium'>
            Адрес
            <input required name='address' defaultValue={object.address} className={field} />
          </label>
          <SubmitButton label='Сохранить изменения' pendingLabel='Сохранение…' />
        </form>
      )}
      {confirming && (
        <form
          className='mt-4 space-y-3'
          action={async () => {
            setError(null);
            const result = await deleteObject(object.id);
            setError(result.error);
          }}
        >
          <p className='text-sm text-rose-700'>
            Удалить объект «{object.name}»? Все его задачи и их история также будут удалены без
            возможности восстановления.
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
