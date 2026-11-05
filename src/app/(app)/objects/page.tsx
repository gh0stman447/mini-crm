import { errorMessage } from '@/lib/error-message';
import { redirect } from 'next/navigation';
import { CreateObjectForm } from '@/components/create-object-form';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
export default async function ObjectsPage() {
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

  const { data: objects, error } = await supabase
    .from('objects')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <section>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold'>Объекты</h1>

        <p className='mt-1 text-sm text-slate-600'>
          Объекты строительства, к которым у вас есть доступ.
        </p>
      </div>

      {profile?.role === 'manager' && <CreateObjectForm />}

      {profile?.role === 'worker' && (
        <p className='mb-6 text-sm text-slate-600'>
          Объекты создаёт постановщик. Здесь появятся объекты, по которым вам назначены задачи.
        </p>
      )}

      {error && <p className='text-rose-700'>{errorMessage(error)}</p>}

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {objects?.map((object) => (
          <Link
            key={object.id}
            href={`/objects/${object.id}`}
            className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400'
          >
            <h2 className='font-semibold'>{object.name}</h2>

            <p className='mt-2 text-sm text-slate-600'>{object.address}</p>
          </Link>
        ))}
      </div>

      {!objects?.length && !error && (
        <p className='rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500'>
          Объектов пока нет.
        </p>
      )}
    </section>
  );
}
