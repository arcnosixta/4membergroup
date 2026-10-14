const API_URL = 'https://dummyjson.com/users';
export const roleLabels = { user: 'Пользователь', moderator: 'Модератор', admin: 'Админ' };

async function request(path, method = 'GET', data) {
  const options = { method, signal: AbortSignal.timeout(15000) };
  if (data !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(data);
  }
  const response = await fetch(API_URL + path, options);
  if (!response.ok) throw new Error('Ошибка сервера: HTTP ' + response.status);
  return response.json();
}

export async function getUsers() {
  const data = await request('?limit=0&select=firstName,lastName,username,image,email,phone,company,role');
  if (!Array.isArray(data?.users) || !data.users.every(user =>
    user && Number.isInteger(user.id) && user.id > 0 &&
    ['firstName', 'lastName', 'username'].every(key => typeof user[key] === 'string') &&
    Object.hasOwn(roleLabels, user.role)
  )) throw new Error('Сервер вернул неверный список людей.');
  // Берём только поля нашего каталога, не копируем пароли и банковские данные.
  return data.users.map(user => ({
    id: user.id, firstName: user.firstName, lastName: user.lastName,
    username: user.username, role: user.role,
    image: user.image || '', email: user.email || '', phone: user.phone || '',
    description: [user.company?.title, user.company?.name, user.company?.department].filter(Boolean).join(' · '),
  }));
}
export function createUser(data) { return request('/add', 'POST', data); }
export function updateUser(id, data) { return request('/' + id, 'PUT', data); }
export function deleteUser(id) { return request('/' + id, 'DELETE'); }
