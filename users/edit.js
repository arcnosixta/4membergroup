import { updateUser, roleLabels } from './api.js';

export function initEdit(app) {
  const dialog = document.getElementById('edit-dialog');
  const container = document.getElementById('edit-container');

  // Форманы бір рет жасаймыз.
  container.innerHTML = `
    <form id="edit-form">
      <fieldset class="field-grid">
        <label for="edit-first-name">Имя
          <input id="edit-first-name" type="text" maxlength="60" required>
        </label>
        <label for="edit-last-name">Фамилия
          <input id="edit-last-name" type="text" maxlength="60" required>
        </label>
        <label for="edit-username">Ник (без @)
          <input id="edit-username" type="text" minlength="3" maxlength="30" required>
        </label>
        <label for="edit-role">Роль
          <select id="edit-role" required>
            <option value="user">Пользователь</option>
            <option value="moderator">Модератор</option>
            <option value="admin">Админ</option>
          </select>
        </label>
        <label for="edit-email">Почта (необязательно)
          <input id="edit-email" type="email">
        </label>
        <label for="edit-phone">Телефон (необязательно)
          <input id="edit-phone" type="tel" maxlength="40">
        </label>
        <label for="edit-image" class="wide">Ссылка на фото (необязательно, http/https)
          <input id="edit-image" type="url">
        </label>
        <label for="edit-description" class="wide">Описание (необязательно)
          <textarea id="edit-description" maxlength="1000" rows="3"></textarea>
        </label>
        <div class="actions wide"><button type="submit">Сохранить</button><button id="edit-cancel" type="button" class="secondary">Отмена</button></div>
      </fieldset>
    </form>
  `;

  const form = document.getElementById('edit-form');
  const firstName = document.getElementById('edit-first-name');
  const lastName = document.getElementById('edit-last-name');
  const username = document.getElementById('edit-username');
  const role = document.getElementById('edit-role');
  const email = document.getElementById('edit-email');
  const phone = document.getElementById('edit-phone');
  const image = document.getElementById('edit-image');
  const description = document.getElementById('edit-description');

  let editingId = null;
  app.onEdit = function (id) {
    if (app.busy || !app.ready) return;
    const user = app.users.find(user => user.id === id);
    if (!user) {
      app.showStatus('Человек больше не находится в каталоге.', true);
      return;
    }
    editingId = user.id;
    firstName.value = user.firstName;
    lastName.value = user.lastName;
    username.value = user.username;
    role.value = user.role;
    email.value = user.email;
    phone.value = user.phone;
    image.value = user.image;
    description.value = user.description;
    const message = dialog.querySelector('.dialog-status');
    message.textContent = '';
    message.dataset.error = 'false';
    dialog.showModal();
    firstName.focus();
  };

  document.getElementById('edit-cancel').addEventListener('click', function () {
    if (app.busy || !app.ready) return;
    dialog.close();
  });
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (app.busy || !app.ready) return;
    if (!app.users.some(user => user.id === editingId)) {
      dialog.close();
      app.showStatus('Человек больше не находится в каталоге.', true);
      return;
    }
    if (!form.reportValidity()) return;

    // Өрістердің мәндерін алып, шеттеріндегі бос орындарды өшіреміз.
    const data = {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      username: username.value.trim(),
      role: role.value,
      email: email.value.trim(),
      phone: phone.value.trim(),
      image: image.value.trim(),
      description: description.value.trim(),
    };

    if (!data.firstName || !data.lastName || data.firstName.length > 60 || data.lastName.length > 60) {
      app.showStatus('Имя и фамилия должны содержать от 1 до 60 символов.', true);
      return;
    }
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(data.username)) {
      app.showStatus('Ник: 3–30 символов, только латинские буквы, цифры, _, . и - без @.', true);
      return;
    }
    for (const user of app.users) {
      if (user.id !== editingId && user.username.toLowerCase() === data.username.toLowerCase()) {
        app.showStatus('Этот ник уже занят.', true);
        username.focus();
        return;
      }
    }
    if (!Object.hasOwn(roleLabels, data.role)) {
      app.showStatus('Выберите роль из списка.', true);
      return;
    }
    if (data.description.length > 1000 || data.phone.length > 40) {
      app.showStatus('Описание — до 1000 символов, телефон — до 40.', true);
      return;
    }
    if (data.image) {
      try {
        const url = new URL(data.image);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error();
      } catch {
        app.showStatus('Ссылка на фото должна начинаться с http:// или https://.', true);
        return;
      }
    }

    app.setBusy(true);
    app.showStatus('Сохранение изменений…');
    try {
      // Жаңа адам тек жергілікті тізімде бар, оған PUT жібермейміз.
      if (editingId > 0) await updateUser(editingId, data);
      const user = app.users.find(user => user.id === editingId);
      if (!user) {
        dialog.close();
        app.showStatus('Человек больше не находится в каталоге.', true);
        return;
      }
      // Жауаптағы артық өрістерді алмаймыз, бұрынғы ID сақталады.
      Object.assign(user, data);
      app.render();
      dialog.close();
      app.showStatus('Изменения сохранены');
    } catch (error) {
      app.showStatus(error.message, true);
    } finally {
      app.setBusy(false);
    }
  });
}
