// Proveedor de pago simulado: aprueba pagos automáticamente para poder
// probar todo el flujo de checkout sin credenciales reales.
import { PaymentProvider } from './paymentProvider.js';
import { randomToken } from '../../utils/hash.js';

export class MockPaymentProvider extends PaymentProvider {
  async createPayment({ order }) {
    const providerPaymentId = `mock_${randomToken(8)}`;
    // Simulamos aprobación inmediata (comportamiento típico de un
    // proveedor de pruebas). El estado real llega también por webhook
    // simulado a /api/payments/webhook para ejercitar ese flujo.
    return {
      providerPaymentId,
      status: 'paid',
      redirectUrl: `/pedido-confirmado.html?orderId=${order.id}&paymentId=${providerPaymentId}`,
      raw: { provider: 'mock', orderId: order.id, amount: order.total },
    };
  }

  async getPayment(providerPaymentId) {
    return { status: 'paid', raw: { provider: 'mock', providerPaymentId } };
  }

  async cancelPayment(providerPaymentId) {
    return { status: 'cancelled', raw: { provider: 'mock', providerPaymentId } };
  }

  async handleWebhook({ rawBody }) {
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody || '{}') : rawBody;
    return {
      providerPaymentId: payload.providerPaymentId,
      status: payload.status || 'paid',
      raw: payload,
    };
  }
}
