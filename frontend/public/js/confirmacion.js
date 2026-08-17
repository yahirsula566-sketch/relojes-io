import { api } from './api.js';

const root = document.getElementById('confirmation-root');
const params = new URLSearchParams(window.location.search);
const orderId = params.get('orderId');

const STATUS_LABELS = {
  pending: { text: 'Pago pendiente', cls: 'alert-error' },
  paid: { text: 'Pago aprobado', cls: 'alert-success' },
  processing: { text: 'En preparación', cls: 'alert-success' },
  shipped: { text: 'Enviado', cls: 'alert-success' },
  delivered: { text: 'Entregado', cls: 'alert-success' },
  cancelled: { text: 'Pago rechazado / cancelado', cls: 'alert-error' },
};

function money(n) { return `Q${Number(n).toFixed(2)}`; }

async function init() {
  if (!orderId) {
    root.innerHTML = '<div class="alert alert-error">No se especificó un pedido.</div>';
    return;
  }
  root.innerHTML = '<div class="loading-row"><span class="spinner"></span> Cargando tu pedido…</div>';
  try {
    const { data: order } = await api.getOrder(orderId);
    const status = STATUS_LABELS[order.order_status] || STATUS_LABELS.pending;
    root.innerHTML = `
      <div class="text-center" style="margin-bottom:24px;">
        <div style="font-size:3rem;">${order.order_status === 'paid' ? '✅' : '⏳'}</div>
        <h1>¡Gracias por tu compra, ${order.customer_name.split(' ')[0]}!</h1>
        <p>Pedido #${order.id}</p>
      </div>
      <div class="alert ${status.cls}">${status.text}</div>
      <div class="cart-summary" style="position:static;">
        <h3 style="margin-top:0;">Resumen del pedido</h3>
        ${order.items.map((i) => `
          <div class="order-line">
            <span>${i.product_name} · ${i.style_name} / ${i.color_name} × ${i.quantity} (SKU ${i.sku})</span>
            <span>${money(i.subtotal)}</span>
          </div>
        `).join('')}
        <div class="summary-row total"><span>Total</span><span>${money(order.total)}</span></div>
      </div>
      <div class="text-center" style="margin-top:26px;">
        <a href="/catalogo.html" class="btn btn-primary">Seguir comprando</a>
      </div>
    `;
  } catch (err) {
    root.innerHTML = `<div class="alert alert-error">No se pudo cargar el pedido: ${err.message}</div>`;
  }
}

init();
