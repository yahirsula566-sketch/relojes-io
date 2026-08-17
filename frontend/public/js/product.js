import { api } from './api.js';
import { cart } from './cart.js';
import { variantImage } from './img.js';

const root = document.getElementById('product-root');
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug');

let product = null;
let selectedStyleId = null;
let selectedVariant = null;
let quantity = 1;

function stockLabel(stock) {
  if (stock <= 0) return { text: 'Agotado', cls: 'stock-out' };
  if (stock <= 5) return { text: `¡Últimas ${stock} unidades!`, cls: 'stock-low' };
  return { text: 'En stock', cls: 'stock-ok' };
}

function render() {
  const styles = product.styles;
  const style = styles.find((s) => s.id === selectedStyleId) || styles[0];
  const variants = style.variants;
  const image = selectedVariant?.image
    ? selectedVariant.image
    : (product.images && product.images.length > 0)
      ? product.images[0]
      : variantImage(selectedVariant?.colorHex || '#8a8d8f', style.name);

  const price = selectedVariant?.price ?? product.basePrice;
  const stockInfo = selectedVariant ? stockLabel(selectedVariant.stock) : null;
  const maxQty = selectedVariant ? Math.min(selectedVariant.stock, 10) : 0;

  root.innerHTML = `
    <div class="product-page">
      <div>
        <div class="gallery-main"><img src="${image}" alt="${product.name} - ${style.name}"></div>
      </div>
      <div>
        <div class="pd-category">${product.categoryName || 'Relojes'}</div>
        <h1 class="pd-title">${product.name}</h1>
        <div class="pd-price">Q${price.toFixed(2)}</div>
        <div class="pd-sku">${selectedVariant ? `SKU: ${selectedVariant.sku}` : 'Selecciona una variante para ver el SKU'}</div>
        <p class="pd-desc">${product.description}</p>

        <div class="option-group">
          <label class="title">1. Elige tu estilo</label>
          <div class="style-options">
            ${styles.map((s) => `
              <button type="button" class="pill-option ${s.id === style.id ? 'selected' : ''}" data-style-id="${s.id}">${s.name}</button>
            `).join('')}
          </div>
        </div>

        <div class="option-group">
          <label class="title">2. Elige tu color</label>
          <div class="color-options">
            ${variants.map((v) => `
              <div title="${v.colorName}${v.stock <= 0 ? ' (agotado)' : ''}">
                <span class="color-swatch ${selectedVariant?.id === v.id ? 'selected' : ''} ${v.stock <= 0 || !v.active ? 'disabled' : ''}"
                      style="background:${v.colorHex}" data-variant-id="${v.id}">
                  ${v.stock <= 0 ? '<span class="check">✕</span>' : ''}
                </span>
              </div>
            `).join('')}
          </div>
          <div class="color-name-label">${selectedVariant ? selectedVariant.colorName : 'Ningún color seleccionado'}</div>
        </div>

        ${stockInfo ? `<div class="stock-line ${stockInfo.cls}">${stockInfo.text}</div>` : ''}

        <div class="option-group">
          <label class="title">3. Cantidad</label>
          <div class="qty-selector">
            <button type="button" id="qty-minus" ${!selectedVariant ? 'disabled' : ''}>−</button>
            <input type="number" id="qty-input" value="${quantity}" min="1" max="${maxQty || 1}" ${!selectedVariant ? 'disabled' : ''}>
            <button type="button" id="qty-plus" ${!selectedVariant ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <div class="pd-actions">
          <button class="btn btn-primary" id="add-to-cart" ${!selectedVariant || selectedVariant.stock <= 0 ? 'disabled' : ''}>
            🛒 Agregar al carrito
          </button>
          <span id="add-feedback" style="color: var(--success); font-weight:600; font-size:.9rem;"></span>
        </div>

        <div class="pd-meta-list">
          <div><span>Categoría</span><span>${product.categoryName || '—'}</span></div>
          <div><span>Estilo</span><span>${style.name}</span></div>
          <div><span>Color</span><span>${selectedVariant?.colorName || '—'}</span></div>
          <div><span>Disponibilidad</span><span>${selectedVariant ? `${selectedVariant.stock} unidades` : '—'}</span></div>
        </div>
      </div>
    </div>
  `;

  wireEvents(style);
}

function wireEvents(style) {
  root.querySelectorAll('[data-style-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const newStyleId = Number(btn.dataset.styleId);
      if (newStyleId === selectedStyleId) return;
      selectedStyleId = newStyleId;
      const newStyle = product.styles.find((s) => s.id === newStyleId);
      // Si el color seleccionado no existe en el nuevo estilo, limpiar selección.
      const stillValid = newStyle.variants.find((v) => v.colorName === selectedVariant?.colorName && v.stock > 0);
      selectedVariant = stillValid || null;
      quantity = 1;
      render();
    });
  });

  root.querySelectorAll('[data-variant-id]').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.classList.contains('disabled')) return;
      const variantId = Number(el.dataset.variantId);
      selectedVariant = style.variants.find((v) => v.id === variantId);
      quantity = 1;
      render();
    });
  });

  const qtyInput = document.getElementById('qty-input');
  document.getElementById('qty-minus')?.addEventListener('click', () => {
    quantity = Math.max(1, quantity - 1);
    qtyInput.value = quantity;
  });
  document.getElementById('qty-plus')?.addEventListener('click', () => {
    const max = selectedVariant ? selectedVariant.stock : 1;
    quantity = Math.min(max, quantity + 1);
    qtyInput.value = quantity;
  });
  qtyInput?.addEventListener('change', () => {
    const max = selectedVariant ? selectedVariant.stock : 1;
    quantity = Math.min(max, Math.max(1, Number(qtyInput.value) || 1));
    qtyInput.value = quantity;
  });

  document.getElementById('add-to-cart')?.addEventListener('click', () => {
    if (!selectedVariant) return;
    cart.addLine({
      variantId: selectedVariant.id,
      productSlug: product.slug,
      productName: product.name,
      styleName: style.name,
      colorName: selectedVariant.colorName,
      colorHex: selectedVariant.colorHex,
      sku: selectedVariant.sku,
      price: selectedVariant.price,
      quantity,
    });
    const feedback = document.getElementById('add-feedback');
    feedback.textContent = '✓ Agregado al carrito';
    setTimeout(() => { feedback.textContent = ''; }, 2500);
  });
}

async function init() {
  if (!slug) {
    root.innerHTML = '<div class="alert alert-error">Producto no especificado.</div>';
    return;
  }
  try {
    const { data } = await api.getProduct(slug);
    product = data;
    document.title = `${product.name} — Chronos`;
    if (product.styles.length) {
      selectedStyleId = product.styles[0].id;
      selectedVariant = product.styles[0].variants.find((v) => v.stock > 0) || null;
    }
    render();
  } catch (err) {
    root.innerHTML = `<div class="alert alert-error">No se pudo cargar el producto: ${err.message}</div>`;
  }
}

init();
