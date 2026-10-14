import { fullName } from './list.js';
import { roleLabels } from './api.js';

export function element(tag, text, className = '') {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  node.className = className;
  return node;
}

export function avatar(user) {
  const frame = element('div', undefined, 'person-avatar');
  const fallback = element('span', (user.firstName[0] || '') + (user.lastName[0] || ''));
  fallback.setAttribute('aria-hidden', 'true');
  frame.append(fallback);
  // Разрешены только web-адреса, для отсутствующего/битого фото остаются инициалы.
  if (/^https?:\/\//i.test(user.image)) {
    const image = document.createElement('img');
    image.alt = fullName(user); image.loading = 'lazy'; image.src = user.image;
    image.addEventListener('error', () => image.remove());
    frame.append(image);
  }
  return frame;
}

export function showDetails(user) {
  const dialog = document.getElementById('person-dialog');
  const content = document.getElementById('person-content');
  const info = element('div');
  const title = element('h2', fullName(user)); title.id = 'person-title';
  info.append(element('p', '@' + user.username, 'muted'), title,
    element('p', roleLabels[user.role], 'role-badge'),
    element('h3', 'О человеке'), element('p', user.description || 'Описание пока не добавлено.', 'description'));
  const contacts = element('dl', undefined, 'specs');
  for (const [label, value] of [['Почта', user.email], ['Телефон', user.phone]]) {
    const row = element('div'); row.append(element('dt', label), element('dd', value || 'Не указано')); contacts.append(row);
  }
  info.append(contacts);
  content.replaceChildren(avatar(user), info);
  dialog.showModal();
}
