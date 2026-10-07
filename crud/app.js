import { getProducts } from './api.js';
import { initCreate } from './create.js';
import { initEdit } from './edit.js';
import { initDelete } from './delete.js';

const body = document.getElementById('products-body');
const status = document.getElementById('status');
const retryButton = document.getElementById('retry-button');

// Один общий объект передаём всем трём модулям. Контракт описан в README.
const app = {
  products: [],
  nextLocalId: -1,
  busy: false,
  ready: false,
  onEdit: null,
  onDelete: null,
  render,
  setBusy,
  showStatus,
};

function showStatus(message, isError = false) {
  status.textContent = message;
  status.dataset.error = String(isError);
}

function setBusy(value) {
  app.busy = value;
  document.querySelectorAll('.forms fieldset').forEach(fieldset => {
    fieldset.disabled = value || !app.ready;
  });
  retryButton.disabled = value;
  render();
}

function render() {
  body.replaceChildren();
  for (const product of app.products) {
    const row = document.createElement('tr');
    for (const value of [product.id, product.title, product.price.toFixed(2)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    }
    const actions = document.createElement('td');
    const buttons = document.createElement('div');
    buttons.className = 'actions';
    for (const [label, handler, className] of [
      ['Изменить', app.onEdit, ''],
      ['Удалить', app.onDelete, 'danger'],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.className = className;
      button.disabled = app.busy || !app.ready || !handler;
      if (!handler) button.title = 'Функция появится на следующем этапе';
      button.addEventListener('click', () => {
        if (!app.busy && app.ready && handler) handler(product.id);
      });
      buttons.appendChild(button);
    }
    actions.appendChild(buttons);
    row.appendChild(actions);
    body.appendChild(row);
  }
  document.getElementById('product-count').textContent = app.ready
    ? 'Товаров в списке: ' + app.products.length : '';
  document.getElementById('empty-message').hidden = !app.ready || app.products.length > 0;
}

async function loadProducts() {
  if (app.busy || app.ready) return;
  setBusy(true);
  retryButton.hidden = true;
  showStatus('Загрузка товаров…');
  try {
    app.products = await getProducts();
    app.ready = true;
    showStatus('Товары загружены.');
  } catch (error) {
    showStatus('Не удалось загрузить товары. Проверьте соединение. ' + error.message, true);
    retryButton.hidden = false;
  } finally {
    setBusy(false);
  }
}

initCreate(app);
initEdit(app);
initDelete(app);
retryButton.addEventListener('click', loadProducts);
loadProducts();
