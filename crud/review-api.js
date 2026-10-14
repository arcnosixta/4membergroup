import { getUsers } from '../users/api.js';
let usersRequest;

// Один справочник на страницу; после ошибки следующая попытка повторит запрос.
export function reviewUsers() {
  if (!usersRequest) usersRequest = getUsers().catch(error => { usersRequest = null; throw error; });
  return usersRequest;
}
export function findReviewer(users, review) {
  const email = String(review.reviewerEmail || '').trim().toLowerCase();
  if (!email) return null;
  const matches = users.filter(user => user.email.trim().toLowerCase() === email);
  return matches.length === 1 ? matches[0] : null;
}
export async function getUserCarts(id) {
  if (!Number.isInteger(id) || id <= 0) throw new Error('Неверный ID пользователя.');
  const response = await fetch(`https://dummyjson.com/carts/user/${id}?limit=0`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Ошибка загрузки корзин: HTTP ' + response.status);
  const data = await response.json();
  if (!Array.isArray(data?.carts) || !data.carts.every(cart =>
    cart && cart.userId === id && Array.isArray(cart.products) && cart.products.every(product =>
      product && typeof product.title === 'string' && Number.isFinite(product.price) &&
      Number.isInteger(product.quantity) && product.quantity > 0
    )
  )) throw new Error('Сервер вернул неверные данные корзин.');
  return data.carts;
}
