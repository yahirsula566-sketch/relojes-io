import { cart } from './cart.js';
import { variantImage } from './img.js';

const root = document.getElementById('cart-root');

function money(n) { return `Q${n.toFixed(2)}`; }

function render() {
  const lines = cart.getLines();

  if (lines.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <h3>Tu carrito está vacío</h3>
        <p>Explora el catálogo y encuentra tu próximo reloj.</p>
        <a href="/catalogo.html" class="btn btn-primary">Ir al catálogo</a>
      </div>`;
    return;
  }

  const subtotal = cart.subtotal();

  root.innerHTML = `
    <div class="cart-layout">
      <div>
        ${lines.map((l) => `
          <div class="cart-line fade-in" data-variant="${l.variantId}">
            <div class="thumb"><img src="${l.colorHex ? variantImage(l.colorHex, l.styleName) : ''}" alt=""></div>
            <div class="info">
              <h4>${l.productName}</h4>
              <div class="variant">${l.styleName} · ${l.colorName} · SKU ${l.sku}</div>
              <div class="qty-selector" style="margin-top:10px;">
                <button type="button" class="qty-dec">−</button>
                <input type="number" class="qty-input" value="${l.quantity}" min="1">
                <button type="button" class="qty-inc">+</button>
              </div>
            </div>
            <div class="right">
              <strong>${money(l.price * l.quantity)}</strong>
              <span class="remove-link" role="button">Eliminar</span>
            </div>
          </div>
        `).join('')}
        <button class="btn btn-sm" id="clear-cart" style="margin-top:16px;background:transparent;color:var(--text-muted);">Vaciar carrito</button>
      </div>

      <aside class="cart-summary">
        <h3 style="margin-top:0;">Resumen</h3>
        <div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div>
        <div class="summary-row"><span>Envío</span><span>Se calcula en checkout</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(subtotal)}</span></div>
        <a href="/checkout.html" class="btn btn-primary btn-block" style="margin-top:18px;">Continuar a checkout</a>
      </aside>
    </div>
  `;

  wireEvents();
}

function wireEvents() {
  root.querySelectorAll('.cart-line').forEach((lineEl) => {
    const variantId = Number(lineEl.dataset.variant);
    const input = lineEl.querySelector('.qty-input');

    lineEl.querySelector('.qty-dec').addEventListener('click', () => {
      const q = Math.max(1, Number(input.value) - 1);
      cart.updateQuantity(variantId, q);
    });
    lineEl.querySelector('.qty-inc').addEventListener('click', () => {
      const q = Number(input.value) + 1;
      cart.updateQuantity(variantId, q);
    });
    input.addEventListener('change', () => {
      const q = Math.max(1, Number(input.value) || 1);
      cart.updateQuantity(variantId, q);
    });
    lineEl.querySelector('.remove-link').addEventListener('click', () => {
      cart.removeLine(variantId);
    });
  });

  document.getElementById('clear-cart')?.addEventListener('click', () => cart.clear());
}

document.addEventListener('cart:changed', render);
render();
