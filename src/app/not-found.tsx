import Link from 'next/link';

export default function NotFound() {
  return (
    <main className='mx-auto max-w-xl p-8'>
      <h1 className='text-2xl font-bold'>Страница не найдена</h1>

      <p className='mt-3 text-slate-600'>Запись не существует или у вас нет к ней доступа.</p>

      <Link href='/objects' className='mt-5 inline-block underline'>
        К списку объектов
      </Link>
    </main>
  );
}
