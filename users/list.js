export function fullName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

// filter создаёт новый массив: сортировка не меняет исходный список.
export function selectUsers(users, query, role, order) {
  const text = query.trim().toLocaleLowerCase();
  const result = users.filter(user => (!role || user.role === role) &&
    (fullName(user) + ' ' + user.username).toLocaleLowerCase().includes(text));
  if (order === 'name-asc' || order === 'name-desc') {
    const direction = order === 'name-desc' ? -1 : 1;
    result.sort((a, b) => direction * fullName(a).localeCompare(fullName(b), ['ru', 'en'], { sensitivity: 'base' }));
  }
  return result;
}
