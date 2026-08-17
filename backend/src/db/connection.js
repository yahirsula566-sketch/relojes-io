// Conexión única a SQLite usando el módulo nativo node:sqlite
// (disponible desde Node 22.5+, sin necesidad de instalar paquetes).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { env } from '../utils/env.js';

const dir = path.dirname(env.DATABASE_FILE);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

export const db = new DatabaseSync(env.DATABASE_FILE);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * node:sqlite (a diferencia de better-sqlite3) no expone un helper
 * db.transaction(); lo replicamos manualmente con BEGIN/COMMIT/ROLLBACK.
 * Uso: withTransaction(() => { ...operaciones...; return resultado; })
 */
export function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
