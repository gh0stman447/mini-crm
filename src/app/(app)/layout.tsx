import { signOut } from '@/app/actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Keep all authenticated pages dynamic and scoped to the current session.
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  return (
    <>
      <header className='border-b border-slate-200 bg-white'>
        <div className='mx-auto flex max-w-6xl items-center justify-between px-5 py-4'>
          <Link href='/objects' className='font-bold tracking-tight'>
            BuildFlow <span className='font-normal text-slate-500'>CRM</span>
          </Link>
          <nav className='flex items-center gap-4 text-sm'>
            <Link href='/objects'>Объекты</Link>
            {profile?.role === 'worker' && <Link href='/my-tasks'>Мои задачи</Link>}
            <span className='hidden text-slate-500 sm:inline'>
              {profile?.full_name ||
                (profile?.role === 'manager'
                  ? 'Постановщик'
                  : profile?.role === 'worker'
                    ? 'Исполнитель'
                    : 'Пользователь')}
            </span>
            <form action={signOut}>
              <button className='text-slate-600 hover:text-slate-950'>Выйти</button>
            </form>
          </nav>
        </div>
      </header>
      <main className='mx-auto w-full max-w-6xl p-5 sm:p-8'>{children}</main>
    </>
  );
}
