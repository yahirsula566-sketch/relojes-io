// Cliente ligero para hablar con la API del backend.
const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  let body = null;
  try { body = await res.json(); } catch { /* respuesta sin cuerpo */ }
  if (!res.ok) {
    const message = body?.error || `Error ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.details = body?.details;
    throw err;
  }
  return body;
}

export const api = {
  getCategories: () => request('/categories'),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (slug) => request(`/products/${slug}`),
  validateCart: (items) => request('/cart/validate', { method: 'POST', body: JSON.stringify({ items }) }),
  checkout: (payload) => request('/checkout', { method: 'POST', body: JSON.stringify(payload) }),
  getOrder: (id) => request(`/orders/${id}`),
};
