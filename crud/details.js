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
const names = {
  id: 'ID', title: 'Название', description: 'Описание', category: 'Категория', price: 'Цена, $',
  discountPercentage: 'Скидка, %', rating: 'Рейтинг', stock: 'Остаток, шт.', tags: 'Теги', brand: 'Бренд',
  sku: 'Артикул', weight: 'Вес', dimensions: 'Размеры', width: 'Ширина', height: 'Высота', depth: 'Глубина',
  warrantyInformation: 'Гарантия', shippingInformation: 'Доставка', availabilityStatus: 'Наличие',
  reviews: 'Отзывы покупателей', reviewerName: 'Покупатель', reviewerEmail: 'Email', comment: 'Отзыв', date: 'Дата',
  returnPolicy: 'Условия возврата', minimumOrderQuantity: 'Минимальный заказ', meta: 'Данные записи',
  createdAt: 'Создано', updatedAt: 'Обновлено', barcode: 'Штрихкод', qrCode: 'QR-код',
};
function valueView(value) {
  if (Array.isArray(value)) {
    if (!value.length) return element('span', 'Нет данных');
    const list = element('ul', undefined, 'detail-list');
    value.forEach(item => { const li = element('li'); li.append(valueView(item)); list.append(li); });
    return list;
  }
  if (value && typeof value === 'object') {
    const dl = element('dl', undefined, 'specs');
    for (const [key, item] of Object.entries(value)) {
      const row = element('div'); const dd = element('dd'); dd.append(valueView(item));
      row.append(element('dt', names[key] || key), dd); dl.append(row);
    }
    return dl;
  }
  return element('span', value == null || value === '' ? 'Не указано' : String(value));
}
export function showDetails(product, app) {
  const content = document.getElementById('detail-content'); content.replaceChildren();
  const layout = element('div', undefined, 'detail-layout');
  const gallery = element('div', undefined, 'gallery');
  const urls = [...new Set([product.thumbnail, ...(product.images || [])].filter(Boolean))];
  let mainPhoto = productImage(urls[0], product.title); gallery.append(mainPhoto);
  if (urls.length > 1) {
    const thumbs = element('div', undefined, 'thumbnails');
    urls.forEach((url, index) => {
      const button = element('button'); button.type = 'button'; button.setAttribute('aria-label', `Фотография ${index + 1}`);
      button.append(productImage(url, '')); button.addEventListener('click', () => {
        const nextPhoto = productImage(url, product.title);
        mainPhoto.replaceWith(nextPhoto); mainPhoto = nextPhoto;
      });
      thumbs.append(button);
    }); gallery.append(thumbs);
  }
  const info = element('div');
  const heading = element('h2', product.title); heading.id = 'detail-title';
  info.append(element('p', product.brand || product.category || 'Товар', 'eyebrow'), heading,
    element('p', product.rating == null ? 'Пока нет рейтинга' : `★ ${product.rating} / 5`, 'rating'),
    element('p', money(product.price), 'detail-price'), element('p', product.description || 'Описание пока не добавлено.', 'description'));
  const actions = element('div', undefined, 'actions');
  const edit = element('button', 'Редактировать товар'); edit.addEventListener('click', () => { document.getElementById('detail-dialog').close(); app.onEdit(product.id); });
  const remove = element('button', 'Удалить', 'danger'); remove.addEventListener('click', async () => {
    edit.disabled = remove.disabled = true;
    await app.onDelete(product.id);
    edit.disabled = remove.disabled = false;
    if (!app.products.some(item => item.id === product.id)) document.getElementById('detail-dialog').close();
  });
  actions.append(edit, remove); info.append(actions); layout.append(gallery, info); content.append(layout);
  const specs = Object.fromEntries(Object.entries(product).filter(([key]) => !['images', 'thumbnail', 'title', 'description', 'price', 'reviews'].includes(key)));
  content.append(element('h3', 'Характеристики и условия'), valueView(specs));
  content.append(element('h3', 'Отзывы покупателей'), valueView(product.reviews || []));
  content.append(element('p', '', 'dialog-status'));
  content.lastElementChild.setAttribute('role', 'status');
  document.getElementById('detail-dialog').showModal();
}
