// Servidor de archivos estáticos minimalista para el frontend y el
// panel admin (HTML/CSS/JS planos, sin paso de build).
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Crea un manejador de estáticos para un directorio raíz dado.
 * defaultFile: archivo a servir cuando la ruta termina en "/".
 */
export function createStaticHandler(rootDir, defaultFile = 'index.html') {
  return async function serveStatic(urlPathname) {
    let relativePath = urlPathname === '/' ? defaultFile : urlPathname.replace(/^\/+/, '');
    if (relativePath.endsWith('/')) relativePath += defaultFile;

    const filePath = path.join(rootDir, relativePath);
    // Evitar path traversal fuera del directorio raíz.
    if (!filePath.startsWith(rootDir)) return null;

    try {
      const st = await stat(filePath);
      if (st.isDirectory()) {
        return serveStatic(path.posix.join(urlPathname, '/'));
      }
      const data = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return { data, contentType: MIME_TYPES[ext] || 'application/octet-stream' };
    } catch {
      return null;
    }
  };
}
