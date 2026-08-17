// Router HTTP minimalista construido sobre el módulo nativo "http".
// No usamos Express porque este entorno de referencia no tiene acceso
// a internet para instalar dependencias; esta implementación cubre lo
// que la tienda necesita: rutas con parámetros, middlewares, body JSON,
// cookies y manejo de errores centralizado.
import { ApiError, sendJson } from './utils/response.js';

function compilePath(pattern) {
  const paramNames = [];
  const regexStr = pattern
    .replace(/\/+$/, '')
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${regexStr || ''}/?$`), paramNames };
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = decodeURIComponent(pair.slice(idx + 1).trim());
    cookies[key] = value;
  }
  return cookies;
}

const MAX_BODY_BYTES = 15 * 1024 * 1024; // 15MB (suficiente para imágenes en base64)

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw new ApiError(413, 'El cuerpo de la petición es demasiado grande (máximo 15MB).');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf-8');
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      throw new ApiError(400, 'JSON inválido en el cuerpo de la petición');
    }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return {};
}

export class Router {
  constructor() {
    this.routes = [];
  }

  #add(method, pattern, handlers) {
    const { regex, paramNames } = compilePath(pattern);
    this.routes.push({ method, regex, paramNames, handlers });
  }

  get(pattern, ...handlers) { this.#add('GET', pattern, handlers); }
  post(pattern, ...handlers) { this.#add('POST', pattern, handlers); }
  put(pattern, ...handlers) { this.#add('PUT', pattern, handlers); }
  patch(pattern, ...handlers) { this.#add('PATCH', pattern, handlers); }
  delete(pattern, ...handlers) { this.#add('DELETE', pattern, handlers); }

  async handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname.replace(/\/+$/, '') || '/');

    req.query = Object.fromEntries(url.searchParams);
    req.cookies = parseCookies(req.headers.cookie);

    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const match = route.regex.exec(pathname === '' ? '/' : pathname);
      if (!match) continue;

      req.params = {};
      route.paramNames.forEach((name, i) => { req.params[name] = match[i + 1]; });

      try {
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          req.body = await readBody(req);
        } else {
          req.body = {};
        }
        for (const handler of route.handlers) {
          // eslint-disable-next-line no-await-in-loop
          const result = await handler(req, res);
          if (res.writableEnded || result === 'stop') return;
        }
      } catch (err) {
        this.#handleError(err, res);
      }
      return;
    }

    sendJson(res, 404, { error: 'Ruta no encontrada' });
  }

  #handleError(err, res) {
    if (err instanceof ApiError) {
      sendJson(res, err.statusCode, { error: err.message, details: err.details });
      return;
    }
    console.error('Error interno:', err);
    sendJson(res, 500, { error: 'Error interno del servidor' });
  }
}
