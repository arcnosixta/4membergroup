import { getUsers, roleLabels } from './api.js';
import { selectUsers, fullName } from './list.js';
import { element, avatar, showDetails } from './details.js';
import { initCreate } from './create.js';
import { initEdit } from './edit.js';
import { initDelete } from './delete.js';

const list = document.getElementById('people');
const search = document.getElementById('search');
const role = document.getElementById('role');
const sort = document.getElementById('sort');
const retry = document.getElementById('retry');
const add = document.getElementById('add-person');
const app = {
  users: [], nextLocalId: -1, busy: false, ready: false,
  onCreate: null, onEdit: null, onDelete: null,
  render, setBusy, showStatus,
};
function showStatus(text, isError = false) {
  for (const node of document.querySelectorAll('#status, dialog[open] .dialog-status')) {
    node.textContent = text; node.dataset.error = String(isError);
  }
}
function setBusy(value) {
  app.busy = value;
  for (const fieldset of document.querySelectorAll('fieldset')) fieldset.disabled = value || !app.ready;
  for (const button of document.querySelectorAll('[data-close]')) button.disabled = value;
  retry.disabled = value;
  list.setAttribute('aria-busy', String(value));
  render();
}
function render() {
  add.disabled = app.busy || !app.ready || !app.onCreate;
  const users = selectUsers(app.users, search.value, role.value, sort.value);
  list.replaceChildren();
  for (const user of users) {
    const item = element('li', undefined, 'person-row');
    const open = element('button', undefined, 'person-open');
    open.type = 'button'; open.disabled = app.busy;
    open.setAttribute('aria-label', 'Открыть профиль: ' + fullName(user));
    const name = element('span', undefined, 'person-name');
    name.append(element('strong', fullName(user)), element('span', '@' + user.username, 'muted'));
    open.append(avatar(user), name, element('span', roleLabels[user.role], 'role-badge'));
    open.addEventListener('click', () => showDetails(user));
    const actions = element('div', undefined, 'person-actions');
    for (const [label, handler] of [['Изменить', app.onEdit], ['Удалить', app.onDelete]]) {
      const button = element('button', label, 'secondary'); button.type = 'button';
      button.disabled = app.busy || !app.ready || !handler;
      if (!handler) button.title = 'Будет доступно после выполнения задачи команды';
      button.addEventListener('click', () => { if (!app.busy && handler) handler(user.id); });
      actions.append(button);
    }
    item.append(open, actions); list.append(item);
  }
  document.getElementById('count').textContent = app.ready ? `${users.length} из ${app.users.length} человек` : '';
  const empty = document.getElementById('empty'); empty.hidden = !app.ready || users.length > 0;
  empty.textContent = app.users.length ? 'Никого не найдено. Измените поиск или статус.' : 'В каталоге пока никого нет.';
}
async function loadUsers() {
  if (app.busy || app.ready) return;
  setBusy(true); retry.hidden = true; showStatus('Загрузка людей…');
  try { app.users = await getUsers(); app.ready = true; showStatus('Каталог загружен.'); }
  catch (error) { showStatus('Не удалось загрузить каталог. ' + error.message, true); retry.hidden = false; }
  finally { setBusy(false); }
}
initCreate(app); initEdit(app); initDelete(app);
add.addEventListener('click', () => { if (app.ready && !app.busy && app.onCreate) app.onCreate(); });
for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => { if (!app.busy) document.getElementById(button.dataset.close).close(); });
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('cancel', event => { if (app.busy) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    if (document.activeElement === document.body) search.focus();
  });
}
search.addEventListener('input', render);
role.addEventListener('change', render);
sort.addEventListener('change', render);
retry.addEventListener('click', loadUsers);
loadUsers();
