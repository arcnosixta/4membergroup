import { createUser, roleLabels } from './api.js';
import { selectUsers } from './list.js';

export function initCreate(app) {
  const dialog = document.getElementById('create-dialog');
  const container = document.getElementById('create-container');

  // Форманы бір рет жасаймыз.
  container.innerHTML = `
    <form id="create-form">
      <fieldset class="field-grid">
        <label for="create-first-name">Имя
          <input id="create-first-name" type="text" maxlength="60" required>
        </label>
        <label for="create-last-name">Фамилия
          <input id="create-last-name" type="text" maxlength="60" required>
        </label>
        <label for="create-username">Ник (без @)
          <input id="create-username" type="text" minlength="3" maxlength="30" required>
        </label>
        <label for="create-role">Роль
          <select id="create-role" required>
            <option value="user">Пользователь</option>
            <option value="moderator">Модератор</option>
            <option value="admin">Админ</option>
          </select>
        </label>
        <label for="create-email">Почта (необязательно)
          <input id="create-email" type="email">
        </label>
        <label for="create-phone">Телефон (необязательно)
          <input id="create-phone" type="tel" maxlength="40">
        </label>
        <label for="create-image" class="wide">Ссылка на фото (необязательно, http/https)
          <input id="create-image" type="url">
        </label>
        <label for="create-description" class="wide">Описание (необязательно)
          <textarea id="create-description" maxlength="1000" rows="3"></textarea>
        </label>
        <div class="actions wide"><button type="submit">Добавить</button></div>
      </fieldset>
    </form>
  `;

  const form = document.getElementById('create-form');
  const firstName = document.getElementById('create-first-name');
  const lastName = document.getElementById('create-last-name');
  const username = document.getElementById('create-username');
  const role = document.getElementById('create-role');
  const email = document.getElementById('create-email');
  const phone = document.getElementById('create-phone');
  const image = document.getElementById('create-image');
  const description = document.getElementById('create-description');

  app.onCreate = function () {
    if (app.busy || !app.ready) return;
    const message = dialog.querySelector('.dialog-status');
    message.textContent = '';
    message.dataset.error = 'false';
    dialog.showModal();
    firstName.focus();
  };

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (app.busy || !app.ready) return;
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
      if (user.username.toLowerCase() === data.username.toLowerCase()) {
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
    app.showStatus('Добавление человека…');
    try {
      await createUser(data);
      // Тек сәтті сұраудан кейін тізімге қосып, өз ID-мізді береміз.
      const user = { ...data, id: app.nextLocalId-- };
      app.users.unshift(user);
      app.render();

      // Іздеу мен фильтрді өзгертпей, жаңа адам көрінетінін тексереміз.
      const visible = selectUsers(
        [user],
        document.getElementById('search').value,
        document.getElementById('role').value,
        document.getElementById('sort').value
      );
      form.reset();
      dialog.close();
      if (visible.length === 0) {
        app.showStatus('Человек добавлен, но скрыт текущим поиском или фильтром статуса.');
      } else {
        app.showStatus('Человек добавлен');
      }
    } catch (error) {
      app.showStatus(error.message, true);
    } finally {
      app.setBusy(false);
    }
  });
}
