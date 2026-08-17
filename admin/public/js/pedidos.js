import { adminApi } from './api.js';
import { requireSession } from './layout.js';

const listRoot = document.getElementById('orders-list-root');
const detailRoot = document.getElementById('order-detail-root');
const searchInput = document.getElementById('search-input');
const params = new URLSearchParams(window.location.search);

const money = (n) => `Q${Number(n).toFixed(2)}`;
const STATUS_LABELS = {
  pending: 'Pendiente', paid: 'Pagado', processing: 'Procesando',
  shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
};
const STATUS_FLOW = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

async function loadList(q = '') {
  listRoot.innerHTML = '<div class="loading-row"><span class="spinner"></span> Cargando pedidos…</div>';
  try {
    const { data } = await adminApi.listOrders({ q });
    if (data.length === 0) {
      listRoot.innerHTML = '<div class="empty-state"><p>No hay pedidos todavía.</p></div>';
      return;
    }
    listRoot.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Pago</th><th>Estado</th><th>Fecha</th><th></th></tr></thead>
        <tbody>
          ${data.map((o) => `
            <tr>
              <td>#${o.id}</td>
              <td>${o.customer_name}<br><small style="color:var(--text-muted);">${o.customer_email}</small></td>
              <td>${money(o.total)}</td>
              <td>${o.payment_status}</td>
              <td><span class="status-pill status-${o.order_status}">${STATUS_LABELS[o.order_status] || o.order_status}</span></td>
              <td>${new Date(o.created_at).toLocaleDateString('es-GT')}</td>
              <td><button class="btn btn-sm btn-outline" data-view="${o.id}">Ver</button></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `;
    listRoot.querySelectorAll('[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => loadDetail(btn.dataset.view));
    });
  } catch (err) {
    listRoot.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

async function loadDetail(id) {
  detailRoot.innerHTML = '<div class="loading-row"><span class="spinner"></span> Cargando pedido…</div>';
  try {
    const { data: order } = await adminApi.getOrder(id);
    detailRoot.innerHTML = `
      <div class="panel">
        <div class="admin-topbar" style="margin-bottom:14px;">
          <h3 style="margin:0;">Pedido #${order.id}</h3>
          <span class="status-pill status-${order.order_status}">${STATUS_LABELS[order.order_status] || order.order_status}</span>
        </div>
        <div class="form-grid">
          <div><strong>Cliente:</strong> ${order.customer_name}<br><small>${order.customer_email} · ${order.customer_phone || '—'}</small></div>
          <div><strong>Dirección:</strong> ${order.customer_address}, ${order.customer_city}</div>
        </div>
        <h4>Productos</h4>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Producto</th><th>Estilo</th><th>Color</th><th>SKU</th><th>Cant.</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${order.items.map((i) => `
              <tr><td>${i.product_name}</td><td>${i.style_name}</td><td>${i.color_name}</td><td>${i.sku}</td><td>${i.quantity}</td><td>${money(i.subtotal)}</td></tr>
            `).join('')}
          </tbody>
        </table></div>
        <p style="text-align:right;font-weight:700;margin-top:10px;">Total: ${money(order.total)}</p>

        <h4>Cambiar estado</h4>
        <div class="flex gap-8" style="flex-wrap:wrap;">
          ${STATUS_FLOW.map((s) => `<button class="link-tab ${order.order_status === s ? 'active' : ''}" data-set-status="${s}">${STATUS_LABELS[s]}</button>`).join('')}
        </div>
        <div id="order-action-alert" style="margin-top:12px;"></div>
      </div>
    `;
    detailRoot.querySelectorAll('[data-set-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const alertBox = document.getElementById('order-action-alert');
        try {
          await adminApi.updateOrderStatus(order.id, btn.dataset.setStatus);
          await loadDetail(order.id);
          await loadList(searchInput.value.trim());
        } catch (err) {
          alertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        }
      });
    });
  } catch (err) {
    detailRoot.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadList(searchInput.value.trim()), 300);
});

(async () => {
  await requireSession();
  await loadList();
  const preselect = params.get('id');
  if (preselect) loadDetail(preselect);
})();
