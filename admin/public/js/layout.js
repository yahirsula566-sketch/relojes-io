import { adminApi } from './api.js';

document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('watchstore_theme', next);
    document.querySelectorAll('[data-theme-icon]').forEach((el) => { el.textContent = next === 'dark' ? '☀️' : '🌙'; });
  });
});
document.querySelectorAll('[data-theme-icon]').forEach((el) => {
  el.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
});

document.getElementById('logout-link')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await adminApi.logout();
  window.location.href = '/admin/login.html';
});

/** Protege una página admin: redirige a login si no hay sesión. */
export async function requireSession() {
  try {
    const { data } = await adminApi.me();
    return data.admin;
  } catch {
    window.location.href = '/admin/login.html';
    return null;
  }
}
