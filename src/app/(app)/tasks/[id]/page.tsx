import { TaskManagement } from '@/components/task-management';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge, statusLabel } from '@/components/status-badge';
import { TaskActions } from '@/components/task-actions';
export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: task }, { data: profile }, { data: history, error: historyError }] =
    await Promise.all([
      supabase.from('tasks').select('*').eq('id', id).single(),
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase
        .from('task_history')
        .select('*')
        .eq('task_id', id)
        .order('created_at', { ascending: false }),
    ]);

  if (historyError) throw new Error('Не удалось загрузить историю задачи.');
  if (!task || !profile) notFound();

  const [
    { data: people, error: peopleError },
    { data: object, error: objectError },
    { data: workers, error: workersError },
  ] = await Promise.all([
    supabase.rpc('get_task_people', { p_task_id: id }),
    supabase.from('objects').select('id, name').eq('id', task.object_id).single(),
    profile.role === 'manager'
      ? supabase.rpc('get_worker_options', {})
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (peopleError || objectError || workersError)
    throw new Error('Не удалось загрузить данные задачи.');

  const identities = new Map((people || []).map((person) => [person.id, person]));

  const personName = (personId: string, fallback: string) => {
    const person = identities.get(personId);

    return (
      person?.full_name?.trim() ||
      person?.email?.trim() ||
      (personId === user.id ? user.email : null) ||
      fallback
    );
  };

  const assignees = [...(workers || [])];

  if (!assignees.some((worker) => worker.id === task.assignee_id)) {
    assignees.push({
      id: task.assignee_id,
      full_name: personName(task.assignee_id, 'Текущий исполнитель'),
      email: identities.get(task.assignee_id)?.email || null,
    });
  }

  return (
    <section>
      <Link
        href={`/objects/${task.object_id}`}
        className='text-sm text-slate-600 hover:text-slate-950'
      >
        ← {object?.name || 'К объекту'}
      </Link>

      <article className='mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <h1 className='text-2xl font-bold'>{task.title}</h1>

            <p className='mt-2 whitespace-pre-wrap text-slate-600'>
              {task.description || 'Описание не указано.'}
            </p>
          </div>

          <StatusBadge status={task.status} />
        </div>

        <dl className='mt-6 grid gap-3 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2'>
          <div>
            <dt className='text-slate-500'>Дата создания</dt>

            <dd>
              {new Date(task.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
            </dd>
          </div>

          <div>
            <dt className='text-slate-500'>Исполнитель</dt>

            <dd>{personName(task.assignee_id, 'Исполнитель без имени')}</dd>
          </div>

          <div>
            <dt className='text-slate-500'>Автор</dt>

            <dd>{personName(task.author_id, 'Постановщик без имени')}</dd>
          </div>

          <div>
            <dt className='text-slate-500'>Объект</dt>

            <dd>
              <Link className='underline' href={`/objects/${task.object_id}`}>
                {object?.name}
              </Link>
            </dd>
          </div>
        </dl>

        {profile.role === 'manager' && <TaskManagement task={task} workers={assignees} />}

        <TaskActions
          taskId={task.id}
          status={task.status}
          role={profile.role}
          isAssignee={task.assignee_id === user.id}
        />
      </article>

      <section className='mt-8'>
        <h2 className='text-lg font-semibold'>История статусов</h2>

        <ol className='mt-3 space-y-3'>
          {history?.map((item) => (
            <li key={item.id} className='rounded-xl border border-slate-200 bg-white p-4 text-sm'>
              <p className='font-medium'>
                {statusLabel(item.from_status)} → {statusLabel(item.to_status)}
              </p>

              <p className='mt-1 text-slate-500'>
                {new Date(item.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
              </p>

              <p className='mt-1 text-xs text-slate-500'>
                Кто изменил: {personName(item.actor_id, 'Пользователь')}
              </p>

              {item.comment && (
                <p className='mt-2 text-slate-700'>
                  {item.comment === 'Task created' ? 'Задача создана' : item.comment}
                </p>
              )}
            </li>
          ))}

          {!history?.length && <li className='text-sm text-slate-500'>История пока пуста.</li>}
        </ol>
      </section>
    </section>
  );
}
