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
    image.style.opacity = '0';
    image.addEventListener('load', () => { image.style.opacity = '1'; });
    image.alt = fullName(user); image.loading = 'lazy'; image.src = user.image;
    image.addEventListener('error', () => image.remove());
    frame.append(image);
  }
  return frame;
}

// Одна и та же карточка используется в списке и внутри большого окна.
export function userCard(user) {
  const card = element('div', undefined, 'user-card');
  card.dataset.userId = user.id;
  const text = element('div', undefined, 'user-card-text');
  text.append(element('strong', fullName(user)),
    element('span', '@' + user.username, 'muted'),
    element('span', 'ID пользователя: ' + user.id, 'user-card-id'));
  card.append(avatar(user), text);
  return card;
}

export function showDetails(user) {
  const dialog = document.getElementById('person-dialog');
  const content = document.getElementById('person-content');
  const profile = element('section', undefined, 'profile-half');
  const title = element('h2', fullName(user)); title.id = 'person-title';
  profile.append(avatar(user), title, element('p', '@' + user.username, 'muted'),
    element('h3', 'О человеке'), element('p', user.description || 'Описание пока не добавлено.', 'description'));

  const details = element('section', undefined, 'card-half');
  details.append(userCard(user), element('h3', 'Информация о карточке'));
  const fields = element('dl', undefined, 'specs');
  for (const [label, value] of [
    ['ID пользователя', user.id], ['Имя', fullName(user)],
    ['Ник', '@' + user.username], ['Статус (роль)', roleLabels[user.role]],
    ['Почта', user.email], ['Телефон', user.phone],
  ]) {
    const row = element('div');
    row.append(element('dt', label), element('dd', value === '' ? 'Не указано' : value));
    fields.append(row);
  }
  details.append(fields);
  content.replaceChildren(profile, details);
  dialog.showModal();
}
