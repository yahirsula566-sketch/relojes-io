// =============================================================
// Proveedor de pago: Recurrente
// =============================================================
// IMPORTANTE — LÉASE ANTES DE ACTIVAR ESTE PROVEEDOR:
//
// Este archivo deja preparada la ESTRUCTURA para integrar Recurrente,
// pero deliberadamente NO implementa llamadas reales a su API porque
// este proyecto no cuenta con documentación oficial ni credenciales.
//
// NO se han inventado:
//   - endpoints,
//   - nombres de parámetros,
//   - formato del payload de webhook,
//   - firmas/headers de verificación.
//
// Antes de poner esto en producción, un desarrollador con acceso a la
// documentación oficial de Recurrente (https://recurrente.com) debe:
//   1. Completar RECURRENTE_API_KEY y RECURRENTE_WEBHOOK_SECRET en .env
//   2. Implementar createPayment() con la llamada real a la API de
//      creación de checkout/orden de Recurrente.
//   3. Implementar getPayment() con el endpoint real de consulta.
//   4. Implementar verifyWebhookSignature() con el mecanismo real de
//      verificación de firma que use Recurrente (ej. HMAC en un header).
//   5. Mapear los estados que envíe Recurrente a los estados internos
//      de la tienda: pending | paid | failed | cancelled.
//
// Mientras tanto, este proveedor lanza un error claro si se intenta
// usar sin estar configurado, para evitar fallos silenciosos.
// =============================================================
import { PaymentProvider } from './paymentProvider.js';
import { env } from '../../utils/env.js';

function assertConfigured() {
  if (!env.RECURRENTE_API_KEY) {
    throw new Error(
      'Recurrente no está configurado: falta RECURRENTE_API_KEY en las variables ' +
      'de entorno. Completa las credenciales y la integración real antes de usar ' +
      'este proveedor en producción. Mientras tanto, usa PAYMENT_PROVIDER=mock.'
    );
  }
}

export class RecurrenteProvider extends PaymentProvider {
  async createPayment({ order }) {
    assertConfigured();
    // TODO: reemplazar por la llamada real, por ejemplo:
    //   const res = await fetch('<endpoint oficial de Recurrente>', {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${env.RECURRENTE_API_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ /* payload oficial, no inventado */ }),
    //   });
    // No se implementa aquí para no inventar contrato de API.
    throw new Error('RecurrenteProvider.createPayment() pendiente de implementación oficial.');
  }

  async getPayment(_providerPaymentId) {
    assertConfigured();
    throw new Error('RecurrenteProvider.getPayment() pendiente de implementación oficial.');
  }

  async cancelPayment(_providerPaymentId) {
    assertConfigured();
    throw new Error('RecurrenteProvider.cancelPayment() pendiente de implementación oficial.');
  }

  /**
   * Punto de entrada preparado para el webhook de Recurrente.
   * La verificación de firma real debe implementarse según la
   * documentación oficial (RECURRENTE_WEBHOOK_SECRET ya está previsto
   * en .env.example para ese propósito).
   */
  async handleWebhook({ headers, rawBody }) {
    assertConfigured();
    if (!env.RECURRENTE_WEBHOOK_SECRET) {
      throw new Error('Falta RECURRENTE_WEBHOOK_SECRET para verificar el webhook.');
    }
    // TODO: verificar la firma del webhook con el mecanismo oficial de
    // Recurrente antes de confiar en "headers"/"rawBody". No implementado
    // porque el mecanismo exacto no está documentado en este proyecto.
    throw new Error('RecurrenteProvider.handleWebhook() pendiente de implementación oficial.');
  }
}
