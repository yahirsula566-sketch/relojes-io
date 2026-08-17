import { adminApi } from './api.js';
import { requireSession } from './layout.js';

const root = document.getElementById('products-root');
const searchInput = document.getElementById('search-input');
const money = (n) => `Q${Number(n).toFixed(2)}`;

async function load(q = '') {
  root.innerHTML = '<div class="loading-row"><span class="spinner"></span> Cargando…</div>';
  try {
    const { data } = await adminApi.listProducts({ q });
    if (data.length === 0) {
      root.innerHTML = '<div class="empty-state"><p>No hay productos todavía.</p></div>';
      return;
    }
    root.innerHTML = `
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Producto</th><th>Categoría</th><th>Precio base</th><th>Estado</th><th>Destacado</th><th></th></tr></thead>
        <tbody>
          ${data.map((p) => `
            <tr>
              <td>${p.name}</td>
              <td>${p.categoryName || '—'}</td>
              <td>${money(p.basePrice)}</td>
              <td><span class="status-pill ${p.active ? 'status-paid' : 'status-cancelled'}">${p.active ? 'Activo' : 'Inactivo'}</span></td>
              <td>${p.featured ? '⭐' : '—'}</td>
              <td><a href="producto-editar.html?id=${p.id}" class="btn btn-outline btn-sm">Editar</a></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
    `;
  } catch (err) {
    root.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
}

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => load(searchInput.value.trim()), 300);
});

(async () => { await requireSession(); load(); })();
