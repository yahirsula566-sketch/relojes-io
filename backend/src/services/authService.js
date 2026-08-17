import { adminRepository } from '../repositories/adminRepository.js';
import { hashPassword, verifyPassword, randomToken } from '../utils/hash.js';
import { unauthorized } from '../utils/response.js';

export const SESSION_COOKIE = 'watchstore_admin_session';

export const authService = {
  async login(email, password) {
    const admin = adminRepository.findByEmail(email);
    if (!admin) throw unauthorized('Credenciales inválidas');
    const valid = verifyPassword(password, admin.password_salt, admin.password_hash);
    if (!valid) throw unauthorized('Credenciales inválidas');

    const token = randomToken();
    const expiresAt = adminRepository.createSession(admin.id, token);
    return { token, expiresAt, admin: { id: admin.id, email: admin.email } };
  },

  logout(token) {
    if (token) adminRepository.deleteSession(token);
  },

  requireAdmin(req) {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) throw unauthorized('Sesión requerida');
    const session = adminRepository.getSession(token);
    if (!session) throw unauthorized('Sesión expirada o inválida');
    return { id: session.admin_user_id, email: session.email };
  },

  hashPassword,
};
