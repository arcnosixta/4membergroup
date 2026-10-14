import test from 'node:test';
import assert from 'node:assert/strict';
import { initDelete } from '../users/delete.js';
import { selectUsers } from '../users/list.js';

function setup(t, confirmed = true) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const prompts = [];
  let focused = null;
  let button = null;
  const controls = { query: '', role: '', order: 'name-asc' };
  globalThis.window = { confirm(text) { prompts.push(text); return confirmed; } };
  const search = { focus() { focused = 'search'; } };
  globalThis.document = {
    querySelector(selector) {
      assert.equal(selector, '#people button:not(:disabled)');
      return button;
    },
    getElementById(id) { assert.equal(id, 'search'); return search; },
  };
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  const app = {
    users: [
      { id: 1, firstName: 'Emily', lastName: 'Johnson', username: 'emilys', role: 'admin' },
      { id: -1, firstName: 'Anna', lastName: 'Smith', username: 'anna', role: 'user' },
    ],
    ready: true, busy: false, statuses: [], busyChanges: [], visible: [],
    setBusy(value) { this.busy = value; this.busyChanges.push(value); this.render(); },
    render() {
      this.visible = selectUsers(this.users, controls.query, controls.role, controls.order);
      // Each render replaces buttons, just as app.js does.
      const id = this.visible[0]?.id;
      const current = id !== undefined && !this.busy ? {
        focus() { assert.equal(button, current); focused = id; },
      } : null;
      button = current;
    },
    showStatus(text, error = false) { this.statuses.push({ text, error }); },
  };
  initDelete(app);
  return { app, prompts, controls, focused: () => focused };
}

test('confirmed server deletion waits for DELETE before removing the row and restores focus', async t => {
  const ui = setup(t);
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://dummyjson.com/users/1');
    assert.equal(options.method, 'DELETE');
    assert.equal(ui.app.busy, true);
    assert.equal(ui.app.users.length, 2);
    return Response.json({ isDeleted: true });
  });
  await ui.app.onDelete(1);
  assert.match(ui.prompts[0], /Emily Johnson/);
  assert.match(ui.prompts[0], /@emilys/);
  assert.equal(fetch.mock.callCount(), 1);
  assert.deepEqual(ui.app.users.map(user => user.id), [-1]);
  assert.deepEqual(ui.app.busyChanges, [true, false]);
  assert.deepEqual(ui.app.statuses, [{ text: 'Человек удалён', error: false }]);
  assert.equal(ui.focused(), -1);
});

test('cancel, missing IDs, busy and unready states do not send requests or mutate data', async t => {
  const ui = setup(t, false);
  const before = structuredClone(ui.app.users);
  t.mock.method(globalThis, 'fetch', () => assert.fail('No request expected'));
  await ui.app.onDelete(1);
  await ui.app.onDelete(999);
  ui.app.busy = true; await ui.app.onDelete(1);
  ui.app.busy = false; ui.app.ready = false; await ui.app.onDelete(1);
  assert.equal(ui.prompts.length, 1);
  assert.deepEqual(ui.app.users, before);
  assert.deepEqual(ui.app.busyChanges, []);
  assert.deepEqual(ui.app.statuses, []);
});

test('local deletion skips HTTP and the last row returns focus to search', async t => {
  const ui = setup(t);
  ui.app.users = [ui.app.users[1]];
  t.mock.method(globalThis, 'fetch', () => assert.fail('Local ID must not reach API'));
  await ui.app.onDelete(-1);
  assert.deepEqual(ui.app.users, []);
  assert.equal(ui.app.busy, false);
  assert.equal(ui.focused(), 'search');
});

test('HTTP/network errors and missing or non-boolean confirmation preserve data and unlock UI', async t => {
  const ui = setup(t);
  const before = structuredClone(ui.app.users);
  let respond;
  t.mock.method(globalThis, 'fetch', async () => respond());
  for (respond of [
    () => new Response('', { status: 503 }),
    () => { throw new TypeError('Network unavailable'); },
    ...[{}, null, { isDeleted: false }, { isDeleted: 'true' }].map(data => () => Response.json(data)),
  ]) {
    await ui.app.onDelete(1);
    assert.deepEqual(ui.app.users, before);
    assert.equal(ui.app.busy, false);
    assert.equal(ui.app.statuses.at(-1).error, true);
    assert.ok(ui.app.statuses.at(-1).text);
  }
  assert.match(ui.app.statuses[0].text, /HTTP 503/);
  assert.match(ui.app.statuses[1].text, /Network unavailable/);
});

test('pending deletion blocks repeated clicks and other mutations', async t => {
  const ui = setup(t);
  let finish;
  const fetch = t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve; }));
  const pending = ui.app.onDelete(1);
  await ui.app.onDelete(1);
  await ui.app.onDelete(-1);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(ui.prompts.length, 1);
  assert.equal(ui.app.users.length, 2);
  finish(Response.json({ isDeleted: true }));
  await pending;
  await ui.app.onDelete(1);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(ui.app.busy, false);
});

test('deletion respects active search, role filter and sort, including an empty filtered list', async t => {
  const ui = setup(t);
  ui.controls.query = 'anna'; ui.controls.role = 'user'; ui.controls.order = 'name-desc';
  t.mock.method(globalThis, 'fetch', () => assert.fail('Local ID must not reach API'));
  await ui.app.onDelete(-1);
  assert.deepEqual(ui.controls, { query: 'anna', role: 'user', order: 'name-desc' });
  assert.deepEqual(ui.app.visible, []);
  assert.deepEqual(ui.app.users.map(user => user.id), [1]);
  assert.equal(ui.focused(), 'search');
});
