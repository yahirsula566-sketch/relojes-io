// Ejecuta el esquema SQL contra la base de datos configurada.
// Uso: npm run migrate
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { db } from './connection.js';
import { env } from '../utils/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

function migrate() {
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('✅ Migración completada: esquema aplicado en', env.DATABASE_FILE);
}

migrate();
