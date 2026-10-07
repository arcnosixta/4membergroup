import test from 'node:test';
import assert from 'node:assert/strict';
import { initEdit } from '../crud/edit.js';

// Only the DOM operations used by the edit form; network requests use the real api.js.
function setup(t) {
  const elements = new Map();
  const document = { activeElement: null, getElementById: id => elements.get(id) };
  class Element {
    constructor(attributes = '') {
      this.hidden = /\bhidden\b/.test(attributes);
      this.disabled = false;
      this.value = '';
      this.textContent = '';
      this.listeners = new Map();
    }
    set innerHTML(markup) {
      this.markup = markup;
      for (const match of markup.matchAll(/<\w+\s+([^>]*\bid="([^"]+)"[^>]*)>/g)) {
        elements.set(match[2], new Element(match[1]));
      }
    }
    get innerHTML() { return this.markup; }
    addEventListener(type, listener) { this.listeners.set(type, listener); }
    focus() { document.activeElement = this; }
    reset() {
      elements.get('edit-title').value = '';
      elements.get('edit-price').value = '';
    }
    reportValidity() { return true; }
    async emit(type) {
      let prevented = false;
      await this.listeners.get(type)?.({ preventDefault() { prevented = true; } });
      if (type === 'submit') assert.equal(prevented, true, 'prevent native form navigation');
    }
  }
  elements.set('edit-container', new Element());
  const original = globalThis.document;
  globalThis.document = document;
  t.after(() => {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  });
  const statuses = [];
  const busyChanges = [];
  let renders = 0;
  const app = {
    products: [{ id: 1, title: 'First', price: 5 }, { id: 2, title: 'Second', price: 10 }],
    busy: false,
    ready: true,
    onEdit: null,
    render() { renders++; },
    setBusy(value) {
      this.busy = value;
      busyChanges.push(value);
      elements.get('edit-fieldset').disabled = value || !this.ready;
    },
    showStatus(message, isError = false) { statuses.push({ message, isError }); },
  };
  initEdit(app);
  const get = id => {
    assert.ok(elements.has(id), 'form creates #' + id);
    return elements.get(id);
  };
  return {
    app, document, statuses, busyChanges, get,
    form: get('edit-form'), title: get('edit-title'), price: get('edit-price'),
    get renders() { return renders; },
  };
}

test('initial form is hidden; selecting an ID fills values safely and focuses the title', t => {
  const ui = setup(t);
  assert.equal(typeof ui.app.onEdit, 'function');
  assert.equal(ui.form.hidden, true);
  assert.equal(ui.get('edit-hint').hidden, false);
  ui.app.products[0].title = '<img src=x onerror=alert(1)>';
  ui.app.onEdit(1);
  assert.equal(ui.form.hidden, false);
  assert.equal(ui.title.value, ui.app.products[0].title);
  assert.equal(Number(ui.price.value), 5);
  assert.equal(ui.document.activeElement, ui.title);
  assert.ok(!ui.get('edit-container').innerHTML.includes(ui.title.value));
});

test('positive ID sends PUT and applies entered values to only the selected product', async t => {
  const ui = setup(t);
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, ...options });
    return Response.json({ id: 999, title: 'Ignore server echo', price: 999 });
  });
  ui.app.onEdit(1);
  ui.title.value = '  Edited  ';
  ui.price.value = '12.34';
  await ui.form.emit('submit');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://dummyjson.com/products/1');
  assert.equal(calls[0].method, 'PUT');
  assert.equal(calls[0].headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].body), { title: 'Edited', price: 12.34 });
  assert.deepEqual(ui.app.products, [
    { id: 1, title: 'Edited', price: 12.34 }, { id: 2, title: 'Second', price: 10 },
  ]);
  assert.equal(ui.form.hidden, true);
  assert.equal(ui.renders, 1);
  assert.deepEqual(ui.busyChanges, [true, false]);
  assert.equal(ui.app.busy, false);
  assert.equal(ui.statuses.at(-1).isError, false);
});

test('negative ID updates locally without HTTP, accepting a 100-character title and zero price', async t => {
  const ui = setup(t);
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('local IDs must not reach API'));
  ui.app.products.push({ id: -1, title: 'Local', price: 1 });
  ui.app.onEdit(-1);
  ui.title.value = 'A'.repeat(100);
  ui.price.value = '0';
  await ui.form.emit('submit');
  assert.equal(fetch.mock.callCount(), 0);
  assert.deepEqual(ui.app.products.at(-1), { id: -1, title: 'A'.repeat(100), price: 0 });
  assert.equal(ui.app.products[0].title, 'First');
  assert.equal(ui.form.hidden, true);
  assert.equal(ui.renders, 1);
});

test('cancel closes without changing products or sending a request', async t => {
  const ui = setup(t);
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('cancel must not reach API'));
  const before = structuredClone(ui.app.products);
  ui.app.onEdit(1);
  ui.title.value = 'Unsaved';
  ui.price.value = '99';
  await ui.get('edit-cancel').emit('click');
  assert.equal(ui.form.hidden, true);
  assert.deepEqual(ui.app.products, before);
  assert.equal(fetch.mock.callCount(), 0);
  ui.app.onEdit(1);
  assert.equal(ui.title.value, 'First');
  assert.equal(Number(ui.price.value), 5);
});

test('invalid titles and prices leave the form and products unchanged without PUT', async t => {
  const ui = setup(t);
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('invalid input must not reach API'));
  const before = structuredClone(ui.app.products);
  for (const [title, price] of [
    ['   ', '1'], ['A'.repeat(101), '1'], ['Valid', ''], ['Valid', '   '],
    ['Valid', '-1'], ['Valid', '1000000.01'], ['Valid', '1.001'],
    ['Valid', 'Infinity'], ['Valid', 'not a number'],
  ]) {
    ui.app.onEdit(1);
    ui.title.value = title;
    ui.price.value = price;
    ui.statuses.length = 0;
    await ui.form.emit('submit');
    assert.deepEqual(ui.app.products, before);
    assert.equal(ui.form.hidden, false);
    assert.equal(ui.title.value, title);
    assert.equal(ui.price.value, price);
    assert.equal(ui.statuses.at(-1)?.isError, true, `reject ${JSON.stringify([title, price])}`);
  }
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(ui.renders, 0);
  assert.equal(ui.app.busy, false);
});

test('HTTP and network failures retain values, selected product and open form; busy is released', async t => {
  const ui = setup(t);
  let failWithNetwork = false;
  t.mock.method(globalThis, 'fetch', async () => {
    if (failWithNetwork) throw new TypeError('Failed to fetch');
    return new Response('Unavailable', { status: 503 });
  });
  const before = structuredClone(ui.app.products);
  for (const network of [false, true]) {
    failWithNetwork = network;
    ui.app.onEdit(1);
    ui.title.value = '  Retry later  ';
    ui.price.value = '8.50';
    await ui.form.emit('submit');
    assert.deepEqual(ui.app.products, before);
    assert.equal(ui.title.value, '  Retry later  ');
    assert.equal(ui.price.value, '8.50');
    assert.equal(ui.form.hidden, false);
    assert.equal(ui.app.busy, false);
    assert.equal(ui.get('edit-fieldset').disabled, false);
    assert.equal(ui.statuses.at(-1).isError, true);
    assert.match(ui.statuses.at(-1).message, network ? /Failed to fetch/ : /HTTP 503/);
  }
  assert.equal(ui.renders, 0);
  assert.deepEqual(ui.busyChanges, [true, false, true, false]);
});

test('deleting the selected product before save closes the form without resurrecting or PUT', async t => {
  const ui = setup(t);
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('missing product must not reach API'));
  ui.app.onEdit(1);
  ui.app.products = ui.app.products.filter(product => product.id !== 1);
  await ui.form.emit('submit');
  assert.deepEqual(ui.app.products, [{ id: 2, title: 'Second', price: 10 }]);
  assert.equal(ui.form.hidden, true);
  assert.equal(fetch.mock.callCount(), 0);
  assert.ok(ui.statuses.at(-1)?.message);
});

test('a pending PUT blocks duplicate submission, switching selection and cancellation', async t => {
  const ui = setup(t);
  let resolveFetch;
  const fetch = t.mock.method(globalThis, 'fetch', () => new Promise(resolve => { resolveFetch = resolve; }));
  ui.app.onEdit(1);
  ui.title.value = 'Saved once';
  ui.price.value = '2';
  const pending = ui.form.emit('submit');
  assert.equal(ui.app.busy, true);
  await ui.form.emit('submit');
  ui.app.onEdit(2);
  await ui.get('edit-cancel').emit('click');
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(ui.form.hidden, false);
  assert.equal(ui.title.value, 'Saved once');
  resolveFetch(Response.json({ id: 1 }));
  await pending;
  assert.equal(ui.app.products[0].title, 'Saved once');
  assert.equal(ui.app.products[1].title, 'Second');
  assert.equal(ui.app.busy, false);
});

test('unready or busy applications ignore edit, submit and cancel actions', async t => {
  const ui = setup(t);
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('guarded actions must not reach API'));
  const before = structuredClone(ui.app.products);
  for (const [busy, ready] of [[false, false], [true, true]]) {
    ui.app.busy = busy;
    ui.app.ready = ready;
    ui.app.onEdit(1);
    await ui.form.emit('submit');
    assert.equal(ui.form.hidden, true);
  }
  ui.app.busy = false;
  ui.app.ready = true;
  ui.app.onEdit(1);
  ui.app.ready = false;
  await ui.get('edit-cancel').emit('click');
  await ui.form.emit('submit');
  assert.equal(ui.form.hidden, false);
  assert.deepEqual(ui.app.products, before);
  assert.equal(fetch.mock.callCount(), 0);
});
