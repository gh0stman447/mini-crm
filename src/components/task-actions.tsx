'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { transitionTask } from '@/app/actions';
import type { Role, TaskStatus } from '@/lib/supabase/types';
type Action = { label: string; to: TaskStatus; needsComment?: boolean };
export function TaskActions({
  taskId,
  status,
  role,
  isAssignee,
}: {
  taskId: string;
  status: TaskStatus;
  role: Role;
  isAssignee: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const actions: Action[] =
    isAssignee && status !== 'on_review'
      ? status === 'new'
        ? [{ label: 'Взять в работу', to: 'in_progress' }]
        : status === 'in_progress'
          ? [{ label: 'Отправить на проверку', to: 'on_review' }]
          : status === 'returned'
            ? [{ label: 'Продолжить работу', to: 'in_progress' }]
            : []
      : role === 'manager' && status === 'on_review'
        ? [
            { label: 'Принять', to: 'accepted' },
            { label: 'Вернуть на доработку', to: 'returned', needsComment: true },
          ]
        : [];
  if (!actions.length) return null;
  async function transition(action: Action) {
    if (action.needsComment && !comment.trim()) {
      setError('При возврате задачи укажите комментарий.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: rpcError } = await transitionTask(taskId, action.to, comment);
    setBusy(false);
    if (rpcError) {
      setError(rpcError);
      return;
    }
    setComment('');
    router.refresh();
  }
  return (
    <div className='mt-6 border-t border-slate-200 pt-5'>
      <p className='mb-2 text-sm font-medium text-slate-700'>Доступные действия</p>
      {actions.some((action) => action.needsComment) && (
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          aria-label='Причина возврата'
          placeholder='Причина возврата (обязательно)'
          className='mb-3 min-h-20 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-500'
        />
      )}
      <div className='flex flex-wrap gap-2'>
        {actions.map((action) => (
          <button
            key={action.to}
            onClick={() => transition(action)}
            disabled={busy}
            className='rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
          >
            {busy ? 'Сохранение…' : action.label}
          </button>
        ))}
      </div>
      {error && <p className='mt-3 text-sm text-rose-700'>{error}</p>}
    </div>
  );
}
