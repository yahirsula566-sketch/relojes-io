const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });

  if (res.status === 401) {
    if (!window.location.pathname.endsWith('/admin/login.html')) {
      window.location.href = '/admin/login.html';
    }
    throw new Error('Sesión requerida');
  }

  let body = null;
  try { body = await res.json(); } catch { /* sin cuerpo */ }
  if (!res.ok) {
    const err = new Error(body?.error || `Error ${res.status}`);
    err.status = res.status;
    err.details = body?.details;
    throw err;
  }
  return body;
}

export const adminApi = {
  login: (email, password) => request('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/admin/auth/logout', { method: 'POST' }),
  me: () => request('/admin/auth/me'),

  dashboard: () => request('/admin/dashboard'),

  uploadImage: (dataUrl) => request('/admin/uploads', { method: 'POST', body: JSON.stringify({ dataUrl }) }),

  listProducts: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/admin/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (id) => request(`/admin/products/${id}`),
  createProduct: (payload) => request('/admin/products', { method: 'POST', body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),

  createStyle: (productId, payload) => request(`/admin/products/${productId}/styles`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteStyle: (styleId) => request(`/admin/styles/${styleId}`, { method: 'DELETE' }),

  createVariant: (productId, payload) => request(`/admin/products/${productId}/variants`, { method: 'POST', body: JSON.stringify(payload) }),
  updateVariant: (variantId, payload) => request(`/admin/variants/${variantId}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteVariant: (variantId) => request(`/admin/variants/${variantId}`, { method: 'DELETE' }),

  listOrders: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request(`/admin/orders${qs ? `?${qs}` : ''}`);
  },
  getOrder: (id) => request(`/admin/orders/${id}`),
  updateOrderStatus: (id, orderStatus) => request(`/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ orderStatus }) }),
};
