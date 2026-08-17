import { adminApi } from './api.js';
import { requireSession } from './layout.js';

// Convierte un File del input a un "data URL" (base64) que el backend
// puede decodificar y guardar como archivo real en frontend/public/img/uploads.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function renderProductImages() {
  const root = document.getElementById('product-images-root');
  const images = currentProduct.images || [];
  root.innerHTML = images.length
    ? images.map((url, i) => `
        <div class="image-thumb">
          <img src="${url}" alt="Imagen ${i + 1}">
          <button type="button" class="remove-thumb" data-remove-image="${i}" title="Quitar">✕</button>
        </div>`).join('')
    : '<p style="font-size:.84rem;color:var(--text-muted);">Sin imagen propia todavía — se usa una ilustración generada.</p>';

  root.querySelectorAll('[data-remove-image]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.removeImage);
      const images2 = currentProduct.images.filter((_, i) => i !== idx);
      const { data } = await adminApi.updateProduct(currentProduct.id, { images: images2 });
      currentProduct = { ...currentProduct, ...data };
      renderProductImages();
    });
  });
}

document.getElementById('product-image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !currentProduct) return;
  const status = document.getElementById('image-upload-status');
  status.textContent = 'Subiendo…';
  try {
    const dataUrl = await fileToDataUrl(file);
    const { data } = await adminApi.uploadImage(dataUrl);
    const images = [...(currentProduct.images || []), data.url];
    const res = await adminApi.updateProduct(currentProduct.id, { images });
    currentProduct = { ...currentProduct, ...res.data };
    renderProductImages();
    status.textContent = '✓ Imagen agregada';
    setTimeout(() => { status.textContent = ''; }, 2000);
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  } finally {
    e.target.value = '';
  }
});

const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const form = document.getElementById('product-form');
const alertBox = document.getElementById('product-alert');
const variantsSection = document.getElementById('variants-section');
const stylesRoot = document.getElementById('styles-root');
const categorySelect = document.getElementById('category-select');

let currentProduct = null;

async function loadCategories(selectedId) {
  try {
    const res = await fetch('/api/categories');
    const { data } = await res.json();
    categorySelect.innerHTML = data.map((c) => `<option value="${c.id}" ${String(c.id) === String(selectedId) ? 'selected' : ''}>${c.name}</option>`).join('');
  } catch { /* categorías no son críticas para continuar */ }
}

function fillForm(product) {
  form.name.value = product.name;
  form.basePrice.value = product.basePrice;
  form.description.value = product.description || '';
  form.active.checked = product.active;
  form.featured.checked = product.featured;
}

function renderStyles() {
  const styles = currentProduct.styles || [];
  stylesRoot.innerHTML = styles.length ? styles.map((style) => `
    <div class="style-editor" data-style-id="${style.id}">
      <div class="style-header">
        <strong>${style.name}</strong>
        <button class="btn btn-sm" data-delete-style="${style.id}" style="background:transparent;color:var(--danger);">Eliminar estilo</button>
      </div>
      ${style.variants.map((v) => `
        <div class="variant-row" data-variant-id="${v.id}">
          <span style="width:20px;height:20px;border-radius:50%;background:${v.colorHex};display:inline-block;border:1px solid var(--border);"></span>
          <span>${v.colorName}<br><small style="color:var(--text-muted);">${v.sku}</small></span>
          <input type="number" class="v-price" value="${v.price}" step="0.01" min="0" title="Precio">
          <input type="number" class="v-stock" value="${v.stock}" min="0" title="Stock">
          <label class="filter-option" style="justify-content:center;"><input type="checkbox" class="v-active" ${v.active ? 'checked' : ''}> Activa</label>
          <label class="variant-image-btn ${v.image ? 'has-image' : ''}" title="${v.image ? 'Cambiar foto de esta variante' : 'Subir foto para esta variante'}">
            📷<input type="file" class="v-image-input" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" style="display:none;">
          </label>
          <button data-delete-variant="${v.id}" class="btn btn-sm" style="background:transparent;color:var(--danger);" title="Eliminar">✕</button>
        </div>
      `).join('')}
      <form class="add-variant-form" data-style-id="${style.id}" style="display:grid;grid-template-columns:1fr 1fr 1fr .8fr .8fr auto;gap:8px;margin-top:12px;">
        <input name="colorName" placeholder="Color (ej. Negro)" required>
        <input name="colorHex" type="color" value="#333333" title="Color hex">
        <input name="sku" placeholder="SKU único" required>
        <input name="price" type="number" step="0.01" min="0" placeholder="Precio" required>
        <input name="stock" type="number" min="0" placeholder="Stock" value="0" required>
        <button type="submit" class="btn btn-sm btn-outline">+ Color</button>
      </form>
    </div>
  `).join('') : '<p>Este producto todavía no tiene estilos. Agrega el primero abajo.</p>';

  wireStyleEvents();
}

function wireStyleEvents() {
  stylesRoot.querySelectorAll('[data-delete-style]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este estilo y todas sus variantes?')) return;
      await adminApi.deleteStyle(btn.dataset.deleteStyle);
      await reloadProduct();
    });
  });

  stylesRoot.querySelectorAll('[data-delete-variant]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta variante?')) return;
      await adminApi.deleteVariant(btn.dataset.deleteVariant);
      await reloadProduct();
    });
  });

  stylesRoot.querySelectorAll('.variant-row').forEach((row) => {
    const variantId = row.dataset.variantId;
    const save = async () => {
      await adminApi.updateVariant(variantId, {
        price: Number(row.querySelector('.v-price').value),
        stock: Number(row.querySelector('.v-stock').value),
        active: row.querySelector('.v-active').checked,
      });
    };
    row.querySelector('.v-price').addEventListener('change', save);
    row.querySelector('.v-stock').addEventListener('change', save);
    row.querySelector('.v-active').addEventListener('change', save);

    row.querySelector('.v-image-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        const { data } = await adminApi.uploadImage(dataUrl);
        await adminApi.updateVariant(variantId, { image: data.url });
        await reloadProduct();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  stylesRoot.querySelectorAll('.add-variant-form').forEach((f) => {
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      try {
        await adminApi.createVariant(currentProduct.id, {
          styleId: Number(f.dataset.styleId),
          colorName: fd.get('colorName'),
          colorHex: fd.get('colorHex'),
          sku: fd.get('sku'),
          price: Number(fd.get('price')),
          stock: Number(fd.get('stock')),
          active: true,
        });
        await reloadProduct();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function reloadProduct() {
  const { data } = await adminApi.getProduct(currentProduct.id);
  currentProduct = data;
  renderStyles();
}

document.getElementById('add-style-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = e.target.styleName.value.trim();
  if (!name) return;
  await adminApi.createStyle(currentProduct.id, { name });
  e.target.reset();
  await reloadProduct();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.innerHTML = '';
  const saveBtn = document.getElementById('save-product-btn');
  saveBtn.disabled = true;

  const payload = {
    name: form.name.value.trim(),
    basePrice: Number(form.basePrice.value),
    description: form.description.value.trim(),
    categoryId: form.categoryId.value ? Number(form.categoryId.value) : null,
    active: form.active.checked,
    featured: form.featured.checked,
  };

  try {
    if (currentProduct) {
      const { data } = await adminApi.updateProduct(currentProduct.id, payload);
      currentProduct = { ...currentProduct, ...data };
      alertBox.innerHTML = '<div class="alert alert-success">Producto actualizado.</div>';
    } else {
      const { data } = await adminApi.createProduct(payload);
      window.location.href = `producto-editar.html?id=${data.id}`;
      return;
    }
  } catch (err) {
    alertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  } finally {
    saveBtn.disabled = false;
  }
});

async function init() {
  await requireSession();
  await loadCategories();

  if (productId) {
    document.getElementById('page-title').textContent = 'Editar producto';
    try {
      const { data } = await adminApi.getProduct(productId);
      currentProduct = data;
      fillForm(data);
      await loadCategories(data.categoryId);
      variantsSection.style.display = 'block';
      renderProductImages();
      renderStyles();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  }
}

init();
