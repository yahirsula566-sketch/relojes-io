import { MockPaymentProvider } from './mockProvider.js';
import { RecurrenteProvider } from './recurrenteProvider.js';
import { env } from '../../utils/env.js';

const providers = {
  mock: new MockPaymentProvider(),
  recurrente: new RecurrenteProvider(),
};

export function getPaymentProvider(name = env.PAYMENT_PROVIDER) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Proveedor de pago desconocido: "${name}". Usa "mock" o "recurrente".`);
  }
  return { name, provider };
}
