export function errorMessage(error: { message: string; code?: string }): string {
  const messages: Record<string, string> = {
    'Invalid login credentials': 'Неверная электронная почта или пароль.',
    'Email not confirmed': 'Электронная почта не подтверждена.',
    'Only managers can create tasks': 'Создавать задачи может только постановщик.',
    'Only managers can edit tasks': 'Редактировать задачи может только постановщик.',
    'Only managers can delete tasks': 'Удалять задачи может только постановщик.',
    'Task not found': 'Задача не найдена.',
    'Task is not assigned to you': 'Эта задача назначена другому исполнителю.',
    'This status transition is not allowed': 'Этот переход статуса недоступен. Обновите страницу.',
    'A comment is required when returning a task': 'При возврате задачи укажите комментарий.',
    'Failed to fetch': 'Не удалось подключиться к серверу. Проверьте подключение.',
  };
  if (messages[error.message]) return messages[error.message];
  if (error.code === '23503') return 'Связанная запись не найдена. Обновите страницу.';
  if (error.code === '42501') return 'Недостаточно прав для выполнения действия.';
  if (error.code === '23514') return 'Проверьте заполнение обязательных полей.';
  if (error.code === 'over_request_rate_limit' || error.code === 'over_email_send_rate_limit') return 'Слишком много попыток. Попробуйте позже.';
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}
