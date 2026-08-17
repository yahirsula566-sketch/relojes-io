import { productRepository } from '../repositories/productRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { orderService } from '../services/orderService.js';
import { ok, created, badRequest, notFound } from '../utils/response.js';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const adminController = {
  dashboard(req, res) {
    ok(res, orderRepository.getDashboardStats());
  },

  // ---- Productos ----
  listProducts(req, res) {
    const { q, page, pageSize } = req.query;
    const result = productRepository.listProducts({
      search: q || undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
      includeInactive: true,
    });
    ok(res, result.items, { total: result.total });
  },

  getProduct(req, res) {
    const product = productRepository.getProductById(req.params.id);
    if (!product) throw notFound('Producto no encontrado');
    const styles = productRepository.getStylesWithVariants(product.id);
    ok(res, { ...product, styles });
  },

  createProduct(req, res) {
    const { name, description, basePrice, categoryId, images, active, featured } = req.body;
    if (!name || !basePrice) throw badRequest('name y basePrice son obligatorios.');
    const product = productRepository.createProduct({
      name, slug: slugify(name), description, basePrice, categoryId, images, active, featured,
    });
    created(res, product);
  },

  updateProduct(req, res) {
    const product = productRepository.updateProduct(req.params.id, req.body);
    if (!product) throw notFound('Producto no encontrado');
    ok(res, product);
  },

  deleteProduct(req, res) {
    const okDeleted = productRepository.deleteProduct(req.params.id);
    if (!okDeleted) throw notFound('Producto no encontrado');
    ok(res, { deleted: true });
  },

  // ---- Estilos ----
  createStyle(req, res) {
    const { name, sortOrder } = req.body;
    if (!name) throw badRequest('name es obligatorio.');
    const style = productRepository.createStyle(req.params.productId, name, sortOrder || 0);
    created(res, style);
  },

  deleteStyle(req, res) {
    const okDeleted = productRepository.deleteStyle(req.params.styleId);
    if (!okDeleted) throw notFound('Estilo no encontrado');
    ok(res, { deleted: true });
  },

  // ---- Variantes ----
  createVariant(req, res) {
    const { styleId, colorName, colorHex, sku, price, stock, active } = req.body;
    if (!styleId || !colorName || !sku || price === undefined) {
      throw badRequest('styleId, colorName, sku y price son obligatorios.');
    }
    const color = productRepository.findOrCreateColor(colorName, colorHex);
    const variant = productRepository.createVariant({
      productId: req.params.productId, styleId, colorId: color.id, sku, price, stock, active,
    });
    created(res, variant);
  },

  updateVariant(req, res) {
    const variant = productRepository.updateVariant(req.params.variantId, req.body);
    if (!variant) throw notFound('Variante no encontrada');
    ok(res, variant);
  },

  deleteVariant(req, res) {
    const okDeleted = productRepository.deleteVariant(req.params.variantId);
    if (!okDeleted) throw notFound('Variante no encontrada');
    ok(res, { deleted: true });
  },

  // ---- Pedidos ----
  listOrders(req, res) {
    const { q, status, page, pageSize } = req.query;
    const result = orderRepository.listOrders({
      search: q || undefined, status: status || undefined,
      page: page ? Number(page) : 1, pageSize: pageSize ? Number(pageSize) : 20,
    });
    ok(res, result.items, { total: result.total });
  },

  getOrder(req, res) {
    const order = orderRepository.getOrderById(req.params.id);
    if (!order) throw notFound('Pedido no encontrado');
    ok(res, order);
  },

  updateOrderStatus(req, res) {
    const { orderStatus } = req.body;
    if (!orderStatus) throw badRequest('orderStatus es obligatorio.');
    if (orderStatus === 'cancelled') {
      const order = orderService.cancelOrder(req.params.id);
      ok(res, order);
      return;
    }
    const order = orderRepository.updateOrderStatus(req.params.id, { orderStatus });
    if (!order) throw notFound('Pedido no encontrado');
    ok(res, order);
  },
};
