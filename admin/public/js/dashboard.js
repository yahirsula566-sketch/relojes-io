import { adminApi } from './api.js';
import { requireSession } from './layout.js';

const root = document.getElementById('dashboard-root');
const money = (n) => `Q${Number(n).toFixed(2)}`;

const STATUS_LABELS = {
  pending: 'Pendiente', paid: 'Pagado', processing: 'Procesando',
  shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
};

async function init() {
  await requireSession();
  try {
    const { data } = await adminApi.dashboard();
    root.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Ventas totales (pagadas)</div><div class="value">${money(data.totalSales)}</div></div>
        <div class="stat-card"><div class="label">Pedidos totales</div><div class="value">${data.totalOrders}</div></div>
        <div class="stat-card"><div class="label">Pedidos pendientes</div><div class="value">${data.pendingOrders}</div></div>
        <div class="stat-card"><div class="label">Productos</div><div class="value">${data.totalProducts}</div></div>
      </div>

      <div class="panel">
        <h3>Stock bajo (≤ 5 unidades)</h3>
        ${data.lowStock.length === 0 ? '<p>No hay variantes con stock bajo.</p>' : `
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Producto</th><th>Estilo / Color</th><th>SKU</th><th>Stock</th></tr></thead>
          <tbody>
            ${data.lowStock.map((v) => `
              <tr>
                <td>${v.product_name}</td>
                <td>${v.style_name} / ${v.color_name}</td>
                <td>${v.sku}</td>
                <td><span class="badge ${v.stock === 0 ? 'badge-out' : 'badge-low'}">${v.stock}</span></td>
              </tr>`).join('')}
          </tbody>
        </table></div>`}
      </div>

      <div class="panel">
        <h3>Pedidos recientes</h3>
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>#</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${data.recentOrders.map((o) => `
              <tr>
                <td><a href="pedidos.html?id=${o.id}">#${o.id}</a></td>
                <td>${o.customer_name}</td>
                <td>${money(o.total)}</td>
                <td><span class="status-pill status-${o.order_status}">${STATUS_LABELS[o.order_status] || o.order_status}</span></td>
                <td>${new Date(o.created_at).toLocaleDateString('es-GT')}</td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    `;
  } catch (err) {
    root.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

init();
