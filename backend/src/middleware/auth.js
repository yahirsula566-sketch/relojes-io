import { authService } from '../services/authService.js';

/** Middleware: exige sesión de administrador válida antes de continuar. */
export function requireAdmin(req) {
  req.admin = authService.requireAdmin(req);
}
