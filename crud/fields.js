// Дополнительные поля общие для создания и редактирования.
export const fields = [
  ['description', 'Описание', 'textarea'], ['brand', 'Бренд', 'text'],
  ['category', 'Категория', 'text'], ['stock', 'Остаток, шт.', 'number', 0, 1000000, 1],
  ['rating', 'Рейтинг (0–5)', 'number', 0, 5, 0.01],
  ['discountPercentage', 'Скидка, %', 'number', 0, 100, 0.01],
  ['thumbnail', 'Ссылка на главное фото', 'url'],
  ['images', 'Фотографии — одна ссылка на строку', 'textarea'],
  ['sku', 'Артикул', 'text'], ['weight', 'Вес', 'number', 0, 1000000, 0.01],
  ['warrantyInformation', 'Гарантия', 'text'], ['shippingInformation', 'Доставка', 'text'],
  ['returnPolicy', 'Условия возврата', 'text'], ['availabilityStatus', 'Статус наличия', 'text'],
];
export function fieldsMarkup(prefix) {
  return `<div class="field-grid">${fields.map(([key, label, type, min, max, step]) =>
    `<label class="${type === 'textarea' || type === 'url' ? 'wide' : ''}" for="${prefix}-${key}">${label}` +
    (type === 'textarea' ? `<textarea id="${prefix}-${key}" rows="3" maxlength="6000"></textarea>` :
      `<input id="${prefix}-${key}" type="${type}" ${type === 'number' ? `min="${min}" max="${max}" step="${step}"` : 'maxlength="2000"'}>`) + '</label>'
  ).join('')}</div>`;
}
export function fillFields(prefix, product) {
  for (const [key] of fields) {
    document.getElementById(`${prefix}-${key}`).value = key === 'images'
      ? (product.images || []).join('\n') : (product[key] ?? '');
  }
}
export function safeImageUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
export function readFields(prefix, original = {}) {
  const data = {};
  for (const [key, label, type, min, max, step] of fields) {
    const value = document.getElementById(`${prefix}-${key}`).value.trim();
    if (value === '' && !(key in original)) continue;
    if (key === 'images') {
      data.images = value.split('\n').map(s => s.trim()).filter(Boolean);
      if (data.images.some(url => !safeImageUrl(url))) throw new Error('Фотографии: нужны ссылки http:// или https://.');
    } else if (type === 'number') {
      const number = Number(value);
      if (!value || !Number.isFinite(number) || number < min || number > max ||
          (step === 1 ? !Number.isInteger(number) : Number(number.toFixed(2)) !== number)) {
        throw new Error(`${label}: укажите число от ${min} до ${max}${step === 1 ? ', целое' : ', до двух знаков после запятой'}.`);
      }
      data[key] = number;
    } else {
      if (type === 'url' && value && !safeImageUrl(value)) throw new Error('Фото: нужна ссылка http:// или https://.');
      data[key] = value;
    }
  }
  return data;
}
