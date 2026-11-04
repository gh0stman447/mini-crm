'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createObject } from '@/app/actions';

export function CreateObjectForm() {
  const [error, setError] = useState<string | null>(null);
  const field = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2';
  return (
    <form
      action={async (form) => {
        setError(null);
        const result = await createObject(form);
        setError(result.error);
      }}
      className='mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5'
    >
      <h2 className='text-lg font-semibold'>Создать объект</h2>
      <label className='block text-sm font-medium'>
        Название
        <input name='name' required className={field} />
      </label>
      <label className='block text-sm font-medium'>
        Адрес
        <input name='address' required className={field} />
      </label>
      {error && (
        <p role='alert' className='text-sm text-rose-700'>
          {error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
    >
      {pending ? 'Создание…' : 'Создать объект'}
    </button>
  );
}
