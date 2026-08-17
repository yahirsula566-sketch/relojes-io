// El carrito vive en localStorage del navegador. Guarda la variante
// exacta seleccionada (no solo productId), tal como exige el flujo de
// estilo -> color -> variante de la tienda.
const CART_KEY = 'watchstore_cart_v1';

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(lines) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
  document.dispatchEvent(new CustomEvent('cart:changed', { detail: { lines } }));
}

function lineKey(line) {
  return `${line.variantId}`;
}

export const cart = {
  getLines: readCart,

  addLine({ variantId, productSlug, productName, styleName, colorName, colorHex, sku, price, quantity }) {
    const lines = readCart();
    const existing = lines.find((l) => l.variantId === variantId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      lines.push({ variantId, productSlug, productName, styleName, colorName, colorHex, sku, price, quantity });
    }
    writeCart(lines);
  },

  updateQuantity(variantId, quantity) {
    let lines = readCart();
    if (quantity <= 0) {
      lines = lines.filter((l) => l.variantId !== variantId);
    } else {
      lines = lines.map((l) => (l.variantId === variantId ? { ...l, quantity } : l));
    }
    writeCart(lines);
  },

  removeLine(variantId) {
    const lines = readCart().filter((l) => l.variantId !== variantId);
    writeCart(lines);
  },

  clear() {
    writeCart([]);
  },

  count() {
    return readCart().reduce((sum, l) => sum + l.quantity, 0);
  },

  subtotal() {
    return Math.round(readCart().reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100;
  },
};

export { lineKey };
