// Hashing de contraseñas con scrypt (módulo nativo "crypto"), sin
// dependencias externas tipo bcrypt. scrypt es una función de derivación
// de clave adecuada para contraseñas (costosa en memoria y CPU).
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto';

const KEY_LEN = 64;

export function hashPassword(plainPassword) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plainPassword, salt, KEY_LEN).toString('hex');
  return { hash, salt };
}

export function verifyPassword(plainPassword, salt, expectedHash) {
  const hash = scryptSync(plainPassword, salt, KEY_LEN);
  const expected = Buffer.from(expectedHash, 'hex');
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
