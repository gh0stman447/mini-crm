'use client';
import { errorMessage } from '@/lib/error-message';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(errorMessage(signInError));
      return;
    }
    router.replace('/objects');
    router.refresh();
  }
  return (
    <form
      onSubmit={submit}
      className='w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
    >
      <div>
        <h1 className='text-2xl font-bold'>BuildFlow</h1>
        <p className='mt-1 text-sm text-slate-600'>Войдите для работы с объектами и задачами.</p>
      </div>
      <label className='block text-sm font-medium'>
        Электронная почта
        <input
          required
          type='email'
          autoComplete='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
        />
      </label>
      <label className='block text-sm font-medium'>
        Пароль
        <input
          required
          type='password'
          autoComplete='current-password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
        />
      </label>
      {error && <p className='text-sm text-rose-700'>{error}</p>}
      <button
        disabled={busy}
        className='w-full rounded-lg bg-slate-900 py-2 font-medium text-white disabled:opacity-60'
      >
        {busy ? 'Вход…' : 'Войти'}
      </button>
    </form>
  );
}
