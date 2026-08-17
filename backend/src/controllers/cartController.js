import { cartService } from '../services/cartService.js';
import { ok } from '../utils/response.js';

export const cartController = {
  /**
   * El frontend envía las líneas guardadas en localStorage para
   * revalidar precio/stock reales antes de mostrar el checkout.
   */
  validate(req, res) {
    const result = cartService.validateItems(req.body.items);
    ok(res, result);
  },
};
