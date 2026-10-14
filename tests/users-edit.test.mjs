import test from 'node:test';
import assert from 'node:assert/strict';
import { initEdit } from '../users/edit.js';
import { selectUsers } from '../users/list.js';

const fields = {
  firstName: 'edit-first-name', lastName: 'edit-last-name',
  username: 'edit-username', role: 'edit-role', email: 'edit-email',
  phone: 'edit-phone', image: 'edit-image', description: 'edit-description',
};
const original = {
  id: 7, firstName: 'Zoe', lastName: 'West', username: 'zoe.west', role: 'user',
  email: 'zoe@example.com', phone: '+7 700 000 00 00',
  image: 'https://example.com/zoe.png', description: 'Student',
};
const changes = {
  firstName: 'Anna', lastName: 'Smith', username: 'anna.smith', role: 'admin',
  email: 'anna@example.com', phone: '+7 701 000 00 00',
  image: 'https://example.com/anna.png', description: 'Engineer',
};

// DOM substitute checks state transitions; native input validation is exercised in the browser.
function setup(t, users = [{ ...original }]) {
  let focused = null;
  const nodes = {};
  const handlers = new Map();
  function node(id) {
    return {
      value: '', dataset: {}, disabled: false,
      focus() { focused = id; },
      addEventListener(event, handler) { handlers.set(id + ':' + event, handler); },
    };
  }
  for (const id of [...Object.values(fields), 'search', 'role', 'sort', 'edit-cancel']) nodes[id] = node(id);
  nodes.sort.value = 'name-asc';
  const message = { textContent: '', dataset: {} };
  const dialog = {
    ...node('edit-dialog'), open: false, closed: 0,
    querySelector(selector) { assert.equal(selector, '.dialog-status'); return message; },
    showModal() { this.open = true; },
    close() { this.open = false; this.closed++; },
  };
  const form = {
    ...node('edit-form'), valid: true,
    reportValidity() { return this.valid; },
    reset() { for (const id of Object.values(fields)) nodes[id].value = ''; },
  };
  nodes['edit-container'] = { innerHTML: '' };
  nodes['edit-form'] = form; nodes['edit-dialog'] = dialog;
  const previousDocument = globalThis.document;
  globalThis.document = {
    getElementById(id) { assert.ok(nodes[id], 'Unexpected element: ' + id); return nodes[id]; },
  };
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  const app = {
    users, busy: false, ready: true, renders: 0, visible: [], statuses: [], busyChanges: [],
    setBusy(value) { this.busy = value; this.busyChanges.push(value); },
    render() {
      this.renders++;
      this.visible = selectUsers(this.users, nodes.search.value, nodes.role.value, nodes.sort.value);
    },
    showStatus(text, error = false) {
      this.statuses.push({ text, error });
      if (dialog.open) { message.textContent = text; message.dataset.error = String(error); }
    },
  };
  initEdit(app);
  assert.equal(typeof app.onEdit, 'function');
  assert.equal(typeof handlers.get('edit-form:submit'), 'function');
  function fill(data = changes) {
    for (const [field, value] of Object.entries(data)) nodes[fields[field]].value = value;
  }
  function values() {
    return Object.fromEntries(Object.entries(fields).map(([field, id]) => [field, nodes[id].value]));
  }
  async function submit() {
    let prevented = false;
    await handlers.get('edit-form:submit')({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
  }
  function cancel() {
    const handler = handlers.get('edit-cancel:click');
    if (handler) handler({ preventDefault() {} });
    else {
      // app.js binds data-close buttons after initEdit; emulate that shared listener.
      assert.match(nodes['edit-container'].innerHTML, /data-close=["']edit-dialog["']/);
      if (!app.busy) dialog.close();
    }
  }
  return { app, nodes, form, dialog, message, fill, values, submit, cancel, focused: () => focused };
}

test('edit opens current values, clears old errors and respects ready/busy and missing IDs', t => {
  const ui = setup(t);
  ui.message.textContent = 'Old error'; ui.message.dataset.error = 'true';
  ui.app.ready = false; ui.app.onEdit(7); assert.equal(ui.dialog.open, false);
  ui.app.ready = true; ui.app.busy = true; ui.app.onEdit(7); assert.equal(ui.dialog.open, false);
  ui.app.busy = false; ui.app.onEdit(999); assert.equal(ui.dialog.open, false);
  ui.app.onEdit(7);
  assert.equal(ui.dialog.open, true);
  const { id, ...data } = original;
  assert.deepEqual(ui.values(), data);
  assert.equal(ui.message.textContent, '');
  assert.notEqual(ui.message.dataset.error, 'true');
  assert.equal(ui.focused(), 'edit-first-name');
});

test('positive ID PUT sends trimmed editable fields and preserves identity while ignoring response extras', async t => {
  const ui = setup(t);
  const user = ui.app.users[0];
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: 999, firstName: 'Ignored', password: 'not-for-the-catalog' });
  });
  ui.app.onEdit(7);
  ui.fill(Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, key === 'role' ? value : '  ' + value + '  '])));
  await ui.submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://dummyjson.com/users/7');
  assert.equal(calls[0].options.method, 'PUT');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].options.body), changes);
  assert.equal(ui.app.users[0], user);
  assert.deepEqual(user, { ...changes, id: 7 });
  assert.equal(ui.dialog.open, false);
  assert.ok(ui.app.renders > 0);
  assert.equal(ui.app.statuses.at(-1).error, false);
  assert.deepEqual(ui.app.busyChanges, [true, false]);
});

test('pending PUT changes nothing and blocks duplicate submit and switching the selected user', async t => {
  const ui = setup(t, [{ ...original }, { ...original, id: 8, username: 'second.user' }]);
  let finish;
  const mock = t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve; }));
  ui.app.onEdit(7); ui.fill();
  const before = structuredClone(ui.app.users);
  const pending = ui.submit();
  assert.equal(ui.app.busy, true);
  assert.deepEqual(ui.app.users, before);
  assert.deepEqual(ui.values(), changes);
  assert.equal(ui.dialog.open, true);
  await ui.submit(); ui.app.onEdit(8);
  assert.equal(mock.mock.callCount(), 1);
  assert.deepEqual(ui.values(), changes);
  finish(Response.json({ id: 7 })); await pending;
  assert.deepEqual(ui.app.users[0], { ...changes, id: 7 });
  assert.deepEqual(ui.app.users[1], before[1]);
  assert.equal(ui.app.busy, false);
});

test('negative local ID updates without a request and keeps the original ID', async t => {
  const ui = setup(t, [{ ...original, id: -2 }]);
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Local user must not reach API'); });
  ui.app.onEdit(-2); ui.fill(); await ui.submit();
  assert.equal(mock.mock.callCount(), 0);
  assert.deepEqual(ui.app.users, [{ ...changes, id: -2 }]);
  assert.equal(ui.dialog.open, false);
  assert.deepEqual(ui.app.busyChanges, [true, false]);
});

test('name and role edits refresh sorting and filters without changing controls', async t => {
  const ui = setup(t, [{ ...original, id: -1 }, { ...original, id: -2, firstName: 'Bob', username: 'bob.user' }]);
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({}));
  ui.nodes.role.value = 'user'; ui.nodes.sort.value = 'name-desc';
  ui.app.render(); assert.deepEqual(ui.app.visible.map(user => user.id), [-1, -2]);
  ui.app.onEdit(-1); ui.fill({ firstName: 'Anna' }); await ui.submit();
  assert.deepEqual(ui.app.visible.map(user => user.id), [-2, -1]);
  ui.app.onEdit(-1); ui.fill({ role: 'admin' }); await ui.submit();
  assert.deepEqual(ui.app.visible.map(user => user.id), [-2]);
  assert.equal(ui.nodes.role.value, 'user');
  assert.equal(ui.nodes.sort.value, 'name-desc');
  assert.equal(ui.nodes.search.value, '');
  assert.equal(mock.mock.callCount(), 0);
});

test('username comparison excludes the edited ID and rejects other users without case sensitivity', async t => {
  const ui = setup(t, [{ ...original }, { ...original, id: -1, username: 'other.user' }]);
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 7 }));
  ui.app.onEdit(7); ui.fill({ username: '  ZOE.WEST  ' }); await ui.submit();
  assert.equal(mock.mock.callCount(), 1);
  assert.equal(ui.app.users[0].username, 'ZOE.WEST');
  ui.app.onEdit(7); ui.fill({ username: '  OTHER.user  ' });
  const before = structuredClone(ui.app.users); await ui.submit();
  assert.equal(mock.mock.callCount(), 1);
  assert.deepEqual(ui.app.users, before);
  assert.equal(ui.dialog.open, true);
  assert.equal(ui.app.statuses.at(-1).error, true);
});

test('invalid native form and unavailable app never submit changes', async t => {
  const ui = setup(t);
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 7 }));
  ui.app.onEdit(7); ui.fill();
  ui.form.valid = false; await ui.submit();
  ui.form.valid = true; ui.app.ready = false; await ui.submit();
  ui.app.ready = true; ui.app.busy = true; await ui.submit();
  assert.equal(mock.mock.callCount(), 0);
  assert.deepEqual(ui.app.users, [original]);
  assert.deepEqual(ui.values(), changes);
  assert.equal(ui.dialog.open, true);
});

test('contract validation rejects blanks, invalid usernames/roles/URLs and oversized text', async t => {
  const ui = setup(t);
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 7 }));
  const invalid = [
    { firstName: '' }, { firstName: '   ' }, { lastName: '   ' },
    { firstName: 'A'.repeat(61) }, { lastName: 'A'.repeat(61) },
    { username: 'ab' }, { username: 'a'.repeat(31) }, { username: '@kana' },
    { username: 'кана' }, { username: 'two words' }, { username: '   ' },
    { role: 'owner' }, { role: '__proto__' },
    { image: 'not a URL' }, { image: 'javascript:alert(1)' }, { image: 'ftp://example.com/a.png' },
    { description: 'A'.repeat(1001) }, { phone: '1'.repeat(41) },
  ];
  ui.app.onEdit(7);
  for (const data of invalid) {
    ui.fill({ ...changes, ...data }); const before = ui.values(); await ui.submit();
    assert.equal(mock.mock.callCount(), 0, JSON.stringify(data));
    assert.deepEqual(ui.app.users, [original]);
    assert.deepEqual(ui.values(), before);
    assert.equal(ui.app.statuses.at(-1)?.error, true);
    assert.equal(ui.dialog.open, true);
  }
});

test('cancel, Escape and close discard drafts; reopening reads the latest array values', t => {
  const ui = setup(t);
  for (const close of [ui.cancel, () => ui.dialog.close(), () => ui.dialog.close()]) {
    ui.app.onEdit(7); ui.fill(); close();
    assert.equal(ui.dialog.open, false);
    assert.deepEqual(ui.app.users, [original]);
  }
  ui.app.users[0].firstName = 'Current'; ui.app.users[0].description = '';
  ui.app.onEdit(7);
  assert.equal(ui.nodes['edit-first-name'].value, 'Current');
  assert.equal(ui.nodes['edit-description'].value, '');
  assert.equal(ui.nodes['edit-username'].value, original.username);
});

test('HTTP and network failures preserve all input and allow retry', async t => {
  const ui = setup(t);
  let attempt = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    attempt++;
    if (attempt === 1) return new Response('Unavailable', { status: 503 });
    if (attempt === 2) throw new TypeError('Network unavailable');
    return Response.json({ id: 999 });
  });
  ui.app.onEdit(7); ui.fill();
  for (const error of [/HTTP 503/, /Network unavailable/]) {
    await ui.submit();
    assert.equal(ui.app.busy, false);
    assert.deepEqual(ui.app.users, [original]);
    assert.deepEqual(ui.values(), changes);
    assert.equal(ui.dialog.open, true);
    assert.equal(ui.app.statuses.at(-1).error, true);
    assert.match(ui.app.statuses.at(-1).text, error);
  }
  await ui.submit();
  assert.deepEqual(ui.app.users, [{ ...changes, id: 7 }]);
  assert.equal(ui.dialog.open, false);
});

test('a user removed before submit closes the form without a request or resurrection', async t => {
  const ui = setup(t);
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 7 }));
  ui.app.onEdit(7); ui.fill(); ui.app.users = []; await ui.submit();
  assert.equal(mock.mock.callCount(), 0);
  assert.deepEqual(ui.app.users, []);
  assert.equal(ui.dialog.open, false);
  assert.ok(ui.app.statuses.at(-1)?.text);
});

test('a user removed while PUT is pending is never restored', async t => {
  const ui = setup(t);
  let finish;
  t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve; }));
  ui.app.onEdit(7); ui.fill(); const pending = ui.submit();
  ui.app.users = []; finish(Response.json({ id: 7 })); await pending;
  assert.deepEqual(ui.app.users, []);
  assert.equal(ui.dialog.open, false);
  assert.equal(ui.app.busy, false);
  assert.ok(ui.app.statuses.at(-1)?.text);
});
