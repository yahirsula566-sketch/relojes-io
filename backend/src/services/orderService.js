import { productRepository } from '../repositories/productRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { cartService } from './cartService.js';
import { getPaymentProvider } from './payments/index.js';
import { badRequest, conflict } from '../utils/response.js';

function assertCustomer(customer) {
  if (!customer || !customer.name || !customer.email || !customer.address || !customer.city) {
    throw badRequest('Faltan datos del cliente: nombre, correo, dirección y ciudad son obligatorios.');
  }
}

export const orderService = {
  /**
   * Crea el pedido: revalida precios/stock, reserva stock de forma
   * atómica por variante y crea el intento de pago con el proveedor
   * configurado.
   */
  async checkout({ customer, items, paymentProviderName }) {
    assertCustomer(customer);
    const { lines, subtotal, total } = cartService.validateItems(items);

    // Reserva de stock atómica; si alguna línea falla se revierte todo.
    const reserved = [];
    try {
      for (const line of lines) {
        const okStock = productRepository.decrementStock(line.variantId, line.quantity);
        if (!okStock) {
          throw conflict(`Stock insuficiente para SKU ${line.sku} al confirmar el pedido.`);
        }
        reserved.push(line);
      }
    } catch (err) {
      for (const line of reserved) productRepository.restoreStock(line.variantId, line.quantity);
      throw err;
    }

    const customerRow = orderRepository.findOrCreateCustomer(customer);
    const order = orderRepository.createOrder({
      customerId: customerRow.id, items: lines, subtotal, total,
    });

    const { name: providerName, provider } = getPaymentProvider(paymentProviderName);

    try {
      const paymentResult = await provider.createPayment({ order });
      orderRepository.createPayment({
        orderId: order.id,
        provider: providerName,
        status: paymentResult.status,
        amount: total,
        currency: order.currency,
        providerPaymentId: paymentResult.providerPaymentId,
        rawPayload: paymentResult.raw,
      });

      const updated = orderRepository.updateOrderStatus(order.id, {
        paymentStatus: paymentResult.status,
        orderStatus: paymentResult.status === 'paid' ? 'paid' : 'pending',
        paymentProvider: providerName,
        paymentId: paymentResult.providerPaymentId,
      });

      return { order: updated, redirectUrl: paymentResult.redirectUrl };
    } catch (err) {
      // Si el proveedor de pago falla, no dejamos el pedido "colgado":
      // se marca como fallido pero se conserva para trazabilidad. El
      // stock reservado NO se libera automáticamente porque el pedido
      // sigue existiendo (evita condiciones de carrera); un admin puede
      // cancelarlo desde el panel para liberar el stock si corresponde.
      orderRepository.updateOrderStatus(order.id, {
        paymentStatus: 'failed', orderStatus: 'cancelled', paymentProvider: providerName,
      });
      throw err;
    }
  },

  cancelOrder(orderId) {
    const order = orderRepository.getOrderById(orderId);
    if (!order) throw badRequest('Pedido no encontrado.');
    if (order.order_status === 'cancelled') return order;
    for (const item of order.items) {
      // Buscar la variante actual por SKU para reponer stock (puede
      // haber cambiado de id si fue recreada, por eso se busca por SKU).
      const variant = productRepository.getVariantBySku(item.sku);
      if (variant) productRepository.restoreStock(variant.id, item.quantity);
    }
    return orderRepository.updateOrderStatus(orderId, {
      orderStatus: 'cancelled', paymentStatus: 'cancelled',
    });
  },
};
