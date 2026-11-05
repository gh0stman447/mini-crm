import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/status-badge';
export default async function MyTasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError) throw new Error('Не удалось загрузить ваш профиль.');
  if (profile?.role !== 'worker') redirect('/objects');

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, status, object_id, created_at')
    .eq('assignee_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Не удалось загрузить ваши задачи.');

  return (
    <section>
      <h1 className='text-2xl font-bold'>Мои задачи</h1>

      <p className='mt-1 text-sm text-slate-600'>Задачи, назначенные вам.</p>

      <div className='mt-6 divide-y rounded-xl border border-slate-200 bg-white'>
        {tasks?.map((task) => (
          <Link
            key={task.id}
            href={`/tasks/${task.id}`}
            className='flex items-center justify-between gap-3 p-4 hover:bg-slate-50'
          >
            <span className='font-medium'>{task.title}</span>

            <StatusBadge status={task.status} />
          </Link>
        ))}

        {!tasks?.length && <p className='p-5 text-sm text-slate-500'>У вас пока нет задач.</p>}
      </div>
    </section>
  );
}
