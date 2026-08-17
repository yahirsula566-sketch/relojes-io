// Interfaz común que debe implementar cualquier proveedor de pago.
// El checkout y el resto de la tienda solo dependen de esta interfaz,
// nunca de un proveedor concreto, para poder intercambiar el proveedor
// (mock ⇄ Recurrente ⇄ otro futuro) sin tocar el checkout.
//
// Todos los métodos son async y deben devolver un objeto con, como
// mínimo, la forma documentada en cada método.
export class PaymentProvider {
  /**
   * Crea una intención/sesión de pago para un pedido.
   * @returns {Promise<{ providerPaymentId: string, status: 'pending'|'paid', redirectUrl?: string, raw?: object }>}
   */
  // eslint-disable-next-line no-unused-vars
  async createPayment({ order }) {
    throw new Error('createPayment() no implementado');
  }

  /**
   * Consulta el estado actual de un pago en el proveedor.
   * @returns {Promise<{ status: 'pending'|'paid'|'failed'|'cancelled', raw?: object }>}
   */
  // eslint-disable-next-line no-unused-vars
  async getPayment(providerPaymentId) {
    throw new Error('getPayment() no implementado');
  }

  /**
   * Cancela un pago/pedido pendiente en el proveedor.
   */
  // eslint-disable-next-line no-unused-vars
  async cancelPayment(providerPaymentId) {
    throw new Error('cancelPayment() no implementado');
  }

  /**
   * Valida y traduce el payload crudo de un webhook entrante a un
   * evento normalizado que el resto de la app pueda consumir.
   * @returns {Promise<{ providerPaymentId: string, status: string, raw: object }>}
   */
  // eslint-disable-next-line no-unused-vars
  async handleWebhook({ headers, rawBody }) {
    throw new Error('handleWebhook() no implementado');
  }
}
