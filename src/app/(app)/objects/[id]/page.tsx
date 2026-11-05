import { ObjectActions } from '@/components/object-actions';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CreateTaskForm } from '@/components/create-task-form';
import { StatusBadge } from '@/components/status-badge';
export default async function ObjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const { data: workers, error: workersError } =
    profile?.role === 'manager'
      ? await supabase.rpc('get_worker_options', {})
      : { data: [], error: null };

  if (workersError) throw new Error('Не удалось загрузить исполнителей.');

  const [{ data: object }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase.from('objects').select('*').eq('id', id).single(),
    supabase
      .from('tasks')
      .select('id, title, status, created_at')
      .eq('object_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (tasksError) throw new Error('Не удалось загрузить задачи объекта.');
  if (!object) notFound();

  return (
    <section>
      <Link href='/objects' className='text-sm text-slate-600 hover:text-slate-950'>
        ← Объекты
      </Link>

      <div className='mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
        <h1 className='text-2xl font-bold'>{object.name}</h1>

        <p className='mt-2 text-slate-600'>{object.address}</p>

        {profile?.role === 'manager' && <ObjectActions object={object} />}
      </div>

      {profile?.role === 'manager' && <CreateTaskForm objectId={id} workers={workers || []} />}

      <div className='mt-8'>
        <h2 className='text-lg font-semibold'>Задачи</h2>

        <div className='mt-3 divide-y rounded-xl border border-slate-200 bg-white'>
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

          {!tasks?.length && <p className='p-5 text-sm text-slate-500'>Задач пока нет.</p>}
        </div>
      </div>
    </section>
  );
}
