import type { TaskStatus } from '@/lib/supabase/types';

const labels: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  on_review: 'На проверке',
  accepted: 'Принята',
  returned: 'На доработке',
};
const styles: Record<TaskStatus, string> = {
  new: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  on_review: 'bg-amber-100 text-amber-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  returned: 'bg-rose-100 text-rose-800',
};
export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
export const statusLabel = (status: TaskStatus | null) => (status ? labels[status] : '—');
