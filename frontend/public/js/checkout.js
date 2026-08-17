import { api } from './api.js';
import { cart } from './cart.js';

const root = document.getElementById('checkout-root');

function money(n) { return `Q${n.toFixed(2)}`; }

function formHtml(validated) {
  return `
    <div class="checkout-layout">
      <form id="checkout-form" novalidate>
        <h3 style="margin-top:0;">Datos de envío</h3>
        <div class="form-grid">
          <div class="field"><label>Nombre completo</label><input name="name" required></div>
          <div class="field"><label>Correo electrónico</label><input type="email" name="email" required></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Teléfono</label><input name="phone"></div>
          <div class="field"><label>Ciudad / Municipio</label><input name="city" required></div>
        </div>
        <div class="field"><label>Dirección</label><input name="address" required></div>

        <h3>Método de pago</h3>
        <p style="font-size:.88rem;">Se procesará con <strong>Mock Payment</strong> (modo de prueba). El pago se aprueba automáticamente para poder probar el flujo completo del pedido.</p>

        <div id="checkout-alert"></div>
        <button type="submit" class="btn btn-primary btn-block" id="submit-btn">Confirmar y pagar ${money(validated.total)}</button>
      </form>

      <aside class="cart-summary">
        <h3 style="margin-top:0;">Tu pedido</h3>
        ${validated.lines.map((l) => `
          <div class="order-line">
            <span>${l.productName} · ${l.styleName} / ${l.colorName} × ${l.quantity}</span>
            <span>${money(l.subtotal)}</span>
          </div>
        `).join('')}
        <div class="summary-row total"><span>Total</span><span>${money(validated.total)}</span></div>
      </aside>
    </div>
  `;
}

async function init() {
  const lines = cart.getLines();
  if (lines.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>No hay nada que pagar todavía</h3>
        <p>Tu carrito está vacío.</p>
        <a href="/catalogo.html" class="btn btn-primary">Ir al catálogo</a>
      </div>`;
    return;
  }

  root.innerHTML = '<div class="loading-row"><span class="spinner"></span> Verificando disponibilidad…</div>';

  let validated;
  try {
    const items = lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
    const res = await api.validateCart(items);
    validated = res.data;
  } catch (err) {
    root.innerHTML = `
      <div class="alert alert-error">${err.message}</div>
      <a href="/carrito.html" class="btn btn-outline">Revisar carrito</a>`;
    return;
  }

  root.innerHTML = formHtml(validated);

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('checkout-alert');
    const submitBtn = document.getElementById('submit-btn');
    alertBox.innerHTML = '';
    const formData = new FormData(e.target);
    const customer = Object.fromEntries(formData.entries());

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Procesando…';

    try {
      const items = lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
      const { data } = await api.checkout({ customer, items });
      cart.clear();
      window.location.href = data.redirectUrl || `/pedido-confirmado.html?orderId=${data.order.id}`;
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      submitBtn.disabled = false;
      submitBtn.textContent = `Confirmar y pagar ${money(validated.total)}`;
    }
  });
}

init();
