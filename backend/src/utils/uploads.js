// Guarda imágenes subidas desde el panel admin como archivos reales en
// frontend/public/img/uploads/, para que se sirvan como estáticos.
// El admin envía la imagen como "data URL" (base64) generada en el
// navegador con FileReader; aquí solo se decodifica y se escribe a
// disco, sin necesidad de parsear multipart/form-data.
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { env } from './env.js';
import { badRequest } from './response.js';

const ALLOWED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB decodificados

const UPLOADS_DIR = path.resolve(env.ROOT, 'frontend', 'public', 'img', 'uploads');

/**
 * @param {string} dataUrl  ej. "data:image/png;base64,AAAA..."
 * @returns {Promise<string>} ruta pública, ej. "/img/uploads/abc123.png"
 */
export async function saveUploadedImage(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw badRequest('Se esperaba una imagen como data URL (data:image/...;base64,...).');
  }

  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw badRequest('Formato de data URL inválido.');

  const [, mimeType, base64] = match;
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) {
    throw badRequest(`Tipo de imagen no permitido: ${mimeType}. Usa PNG, JPG, WEBP, GIF o SVG.`);
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw badRequest('La imagen supera el tamaño máximo permitido (8MB).');
  }

  if (!existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true });

  const filename = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return `/img/uploads/${filename}`;
}
