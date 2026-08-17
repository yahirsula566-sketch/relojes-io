// El navegador solo envía IDs de variante y cantidades. Todo lo demás
// (nombre, precio, SKU, stock disponible) se vuelve a calcular aquí,
// consultando la base de datos. Nunca se confía en precio/stock/estado
// enviados desde el cliente.
import { productRepository } from '../repositories/productRepository.js';
import { badRequest, conflict } from '../utils/response.js';

export const cartService = {
  /**
   * @param {{variantId: number, quantity: number}[]} rawItems
   * @returns {{lines: object[], subtotal: number, total: number}}
   */
  validateItems(rawItems) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw badRequest('El carrito está vacío.');
    }

    const lines = [];
    for (const raw of rawItems) {
      const quantity = Number(raw.quantity);
      if (!raw.variantId || !Number.isInteger(quantity) || quantity < 1) {
        throw badRequest('Cada línea del carrito requiere variantId y quantity válidos.');
      }

      const variant = productRepository.getVariantById(raw.variantId);
      if (!variant) throw badRequest(`La variante ${raw.variantId} no existe.`);
      if (!variant.active) throw conflict(`La variante ${variant.sku} ya no está disponible.`);
      if (variant.stock < quantity) {
        throw conflict(`Stock insuficiente para ${variant.product_name} (${variant.style_name} / ${variant.color_name}). Disponible: ${variant.stock}.`);
      }

      lines.push({
        variantId: variant.id,
        productId: variant.product_id,
        productName: variant.product_name,
        styleId: variant.style_id,
        styleName: variant.style_name,
        colorId: variant.color_id,
        colorName: variant.color_name,
        sku: variant.sku,
        quantity,
        unitPrice: variant.price,
        subtotal: Math.round(variant.price * quantity * 100) / 100,
      });
    }

    const subtotal = Math.round(lines.reduce((sum, l) => sum + l.subtotal, 0) * 100) / 100;
    // Espacio reservado para impuestos/envío; por ahora total === subtotal.
    const total = subtotal;
    return { lines, subtotal, total };
  },
};
