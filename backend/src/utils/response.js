// Helpers para responder JSON de forma consistente en toda la API.
export function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function ok(res, data, meta) {
  sendJson(res, 200, meta ? { data, meta } : { data });
}

export function created(res, data) {
  sendJson(res, 201, { data });
}

export function noContent(res) {
  res.writeHead(204);
  res.end();
}

export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new ApiError(400, message, details);
}
export function unauthorized(message = 'No autenticado') {
  return new ApiError(401, message);
}
export function forbidden(message = 'No autorizado') {
  return new ApiError(403, message);
}
export function notFound(message = 'Recurso no encontrado') {
  return new ApiError(404, message);
}
export function conflict(message = 'Conflicto con el estado actual') {
  return new ApiError(409, message);
}
