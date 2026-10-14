import test from 'node:test';
import assert from 'node:assert/strict';
import { getUsers, createUser, updateUser, deleteUser } from '../users/api.js';
import { selectUsers } from '../users/list.js';
const users = [
  { id: 1, firstName: 'Zoe', lastName: 'West', username: 'zoe', role: 'user' },
  { id: 2, firstName: 'Anna', lastName: 'Smith', username: 'anna', role: 'admin' },
  { id: 3, firstName: 'Bob', lastName: 'Jones', username: 'bob', role: 'moderator' },
];
test('search, roles and sorting compose without modifying original order', () => {
  assert.deepEqual(selectUsers(users, '', '', 'name-asc').map(u => u.id), [2, 3, 1]);
  assert.deepEqual(selectUsers(users, '', '', 'name-desc').map(u => u.id), [1, 3, 2]);
  assert.deepEqual(selectUsers(users, ' ANNA ', 'admin', 'name-asc').map(u => u.id), [2]);
  assert.deepEqual(selectUsers(users, 'anna', 'user', 'name-asc'), []);
  assert.deepEqual(users.map(u => u.id), [1, 2, 3]);
});
test('GET normalizes descriptions and excludes unrelated fields', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.match(url, /^https:\/\/dummyjson.com\/users\?limit=0&select=/);
    return Response.json({ users: [{ ...users[0], company: { title: 'Engineer', name: 'Test' }, password: 'fake' }] });
  });
  const result = await getUsers();
  assert.equal(result[0].description, 'Engineer · Test');
  assert.equal(result[0].password, undefined);
  assert.equal(result[0].image, '');
});
test('empty list accepted; malformed list and unknown roles rejected', async t => {
  let response = { users: [] };
  t.mock.method(globalThis, 'fetch', async () => Response.json(response));
  assert.deepEqual(await getUsers(), []);
  for (const value of [null, {}, { users: [null] }, { users: [{ ...users[0], role: 'owner' }] }]) {
    response = value; await assert.rejects(getUsers, /неверный список/);
  }
});
test('user mutation functions use correct routes and JSON', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push([url, options]); return Response.json({ id: 1, isDeleted: true });
  });
  await createUser({ firstName: 'Test' });
  await updateUser(1, { role: 'user' });
  assert.equal((await deleteUser(1)).isDeleted, true);
  assert.deepEqual(calls.map(([url, options]) => [url, options.method]), [
    ['https://dummyjson.com/users/add', 'POST'], ['https://dummyjson.com/users/1', 'PUT'], ['https://dummyjson.com/users/1', 'DELETE'],
  ]);
  assert.deepEqual(JSON.parse(calls[0][1].body), { firstName: 'Test' });
});
test('HTTP and network failures reject rather than report success', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  for (const operation of [getUsers, () => createUser({}), () => updateUser(1, {}), () => deleteUser(1)]) {
    await assert.rejects(operation, /HTTP 503/);
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Network'); });
  await assert.rejects(getUsers, /Network/);
});
