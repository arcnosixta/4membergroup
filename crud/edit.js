import { fieldsMarkup, fillFields, readFields } from './fields.js';
import { updateProduct } from './api.js';

export function initEdit(app) {
  const container = document.getElementById('edit-container');
  container.innerHTML = `
    <p id="edit-hint">Выберите товар кнопкой «Изменить» в каталоге.</p>
    <form id="edit-form" hidden>
      <fieldset id="edit-fieldset">
        <label for="edit-title">Название
          <input id="edit-title" type="text" maxlength="100" required>
        </label>
        <label for="edit-price">Цена, $
          <input id="edit-price" type="number" min="0" max="1000000" step="0.01" required>
        </label>
        ${fieldsMarkup('edit')}
        <div class="actions">
          <button type="submit">Сохранить</button>
          <button id="edit-cancel" type="button">Отмена</button>
        </div>
      </fieldset>
    </form>
  `;

  const form = document.getElementById('edit-form');
  const fieldset = document.getElementById('edit-fieldset');
  const titleInput = document.getElementById('edit-title');
  const priceInput = document.getElementById('edit-price');
  const cancelButton = document.getElementById('edit-cancel');
  const hint = document.getElementById('edit-hint');
  let selectedId = null;

  form.hidden = true;
  fieldset.disabled = app.busy || !app.ready;

  function closeForm() {
    selectedId = null;
    form.hidden = true;
    form.reset();
    app.closeEditor?.();
    hint.textContent = 'Выберите товар кнопкой «Изменить» в каталоге.';
  }

  // ID бойынша тауарды таңдап, бар деректерін формаға толтырамыз.
  app.onEdit = function (id) {
    if (app.busy || !app.ready) return;
    const product = app.products.find(item => item.id === id);
    if (!product) {
      closeForm();
      app.showStatus('Товар уже удалён. Выберите другой товар.', true);
      return;
    }
    selectedId = product.id;
    fillFields('edit', product);
    titleInput.value = product.title;
    priceInput.value = String(product.price);
    hint.textContent = 'Редактируется товар ID ' + product.id + '.';
    form.hidden = false;
    app.openEditor?.();
    titleInput.focus();
  };

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (app.busy || !app.ready || selectedId === null) return;

    // Форма ашық тұрғанда тауар өшірілген болуы мүмкін: қайта тексереміз.
    const product = app.products.find(item => item.id === selectedId);
    if (!product) {
      closeForm();
      app.showStatus('Товар уже удалён. Изменения не сохранены.', true);
      return;
    }

    const title = titleInput.value.trim();
    const priceText = priceInput.value.trim();
    if (title === '' || title.length > 100) {
      app.showStatus('Название должно содержать от 1 до 100 символов.', true);
      titleInput.focus();
      return;
    }
    if (priceText === '') {
      app.showStatus('Укажите цену.', true);
      priceInput.focus();
      return;
    }
    const price = Number(priceText);
    if (!Number.isFinite(price) || price < 0 || price > 1000000 ||
        Number(price.toFixed(2)) !== price) {
      app.showStatus('Цена должна быть от 0 до 1000000, не более двух знаков после запятой.', true);
      priceInput.focus();
      return;
    }
    if (!form.reportValidity()) return;

    let data;
    try { data = { title, price, ...readFields('edit', product) }; }
    catch (error) { app.showStatus(error.message, true); return; }

    app.setBusy(true);
    app.showStatus('Сохранение изменений…');
    try {
      // Сервердегі тауарға PUT; теріс ID бар жаңа тауарға сұрау жібермейміз.
      if (product.id > 0) await updateProduct(product.id, data);
      Object.assign(product, data);
      app.render();
      closeForm();
      app.showStatus('Товар изменён');
    } catch (error) {
      // Қате болса, тізім мен формадағы енгізілген мәндер сақталады.
      app.showStatus(error.message, true);
    } finally {
      app.setBusy(false);
    }
  });

  cancelButton.addEventListener('click', function () {
    if (app.busy || !app.ready) return;
    closeForm();
    app.showStatus('Редактирование отменено.');
  });
}
