import test from 'node:test';
import assert from 'node:assert/strict';
import { findReviewer, getUserCarts } from '../crud/review-api.js';

test('reviewer matched only by unique email, never by name or arbitrary ID', () => {
  const users = [{ id: 7, email: 'a@example.com', firstName: 'Same' }];
  assert.equal(findReviewer(users, { reviewerEmail: ' A@EXAMPLE.COM ' }).id, 7);
  assert.equal(findReviewer(users, { reviewerName: 'Same' }), null);
  assert.equal(findReviewer(users, { reviewerEmail: 'missing@example.com' }), null);
  assert.equal(findReviewer([...users, ...users], { reviewerEmail: 'a@example.com' }), null);
});
test('carts request uses resolved user ID and accepts empty carts', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, 'https://dummyjson.com/carts/user/7?limit=0');
    return Response.json({ carts: [] });
  });
  assert.deepEqual(await getUserCarts(7), []);
  await assert.rejects(() => getUserCarts(-1), /ID/);
});
test('all carts are returned, incorrect owner and malformed products rejected', async t => {
  let data = { carts: [{ id: 1, userId: 7, products: [{ title: 'A', price: 10, quantity: 2 }] }, { id: 2, userId: 7, products: [] }] };
  t.mock.method(globalThis, 'fetch', async () => Response.json(data));
  assert.equal((await getUserCarts(7)).length, 2);
  for (const value of [{ carts: [{ userId: 8, products: [] }] }, {}, { carts: [{ userId: 7, products: [null] }] }]) {
    data = value; await assert.rejects(() => getUserCarts(7), /неверные данные/);
  }
});
test('HTTP and network failures are errors, not empty carts', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
  await assert.rejects(() => getUserCarts(7), /HTTP 503/);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Offline'); });
  await assert.rejects(() => getUserCarts(7), /Offline/);
});
