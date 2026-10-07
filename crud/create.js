import { createProduct } from './api.js';

export function initCreate(app) {
  // Форманы бір рет жасаймыз.
  const container = document.getElementById('create-container');
  container.innerHTML = `
    <form id="create-form">
      <fieldset>
        <label for="create-title">Название
          <input id="create-title" type="text" maxlength="100" required>
        </label>
        <label for="create-price">Цена, $
          <input id="create-price" type="number" min="0" max="1000000" step="0.01" required>
        </label>
        <button type="submit">Добавить</button>
      </fieldset>
    </form>
  `;

  const form = document.getElementById('create-form');
  const titleInput = document.getElementById('create-title');
  const priceInput = document.getElementById('create-price');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (app.busy || !app.ready) return;

    // Браузер міндетті өрістерді, баға шегін және 0.01 қадамын тексереді.
    if (!form.reportValidity()) return;
    const title = titleInput.value.trim();
    const priceText = priceInput.value.trim();

    if (title === '' || title.length > 100) {
      app.showStatus('Название должно содержать от 1 до 100 символов.', true);
      titleInput.focus();
      return;
    }
    if (priceText === '') {
      app.showStatus('Укажите цену.', true);
      return;
    }
    const price = Number(priceText);
    if (!Number.isFinite(price)) {
      app.showStatus('Цена должна быть числом.', true);
      return;
    }

    app.setBusy(true);
    app.showStatus('Добавление товара…');
    try {
      await createProduct({ title, price });
      // Сұрау сәтті болса ғана тауарды тізімнің басына қосамыз.
      app.products.unshift({ id: app.nextLocalId--, title, price });
      app.render();
      form.reset();
      app.showStatus('Товар добавлен');
    } catch (error) {
      app.showStatus(error.message, true);
    } finally {
      app.setBusy(false);
    }
  });
}
