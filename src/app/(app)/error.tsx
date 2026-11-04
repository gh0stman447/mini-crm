'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section role='alert' className='rounded-xl border border-rose-200 bg-white p-6'>
      <h1 className='text-xl font-semibold'>Не удалось загрузить страницу</h1>
      <p className='mt-2 text-slate-600'>Проверьте подключение и попробуйте ещё раз.</p>
      <button onClick={reset} className='mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white'>
        Повторить попытку
      </button>
    </section>
  );
}
