import { deleteUser } from './api.js';
import { fullName } from './list.js';

export function initDelete(app) {
  app.onDelete = async function (id) {
    if (app.busy || !app.ready) return;
    const user = app.users.find(user => user.id === id);
    if (!user) return;
    if (!window.confirm(`Удалить человека ${fullName(user)} (@${user.username})?`)) return;

    app.setBusy(true);
    try {
      // Отрицательные ID существуют только в локальном каталоге.
      if (id > 0) {
        const result = await deleteUser(id);
        if (result?.isDeleted !== true) {
          throw new Error('Сервер не подтвердил удаление человека.');
        }
      }
      app.users = app.users.filter(user => user.id !== id);
      app.render();
      app.showStatus('Человек удалён');
    } catch (error) {
      app.showStatus(error.message, true);
    } finally {
      app.setBusy(false);
      // setBusy перерисовывает список: фокусируем уже новые, доступные кнопки.
      const target = document.querySelector('#people button:not(:disabled)') ||
        document.getElementById('search');
      target.focus();
    }
  };
}
