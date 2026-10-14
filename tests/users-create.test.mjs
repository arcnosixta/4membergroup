import test from 'node:test';
import assert from 'node:assert/strict';
import { initCreate } from '../users/create.js';

const fields = {
  firstName: 'create-first-name', lastName: 'create-last-name',
  username: 'create-username', role: 'create-role', email: 'create-email',
  phone: 'create-phone', image: 'create-image', description: 'create-description',
};
const validData = {
  firstName: 'Нурда', lastName: 'Тест', username: 'nurda.test', role: 'user',
  email: 'nurda@example.com', phone: '+7 700 000 00 00',
  image: 'https://example.com/avatar.png', description: 'Студент',
};

// Небольшая замена DOM: проверяем поведение формы, а не браузерную валидацию.
function setup(t) {
  let focused = null;
  const nodes = {};
  for (const id of [...Object.values(fields), 'search', 'role', 'sort']) {
    nodes[id] = { value: '', focus() { focused = id; } };
  }
  nodes['create-role'].value = 'user';
  nodes.sort.value = 'name-asc';
  const message = { textContent: '', dataset: {} };
  const dialog = {
    open: false, closed: 0,
    querySelector(selector) { assert.equal(selector, '.dialog-status'); return message; },
    showModal() { this.open = true; },
    close() { this.open = false; this.closed++; },
  };
  let submitHandler;
  const form = {
    valid: true, resets: 0,
    addEventListener(event, handler) { assert.equal(event, 'submit'); submitHandler = handler; },
    reportValidity() { return this.valid; },
    reset() {
      this.resets++;
      for (const [field, id] of Object.entries(fields)) nodes[id].value = field === 'role' ? 'user' : '';
    },
  };
  nodes['create-container'] = { innerHTML: '' };
  nodes['create-form'] = form;
  nodes['create-dialog'] = dialog;
  const previousDocument = globalThis.document;
  globalThis.document = {
    getElementById(id) { assert.ok(nodes[id], 'Unexpected element: ' + id); return nodes[id]; },
  };
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  const app = {
    users: [], nextLocalId: -1, busy: false, ready: true,
    renders: 0, statuses: [], busyChanges: [],
    setBusy(value) { this.busy = value; this.busyChanges.push(value); },
    render() { this.renders++; },
    showStatus(text, error = false) {
      this.statuses.push({ text, error });
      if (dialog.open) { message.textContent = text; message.dataset.error = String(error); }
    },
  };
  initCreate(app);
  assert.equal(typeof app.onCreate, 'function');
  assert.equal(typeof submitHandler, 'function');
  function fill(data = {}) {
    for (const [field, value] of Object.entries({ ...validData, ...data })) nodes[fields[field]].value = value;
  }
  function values() {
    return Object.fromEntries(Object.entries(fields).map(([field, id]) => [field, nodes[id].value]));
  }
  async function submit() {
    let prevented = false;
    await submitHandler({ preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
  }
  return { app, nodes, form, dialog, message, fill, values, submit, focused: () => focused };
}

test('opening clears the old form message, focuses the name and respects ready/busy', t => {
  const ui = setup(t);
  ui.message.textContent = 'Старая ошибка'; ui.message.dataset.error = 'true';
  ui.app.ready = false; ui.app.onCreate(); assert.equal(ui.dialog.open, false);
  ui.app.ready = true; ui.app.busy = true; ui.app.onCreate(); assert.equal(ui.dialog.open, false);
  ui.app.busy = false; ui.app.onCreate();
  assert.equal(ui.dialog.open, true);
  assert.equal(ui.message.textContent, '');
  assert.notEqual(ui.message.dataset.error, 'true');
  assert.equal(ui.focused(), 'create-first-name');
});

test('POST sends only trimmed editable fields; repeated server IDs become local -1 and -2', async t => {
  const ui = setup(t);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return Response.json({ id: 999, firstName: 'Ignored', password: 'not-for-the-catalog' });
  });
  ui.app.onCreate();
  ui.fill(Object.fromEntries(Object.entries(validData).map(([key, value]) => [key, key === 'role' ? value : '  ' + value + '  '])));
  await ui.submit();
  assert.deepEqual(ui.app.users, [{ ...validData, id: -1 }]);
  assert.equal(ui.app.nextLocalId, -2);
  assert.equal(calls[0].url, 'https://dummyjson.com/users/add');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].options.body), validData);
  assert.equal(ui.form.resets, 1);
  assert.equal(ui.dialog.open, false);
  assert.ok(ui.app.renders > 0);
  assert.deepEqual(ui.app.statuses.at(-1), { text: 'Человек добавлен', error: false });
  assert.deepEqual(ui.app.busyChanges, [true, false]);
  ui.app.onCreate(); ui.fill({ username: 'second.user' }); await ui.submit();
  assert.deepEqual(ui.app.users.map(user => user.id), [-2, -1]);
  assert.equal(ui.app.nextLocalId, -3);
  assert.equal(calls.length, 2);
});

test('pending POST preserves fields, list and ID; duplicate submit makes no second request', async t => {
  const ui = setup(t);
  let finish;
  const fetchMock = t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { finish = resolve; }));
  ui.app.onCreate(); ui.fill();
  const pending = ui.submit();
  assert.equal(ui.app.busy, true);
  assert.deepEqual(ui.app.users, []);
  assert.equal(ui.app.nextLocalId, -1);
  assert.equal(ui.form.resets, 0);
  assert.equal(ui.dialog.open, true);
  assert.deepEqual(ui.values(), validData);
  await ui.submit();
  assert.equal(fetchMock.mock.callCount(), 1);
  finish(Response.json({ id: 999 }));
  await pending;
  assert.equal(ui.app.users.length, 1);
  assert.equal(ui.app.busy, false);
});

test('native invalid form and unavailable app never send a request', async t => {
  const ui = setup(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 999 }));
  ui.fill();
  ui.form.valid = false; await ui.submit();
  ui.form.valid = true; ui.app.ready = false; await ui.submit();
  ui.app.ready = true; ui.app.busy = true; await ui.submit();
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.deepEqual(ui.app.users, []);
  assert.equal(ui.app.nextLocalId, -1);
  assert.equal(ui.form.resets, 0);
});

test('additional validation rejects blank names, invalid usernames, roles, URLs and long text', async t => {
  const ui = setup(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 999 }));
  const invalid = [
    { firstName: '' }, { firstName: '   ' }, { lastName: '   ' },
    { firstName: 'A'.repeat(61) }, { lastName: 'A'.repeat(61) },
    { username: 'ab' }, { username: 'a'.repeat(31) }, { username: '@nurda' },
    { username: 'нурда' }, { username: 'two words' }, { username: '   ' },
    { role: 'owner' }, { role: '__proto__' },
    { image: 'not a URL' }, { image: 'javascript:alert(1)' }, { image: 'ftp://example.com/a.png' },
    { description: 'A'.repeat(1001) }, { phone: '1'.repeat(41) },
  ];
  ui.app.onCreate();
  for (const data of invalid) {
    ui.fill(data);
    const before = ui.values();
    await ui.submit();
    assert.equal(fetchMock.mock.callCount(), 0, JSON.stringify(data));
    assert.deepEqual(ui.values(), before);
    assert.equal(ui.app.statuses.at(-1)?.error, true);
    assert.equal(ui.dialog.open, true);
  }
  assert.deepEqual(ui.app.users, []);
  assert.equal(ui.app.nextLocalId, -1);
  assert.equal(ui.form.resets, 0);
});

test('username is unique without case sensitivity, including existing local users', async t => {
  const ui = setup(t);
  ui.app.users = [{ ...validData, id: -3, username: 'Nurda.Test' }];
  const before = structuredClone(ui.app.users);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 999 }));
  ui.app.onCreate(); ui.fill({ username: '  NURDA.test  ' }); await ui.submit();
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.deepEqual(ui.app.users, before);
  assert.equal(ui.app.nextLocalId, -1);
  assert.equal(ui.app.statuses.at(-1).error, true);
  assert.equal(ui.dialog.open, true);
});

test('HTTP and network errors preserve input and allow a successful retry', async t => {
  const ui = setup(t);
  let attempt = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    attempt++;
    if (attempt === 1) return new Response('Unavailable', { status: 503 });
    if (attempt === 2) throw new TypeError('Network unavailable');
    return Response.json({ id: 999 });
  });
  ui.app.onCreate(); ui.fill();
  for (const error of [/HTTP 503/, /Network unavailable/]) {
    await ui.submit();
    assert.equal(ui.app.busy, false);
    assert.deepEqual(ui.app.users, []);
    assert.equal(ui.app.nextLocalId, -1);
    assert.deepEqual(ui.values(), validData);
    assert.equal(ui.form.resets, 0);
    assert.equal(ui.dialog.open, true);
    assert.equal(ui.app.statuses.at(-1).error, true);
    assert.match(ui.app.statuses.at(-1).text, error);
  }
  await ui.submit();
  assert.equal(ui.app.users[0].id, -1);
  assert.equal(ui.form.resets, 1);
  assert.equal(ui.dialog.open, false);
});

test('role and search hiding a new user are explained without changing active controls', async t => {
  const ui = setup(t);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 999 }));
  const filters = [
    { search: '', role: 'admin', sort: 'name-desc' },
    { search: 'nobody-matches-this', role: '', sort: 'name-asc' },
  ];
  for (const [index, values] of filters.entries()) {
    for (const [id, value] of Object.entries(values)) ui.nodes[id].value = value;
    ui.app.onCreate(); ui.fill({ username: 'filtered.' + index }); await ui.submit();
    assert.equal(ui.app.users.length, index + 1);
    assert.match(ui.app.statuses.at(-1).text, /Человек добавлен/);
    assert.match(ui.app.statuses.at(-1).text, /фильтр|поиск/i);
    assert.equal(ui.app.statuses.at(-1).error, false);
    for (const [id, value] of Object.entries(values)) assert.equal(ui.nodes[id].value, value);
  }
});
