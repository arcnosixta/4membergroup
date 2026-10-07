import { deleteProduct } from './api.js';

export function initDelete(app) {
  app.onDelete = async function (id) {
    if (app.busy || !app.ready) return;
    const product = app.products.find(product => product.id === id);
    if (!product) return;
    if (!window.confirm('Удалить товар «' + product.title + '»?')) return;

    app.setBusy(true);
    try {
      if (id > 0) {
        const result = await deleteProduct(id);
        if (result?.isDeleted !== true) {
          throw new Error('Сервер не подтвердил удаление товара.');
        }
      }
      app.products = app.products.filter(product => product.id !== id);
      app.render();
      app.showStatus('Товар удалён');
    } catch (error) {
      app.showStatus(error.message, true);
    } finally {
      app.setBusy(false);
    }
  };
}
