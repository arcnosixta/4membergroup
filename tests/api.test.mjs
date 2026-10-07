import test from 'node:test';
import assert from 'node:assert/strict';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../crud/api.js';

test('GET returns the product list, keeping only our three fields', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://dummyjson.com/products?limit=20&select=title,price');
    assert.equal(options.method, 'GET');
    return Response.json({ products: [{ id: 1, title: 'Товар', price: 0, stock: 5 }] });
  });
  assert.deepEqual(await getProducts(), [{ id: 1, title: 'Товар', price: 0 }]);
});

test('empty list is valid', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ products: [] }));
  assert.deepEqual(await getProducts(), []);
});

test('malformed products do not reach the table', async t => {
  const responses = [{}, { products: [null] }, { products: [{ id: 1, title: 'A', price: '5' }] }];
  t.mock.method(globalThis, 'fetch', async () => Response.json(responses.shift()));
  for (let i = 0; i < 3; i++) await assert.rejects(getProducts, /неверный список/);
});

test('POST, PUT and DELETE use the agreed routes, payloads and responses', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options });
    return Response.json(options.method === 'DELETE' ? { id: 1, isDeleted: true } : { id: 1, title: 'A', price: 2 });
  });
  const data = { title: 'A', price: 2 };
  assert.equal((await createProduct(data)).title, 'A');
  await updateProduct(1, data);
  assert.equal((await deleteProduct(1)).isDeleted, true);
  assert.deepEqual(calls.map(call => [call.url, call.method]), [
    ['https://dummyjson.com/products/add', 'POST'],
    ['https://dummyjson.com/products/1', 'PUT'],
    ['https://dummyjson.com/products/1', 'DELETE'],
  ]);
  for (const call of calls.slice(0, 2)) {
    assert.equal(call.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(call.body), data);
  }
  assert.equal(calls[2].body, undefined);
});

test('HTTP errors reject every operation instead of reporting success', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 503 }));
  for (const operation of [getProducts, () => createProduct({}), () => updateProduct(1, {}), () => deleteProduct(1)]) {
    await assert.rejects(operation, /HTTP 503/);
  }
});

test('network errors propagate to the interface', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(getProducts, /Failed to fetch/);
});
