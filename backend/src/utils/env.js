// Cargador de archivos .env sin dependencias externas (no hay acceso a npm
// en este entorno de referencia, así que evitamos el paquete "dotenv" y
// replicamos su comportamiento esencial).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..', '..'); // store/

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    // Quitar comillas envolventes si existen
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// .env tiene prioridad; .env.example solo se usa para completar valores
// faltantes en entornos de demostración donde no existe .env todavía.
loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, '.env.example'));

export const env = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_FILE: process.env.DATABASE_FILE === ':memory:'
    ? ':memory:'
    : path.resolve(ROOT, process.env.DATABASE_FILE || './backend/data/watchstore.db'),
  SESSION_SECRET: process.env.SESSION_SECRET || 'insecure-default-secret-change-me',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@watchstore.test',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'CambiaEstaClave123!',
  RECURRENTE_API_KEY: process.env.RECURRENTE_API_KEY || '',
  RECURRENTE_WEBHOOK_SECRET: process.env.RECURRENTE_WEBHOOK_SECRET || '',
  RECURRENTE_ENVIRONMENT: process.env.RECURRENTE_ENVIRONMENT || 'sandbox',
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || 'mock',
  ROOT,
};
