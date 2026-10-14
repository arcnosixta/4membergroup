import { safeImageUrl } from './fields.js';
export function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function productImage(url, title) {
  const frame = element('div', undefined, 'image-frame');
  const source = safeImageUrl(url);
  if (!source) { frame.textContent = 'Нет фотографии'; return frame; }
  const img = document.createElement('img');
  img.src = source; img.alt = title; img.loading = 'lazy';
  img.addEventListener('error', () => { frame.replaceChildren(element('span', 'Фото недоступно')); });
  frame.append(img);
  return frame;
}
export const money = value => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD' }).format(value);
