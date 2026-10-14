import { element, productImage, money } from './view.js';
import { userCard, avatar } from '../users/details.js';
import { fullName } from '../users/list.js';
import { roleLabels } from '../users/api.js';
import { reviewUsers, findReviewer, getUserCarts } from './review-api.js';
let requestNumber = 0;

export function reviewsView(reviews) {
  if (!reviews.length) return element('p', 'Отзывов пока нет.');
  const list = element('ul', undefined, 'reviews-list');
  for (const review of reviews) {
    const item = element('li', undefined, 'review');
    const author = element('button', undefined, 'review-author'); author.type = 'button';
    author.setAttribute('aria-label', 'Открыть автора отзыва: ' + review.reviewerName);
    const placeholder = element('div', undefined, 'user-card');
    placeholder.append(element('strong', review.reviewerName || 'Автор отзыва'));
    author.append(placeholder);
    author.addEventListener('click', () => openReviewer(review));
    reviewUsers().then(users => {
      const user = findReviewer(users, review);
      if (user) author.replaceChildren(userCard(user));
    }).catch(() => { author.title = 'Нажмите, чтобы повторить загрузку профиля'; });
    const date = new Date(review.date);
    item.append(author, element('p', `★ ${review.rating} / 5`, 'rating'),
      element('p', review.comment || ''),
      element('p', Number.isNaN(date.getTime()) ? 'Дата не указана' : date.toLocaleDateString('ru-RU'), 'muted'));
    list.append(item);
  }
  return list;
}

async function openReviewer(review) {
  const dialog = document.getElementById('reviewer-dialog');
  const content = document.getElementById('reviewer-content');
  const token = ++requestNumber;
  const current = () => token === requestNumber && dialog.open;
  document.getElementById('reviewer-title').textContent = 'Автор отзыва';
  content.replaceChildren(element('p', 'Загрузка профиля…'));
  if (!dialog.open) dialog.showModal();
  // Закрытие отменяет применение позднего ответа, включая повторное открытие.
  dialog.addEventListener('close', () => { if (token === requestNumber) requestNumber++; }, { once: true });
  try {
    const user = findReviewer(await reviewUsers(), review);
    if (!current()) return;
    if (!user) {
      content.replaceChildren(element('p', review.reviewerName || 'Автор отзыва'),
        element('p', 'Профиль с таким email не найден. Нельзя определить ID и загрузить корзины.'));
      return;
    }
    document.getElementById('reviewer-title').textContent = fullName(user);
    const layout = element('div', undefined, 'reviewer-layout');
    const carts = element('section', undefined, 'reviewer-carts');
    carts.append(element('h3', 'Товары в корзинах'), element('p', 'Загрузка корзин…'));
    const profile = element('section', undefined, 'reviewer-profile');
    profile.append(avatar(user), element('h3', fullName(user)), element('p', '@' + user.username),
      element('p', 'ID пользователя: ' + user.id), element('p', roleLabels[user.role], 'role-badge'),
      element('p', user.description || 'Описание не добавлено.'),
      element('p', user.email || 'Почта не указана'), element('p', user.phone || 'Телефон не указан'));
    layout.append(carts, profile); content.replaceChildren(layout);
    async function loadCarts() {
      carts.replaceChildren(element('h3', 'Товары в корзинах'), element('p', 'Загрузка корзин…'));
      try {
        const data = await getUserCarts(user.id);
        if (!current()) return;
        carts.replaceChildren(element('h3', 'Товары в корзинах'));
        if (!data.length || data.every(cart => !cart.products.length)) {
          carts.append(element('p', 'У пользователя пока нет товаров в корзинах.')); return;
        }
        for (const cart of data) {
          carts.append(element('h4', 'Корзина №' + cart.id));
          for (const product of cart.products) {
            const row = element('article', undefined, 'cart-product');
            const info = element('div');
            info.append(element('h4', product.title), element('p', `${product.quantity} шт. × ${money(product.price)}`));
            row.append(productImage(product.thumbnail, product.title), info); carts.append(row);
          }
        }
      } catch (error) {
        if (current()) showError(carts, error, loadCarts);
      }
    }
    await loadCarts();
  } catch (error) {
    if (current()) showError(content, error, () => openReviewer(review));
  }
}
function showError(container, error, retry) {
  const message = element('p', error.message); message.dataset.error = 'true';
  const button = element('button', 'Повторить загрузку'); button.type = 'button';
  button.addEventListener('click', retry);
  container.replaceChildren(message, button);
}
