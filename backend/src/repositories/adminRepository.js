import { db } from '../db/connection.js';
import { sha256 } from '../utils/hash.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 horas

export const adminRepository = {
  findByEmail(email) {
    return db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email);
  },

  create({ email, hash, salt }) {
    const info = db.prepare(`
      INSERT INTO admin_users (email, password_hash, password_salt) VALUES (?, ?, ?)
    `).run(email, hash, salt);
    return { id: info.lastInsertRowid, email };
  },

  createSession(adminUserId, rawToken) {
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    db.prepare(`
      INSERT INTO sessions (token, admin_user_id, expires_at) VALUES (?, ?, ?)
    `).run(tokenHash, adminUserId, expiresAt);
    return expiresAt;
  },

  getSession(rawToken) {
    const tokenHash = sha256(rawToken);
    const session = db.prepare(`
      SELECT s.*, a.email FROM sessions s
      JOIN admin_users a ON a.id = s.admin_user_id
      WHERE s.token = ?
    `).get(tokenHash);
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      this.deleteSession(rawToken);
      return null;
    }
    return session;
  },

  deleteSession(rawToken) {
    const tokenHash = sha256(rawToken);
    db.prepare('DELETE FROM sessions WHERE token = ?').run(tokenHash);
  },

  purgeExpiredSessions() {
    db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  },
};
