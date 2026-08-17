import { orderService } from '../services/orderService.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { created, ok, notFound } from '../utils/response.js';

export const checkoutController = {
  async submit(req, res) {
    const { customer, items } = req.body;
    const { order, redirectUrl } = await orderService.checkout({ customer, items });
    created(res, { order, redirectUrl });
  },

  getOrder(req, res) {
    const order = orderRepository.getOrderById(req.params.id);
    if (!order) throw notFound('Pedido no encontrado');
    ok(res, order);
  },
};
