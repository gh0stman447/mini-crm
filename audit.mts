import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Shell variables take precedence over local Next.js environment files.
for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue;

  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([\w]+)\s*=\s*(.*?)\s*$/);

    if (!match || process.env[match[1]] !== undefined) continue;

    const value = match[2];

    process.env[match[1]] = /^(['"]).*\1$/.test(value)
      ? value.slice(1, -1)
      : value.replace(/\s+#.*$/, '');
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) throw new Error('Missing Supabase URL or publishable key.');

// Next.js already bundles a WebSocket transport for Node.js 20 compatibility.
const require = createRequire(import.meta.url);
const WebSocketTransport = require('next/dist/compiled/ws');
const client = () =>
  createClient(url, key, {
    realtime: { transport: WebSocketTransport },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
const manager = client(),
  worker1 = client(),
  worker2 = client(),
  anonymous = client();
const accounts = [
  { email: 'manager@test.com', role: 'manager', client: manager },
  { email: 'worker1@test.com', role: 'worker', client: worker1 },
  { email: 'worker2@test.com', role: 'worker', client: worker2 },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function denied(error: { code?: string; message: string } | null, label: string) {
  assert(
    error?.code === '42501',
    `${label}: expected permission denial (42501), got ${error?.code || 'success'}: ${error?.message || ''}`,
  );
}

let objectId: string | undefined;
let taskId: string | undefined;
let passed = 0,
  failed = 0;

async function test(number: number, label: string, run: () => Promise<void>) {
  try {
    await run();

    passed++;

    console.log(`PASS ${number}: ${label}`);
  } catch (error) {
    failed++;

    console.error(`FAIL ${number}: ${label} — ${(error as Error).message}`);
  }
}

try {
  const userIds: string[] = [];

  for (const account of accounts) {
    const { data, error } = await account.client.auth.signInWithPassword({
      email: account.email,
      password: 'password123',
    });

    assert(!error && data.user, `Login ${account.email}: ${error?.message || 'no user'}`);

    const profile = await account.client
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    assert(
      !profile.error && profile.data?.role === account.role,
      `Incorrect profile role for ${account.email}`,
    );

    userIds.push(data.user.id);

    console.log(`LOGIN: ${account.email} (${account.role})`);
  }

  const object = await manager
    .from('objects')
    .insert({
      name: `Security audit ${new Date().toISOString()}`,
      address: 'Temporary API audit fixture',
    })
    .select('id')
    .single();

  assert(!object.error && object.data, `Create object: ${object.error?.message}`);

  objectId = object.data.id;

  const title = 'Audit: worker1 assigned task';

  const task = await manager.rpc('create_task', {
    p_title: title,
    p_description: 'Temporary API audit fixture',
    p_object_id: objectId,
    p_assignee_id: userIds[1],
  });

  assert(!task.error && task.data, `Create task RPC: ${task.error?.message}`);

  taskId = task.data;

  console.log('SETUP: temporary object and task created via manager API access.');

  const snapshot = async () => {
    const result = await manager.from('tasks').select('title,status').eq('id', taskId).single();

    assert(!result.error && result.data, 'Manager verification read failed.');

    return result.data;
  };

  await test(1, 'worker1 can read the assigned task', async () => {
    const result = await worker1.from('tasks').select('id').eq('id', taskId);

    assert(
      !result.error && result.data?.length === 1 && result.data[0].id === taskId,
      'Assigned task was not visible.',
    );
  });

  await test(2, 'worker2 cannot read worker1 task (RLS returns zero rows)', async () => {
    const result = await worker2.from('tasks').select('id').eq('id', taskId);

    assert(
      !result.error && result.data?.length === 0,
      `Expected zero rows without query error: ${result.error?.message}`,
    );
  });

  await test(3, 'worker2 direct task UPDATE is denied; task is unchanged', async () => {
    const result = await worker2
      .from('tasks')
      .update({ title: 'Unauthorized edit' })
      .eq('id', taskId)
      .select('id');

    const current = await snapshot();

    denied(result.error, 'Direct UPDATE');

    assert(current.title === title, 'Task title was modified.');
  });

  await test(4, 'worker1 cannot transition new -> accepted; status stays new', async () => {
    const result = await worker1.rpc('transition_task_status', {
      p_task_id: taskId,
      p_to_status: 'accepted',
      p_comment: null,
    });

    const current = await snapshot();

    assert(
      result.error?.code === '22023',
      `Expected forbidden transition (22023), got ${result.error?.code || 'success'}`,
    );

    assert(current.status === 'new', 'Task status was modified.');
  });

  await test(5, 'manager, worker1, worker2 and anonymous cannot INSERT task_history', async () => {
    const before = await manager
      .from('task_history')
      .select('id', { count: 'exact' })
      .eq('task_id', taskId);

    assert(!before.error && before.count === 1, 'Expected one RPC-generated creation entry.');

    for (const [index, account] of [
      ...accounts,
      { email: 'anonymous', client: anonymous },
    ].entries()) {
      const result = await account.client.from('task_history').insert({
        task_id: taskId,
        actor_id: userIds[index] || userIds[0],
        from_status: 'new',
        to_status: 'accepted',
        comment: 'Forged audit entry',
      });

      denied(result.error, account.email);
    }

    const after = await manager
      .from('task_history')
      .select('id', { count: 'exact' })
      .eq('task_id', taskId);

    assert(!after.error && after.count === before.count, 'History was modified.');
  });

  await test(6, 'anonymous cannot read tasks or call the four task mutation RPCs', async () => {
    denied((await anonymous.from('tasks').select('id')).error, 'Anonymous SELECT');

    const calls: [string, Record<string, unknown>][] = [
      [
        'create_task',
        {
          p_title: 'Unauthorized task',
          p_description: null,
          p_object_id: objectId,
          p_assignee_id: userIds[1],
        },
      ],
      [
        'update_task_details',
        {
          p_task_id: taskId,
          p_title: 'Unauthorized edit',
          p_description: null,
          p_object_id: objectId,
          p_assignee_id: userIds[1],
        },
      ],
      ['delete_task', { p_task_id: taskId }],
      [
        'transition_task_status',
        { p_task_id: taskId, p_to_status: 'in_progress', p_comment: null },
      ],
    ];

    for (const [name, args] of calls) denied((await anonymous.rpc(name, args)).error, name);

    const current = await snapshot();

    assert(current.title === title && current.status === 'new', 'Anonymous RPC changed the task.');
  });
} catch (error) {
  failed++;

  console.error(`ERROR: ${(error as Error).message}`);
} finally {
  if (objectId) {
    const cleanup = await manager.from('objects').delete().eq('id', objectId).select('id');

    if (cleanup.error || cleanup.data?.length !== 1) {
      failed++;

      console.error(
        `CLEANUP FAILED: object ${objectId}: ${cleanup.error?.message || 'no deleted row'}`,
      );
    } else console.log('CLEANUP: temporary object, tasks and history deleted.');
  }

  for (const account of accounts) await account.client.auth.signOut({ scope: 'local' });
}

console.log(`RESULT: ${passed}/6 tests passed; ${failed} failures.`);

if (failed || passed !== 6) process.exitCode = 1;
