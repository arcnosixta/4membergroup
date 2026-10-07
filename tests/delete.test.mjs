import test from 'node:test';
import assert from 'node:assert/strict';
import { initDelete } from '../crud/delete.js';

function setup(t, confirmed = true) {
  const prompts = [];
  const originalWindow = globalThis.window;
  globalThis.window = { confirm(message) { prompts.push(message); return confirmed; } };
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });
  const statuses = [];
  const busyChanges = [];
  let renders = 0;
  const app = {
    products: [{ id: 1, title: 'First', price: 5 }, { id: -1, title: 'Local', price: 0 }],
    busy: false,
    ready: true,
    onDelete: null,
    setBusy(value) { this.busy = value; busyChanges.push(value); },
    render() { renders++; },
    showStatus(message, isError = false) { statuses.push({ message, isError }); },
  };
  initDelete(app);
  return { app, prompts, statuses, busyChanges, get renders() { return renders; } };
}

test('confirmed server product sends DELETE and removes only its row after success', async t => {
  const ui = setup(t);
  assert.equal(typeof ui.app.onDelete, 'function');
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://dummyjson.com/products/1');
    assert.equal(options.method, 'DELETE');
    assert.equal(ui.app.busy, true);
    assert.equal(ui.app.products.length, 2);
    return Response.json({ id: 1, isDeleted: true });
  });
  await ui.app.onDelete(1);
  assert.match(ui.prompts[0], /First/);
  assert.deepEqual(ui.app.products, [{ id: -1, title: 'Local', price: 0 }]);
  assert.equal(ui.renders, 1);
  assert.deepEqual(ui.busyChanges, [true, false]);
  assert.deepEqual(ui.statuses, [{ message: 'Товар удалён', isError: false }]);
});

test('cancel leaves products and interface unchanged without DELETE', async t => {
  const ui = setup(t, false);
  const before = structuredClone(ui.app.products);
  t.mock.method(globalThis, 'fetch', () => assert.fail('cancel must not send DELETE'));
  await ui.app.onDelete(1);
  assert.deepEqual(ui.app.products, before);
  assert.equal(ui.prompts.length, 1);
  assert.equal(ui.renders, 0);
  assert.deepEqual(ui.busyChanges, []);
  assert.deepEqual(ui.statuses, []);
});

test('local product is removed without HTTP; deleting the last row renders an empty list', async t => {
  const ui = setup(t);
  ui.app.products = [ui.app.products[1]];
  t.mock.method(globalThis, 'fetch', () => assert.fail('negative IDs must not reach API'));
  await ui.app.onDelete(-1);
  assert.match(ui.prompts[0], /Local/);
  assert.deepEqual(ui.app.products, []);
  assert.equal(ui.renders, 1);
  assert.deepEqual(ui.busyChanges, [true, false]);
  assert.equal(ui.app.busy, false);
});

test('HTTP, network and unconfirmed responses preserve the row and release busy', async t => {
  const ui = setup(t);
  const before = structuredClone(ui.app.products);
  const responses = [
    () => new Response('Unavailable', { status: 503 }),
    () => { throw new TypeError('Failed to fetch'); },
    () => Response.json({ isDeleted: false }),
    () => Response.json({ isDeleted: 'true' }),
    () => Response.json(null),
  ];
  let respond;
  t.mock.method(globalThis, 'fetch', async () => respond());
  for (respond of responses) {
    await ui.app.onDelete(1);
    assert.deepEqual(ui.app.products, before);
    assert.equal(ui.app.busy, false);
    assert.equal(ui.statuses.at(-1).isError, true);
    assert.ok(ui.statuses.at(-1).message);
  }
  assert.match(ui.statuses[0].message, /HTTP 503/);
  assert.match(ui.statuses[1].message, /Failed to fetch/);
  assert.equal(ui.renders, 0);
  assert.deepEqual(ui.busyChanges, responses.flatMap(() => [true, false]));
});

test('a pending DELETE blocks repeated clicks and other deletions', async t => {
  const ui = setup(t);
  let resolveFetch;
  const fetch = t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { resolveFetch = resolve; }));
  const pending = ui.app.onDelete(1);
  await ui.app.onDelete(1);
  await ui.app.onDelete(-1);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(ui.prompts.length, 1);
  assert.equal(ui.app.products.length, 2);
  resolveFetch(Response.json({ isDeleted: true }));
  await pending;
  await ui.app.onDelete(1);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(ui.prompts.length, 1);
  assert.equal(ui.app.busy, false);
});

test('missing products and busy or unready apps are ignored before confirmation', async t => {
  const ui = setup(t);
  const before = structuredClone(ui.app.products);
  t.mock.method(globalThis, 'fetch', () => assert.fail('guarded actions must not reach API'));
  await ui.app.onDelete(999);
  ui.app.busy = true;
  await ui.app.onDelete(1);
  ui.app.busy = false;
  ui.app.ready = false;
  await ui.app.onDelete(1);
  assert.deepEqual(ui.app.products, before);
  assert.deepEqual(ui.prompts, []);
  assert.deepEqual(ui.busyChanges, []);
  assert.deepEqual(ui.statuses, []);
  assert.equal(ui.renders, 0);
});
