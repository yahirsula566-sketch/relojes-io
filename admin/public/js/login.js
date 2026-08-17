import { adminApi } from './api.js';

const form = document.getElementById('login-form');
const alertBox = document.getElementById('login-alert');
const submitBtn = document.getElementById('login-submit');

// Si ya hay sesión activa, saltar directo al dashboard.
adminApi.me().then(() => { window.location.href = '/admin/index.html'; }).catch(() => {});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.innerHTML = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Entrando…';

  const formData = new FormData(form);
  try {
    await adminApi.login(formData.get('email'), formData.get('password'));
    window.location.href = '/admin/index.html';
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
  }
});
