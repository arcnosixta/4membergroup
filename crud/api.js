// Только HTTP-запросы. Список на странице меняют модули create/edit/delete.
const API_URL = 'https://dummyjson.com/products';

async function request(path, method = 'GET', data) {
  const options = { method, signal: AbortSignal.timeout(15000) };
  if (data !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }
  const response = await fetch(API_URL + path, options);
  if (!response.ok) {
    throw new Error('Ошибка сервера: HTTP ' + response.status);
  }
  return response.json();
}

export async function getProducts() {
  const data = await request('?limit=20&select=title,price');
  if (!Array.isArray(data.products) || !data.products.every(product =>
    product && Number.isInteger(product.id) && product.id > 0 &&
    typeof product.title === 'string' &&
    Number.isFinite(product.price) && product.price >= 0
  )) {
    throw new Error('Сервер вернул неверный список товаров.');
  }
  return data.products.map(({ id, title, price }) => ({ id, title, price }));
}

export function createProduct(data) {
  return request('/add', 'POST', data);
}

export function updateProduct(id, data) {
  return request('/' + id, 'PUT', data);
}

export function deleteProduct(id) {
  return request('/' + id, 'DELETE');
}
