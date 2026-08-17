import { authService, SESSION_COOKIE } from '../services/authService.js';
import { ok, badRequest } from '../utils/response.js';
import { env } from '../utils/env.js';

function setSessionCookie(res, token, expiresAt) {
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}${secure}`
  );
}

export const authController = {
  async login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) throw badRequest('Correo y contraseña son obligatorios.');
    const { token, expiresAt, admin } = await authService.login(email, password);
    setSessionCookie(res, token, expiresAt);
    ok(res, { admin });
  },

  logout(req, res) {
    const token = req.cookies?.[SESSION_COOKIE];
    authService.logout(token);
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
    ok(res, { loggedOut: true });
  },

  me(req, res) {
    ok(res, { admin: req.admin });
  },
};
