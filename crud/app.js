import { getProducts } from './api.js';
import { initCreate } from './create.js';
import { initEdit } from './edit.js';
import { initDelete } from './delete.js';
import { element, productImage, money, showDetails } from './details.js';

const body = document.getElementById('products-body');
const status = document.getElementById('status');
const retryButton = document.getElementById('retry-button');
const search = document.getElementById('search');
const category = document.getElementById('category');
const sort = document.getElementById('sort');
const addButton = document.getElementById('add-product');
const app = {
  products: [], nextLocalId: -1, busy: false, ready: false, onEdit: null, onDelete: null,
  render, setBusy, showStatus,
  openEditor() {
    document.querySelector('#edit-dialog .dialog-status').textContent = '';
    document.getElementById('edit-dialog').showModal();
  },
  closeEditor() { document.getElementById('edit-dialog').close(); },
  closeCreator() { document.getElementById('create-dialog').close(); },
};
function showStatus(message, isError = false) {
  for (const target of [status, ...document.querySelectorAll('dialog[open] .dialog-status')]) {
    target.textContent = message; target.dataset.error = String(isError);
  }
}
function setBusy(value) {
  app.busy = value;
  document.querySelectorAll('.forms fieldset').forEach(fieldset => { fieldset.disabled = value || !app.ready; });
  document.querySelectorAll('[data-close]').forEach(button => { button.disabled = value; });
  addButton.disabled = value || !app.ready;
  retryButton.disabled = value;
  body.setAttribute('aria-busy', String(value));
  render();
}
function render() {
  const selected = category.value;
  const categories = [...new Set(app.products.map(p => p.category).filter(Boolean))].sort();
  category.replaceChildren(new Option('Все категории', ''), ...categories.map(value => new Option(value, value)));
  category.value = categories.includes(selected) ? selected : '';
  const query = search.value.trim().toLocaleLowerCase();
  let products = app.products.filter(p => (!category.value || p.category === category.value) &&
    [p.title, p.description, p.brand].some(text => String(text || '').toLocaleLowerCase().includes(query)));
  if (sort.value === 'price-asc') products.sort((a, b) => a.price - b.price);
  if (sort.value === 'price-desc') products.sort((a, b) => b.price - a.price);
  if (sort.value === 'rating') products.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  body.replaceChildren();
  for (const product of products) {
    const card = element('article', undefined, 'product-card');
    const open = element('button', undefined, 'product-open'); open.type = 'button'; open.disabled = app.busy;
    open.setAttribute('aria-label', 'Подробнее: ' + product.title);
    open.append(productImage(product.thumbnail || product.images?.[0], product.title));
    const summary = element('div', undefined, 'card-summary');
    summary.append(element('p', product.brand || product.category || 'Товар', 'eyebrow'),
      element('h3', product.title), element('p', product.description || 'Описание пока не добавлено.', 'card-description'),
      element('p', product.rating == null ? 'Нет рейтинга' : `★ ${product.rating}`, 'rating'),
      element('strong', money(product.price), 'price'));
    open.append(summary); open.addEventListener('click', () => showDetails(product, app));
    const actions = element('div', undefined, 'card-actions');
    for (const [label, handler, className] of [['Изменить', app.onEdit, 'secondary'], ['Удалить', app.onDelete, 'danger']]) {
      const button = element('button', label, className); button.type = 'button'; button.disabled = app.busy || !app.ready;
      button.addEventListener('click', () => { if (!app.busy) handler(product.id); }); actions.append(button);
    }
    card.append(open, actions); body.append(card);
  }
  document.getElementById('product-count').textContent = app.ready ? `${products.length} из ${app.products.length} товаров` : '';
  const empty = document.getElementById('empty-message');
  empty.hidden = !app.ready || products.length > 0;
  empty.textContent = app.products.length ? 'Ничего не найдено. Попробуйте другой запрос или категорию.' : 'Товаров пока нет. Добавьте первый товар.';
}
async function loadProducts() {
  if (app.busy || app.ready) return;
  setBusy(true); retryButton.hidden = true;
  document.getElementById('loading').hidden = false;
  showStatus('Загрузка товаров…');
  try { app.products = await getProducts(); app.ready = true; showStatus('Коллекция загружена.'); }
  catch (error) { showStatus('Не удалось загрузить товары. ' + error.message, true); retryButton.hidden = false; }
  finally { document.getElementById('loading').hidden = true; setBusy(false); }
}
initCreate(app); initEdit(app); initDelete(app);
addButton.addEventListener('click', () => {
  if (!app.busy && app.ready) {
    document.querySelector('#create-dialog .dialog-status').textContent = '';
    document.getElementById('create-dialog').showModal();
  }
});
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('cancel', event => { if (app.busy) event.preventDefault(); });
  dialog.addEventListener('close', () => { if (!document.activeElement || document.activeElement === document.body) addButton.focus(); });
}
for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => { if (!app.busy) document.getElementById(button.dataset.close).close(); });
}
search.addEventListener('input', render); category.addEventListener('change', render); sort.addEventListener('change', render);
retryButton.addEventListener('click', loadProducts);
loadProducts();
