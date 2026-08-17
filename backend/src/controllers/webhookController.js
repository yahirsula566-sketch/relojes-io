import { getPaymentProvider } from '../services/payments/index.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { ok, badRequest } from '../utils/response.js';

// Flujo: Recurrente (o Mock) -> POST /api/payments/webhook -> validar
// evento -> actualizar Payment -> actualizar Order.
export const webhookController = {
  async receive(req, res) {
    const providerName = req.query.provider || 'mock';
    const { provider } = getPaymentProvider(providerName);

    const event = await provider.handleWebhook({
      headers: req.headers,
      rawBody: req.body,
    });

    if (!event?.providerPaymentId) {
      throw badRequest('El webhook no incluyó un identificador de pago válido.');
    }

    const payment = orderRepository.getPaymentByProviderId(event.providerPaymentId);
    if (!payment) {
      throw badRequest(`No se encontró un pago con providerPaymentId=${event.providerPaymentId}`);
    }

    orderRepository.updatePaymentStatus(event.providerPaymentId, event.status, event.raw);

    const orderStatus = event.status === 'paid' ? 'paid'
      : event.status === 'cancelled' ? 'cancelled'
      : event.status === 'failed' ? 'cancelled'
      : 'pending';

    orderRepository.updateOrderStatus(payment.order_id, {
      paymentStatus: event.status,
      orderStatus,
    });

    ok(res, { received: true });
  },
};
