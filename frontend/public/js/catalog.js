import { api } from './api.js';
import { variantImage } from './img.js';

const PALETTE = ['#b8925a', '#1E3A8A', '#DC2626', '#16A34A', '#6D28D9', '#111111', '#8A8D8F'];
const colorForProduct = (p) => PALETTE[p.id % PALETTE.length];

const grid = document.getElementById('product-grid');
const resultCount = document.getElementById('result-count');
const catalogTitle = document.getElementById('catalog-title');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const minInput = document.getElementById('filter-min');
const maxInput = document.getElementById('filter-max');
const featuredCheckbox = document.getElementById('filter-featured');
const categoriesContainer = document.getElementById('filter-categories');

function currentParams() {
  return new URLSearchParams(window.location.search);
}

function productCardHtml(p) {
  const img = (p.images && p.images.length > 0) ? p.images[0] : variantImage(colorForProduct(p), p.name);
  return `
    <a class="product-card fade-in" href="/producto.html?slug=${p.slug}">
      <div class="thumb"><img src="${img}" alt="${p.name}" loading="lazy"></div>
      <div class="body">
        ${p.featured ? '<span class="badge badge-featured" style="align-self:flex-start;">Destacado</span>' : ''}
        <span class="cat">${p.categoryName || 'Relojes'}</span>
        <h3>${p.name}</h3>
        <span class="price">Q${p.basePrice.toFixed(2)}</span>
      </div>
    </a>`;
}

async function loadCategoryFilters(activeSlug) {
  try {
    const { data } = await api.getCategories();
    categoriesContainer.innerHTML = `
      <label class="filter-option">
        <input type="radio" name="cat" value="" ${!activeSlug ? 'checked' : ''}> Todas
      </label>
      ${data.map((c) => `
        <label class="filter-option">
          <input type="radio" name="cat" value="${c.slug}" ${activeSlug === c.slug ? 'checked' : ''}> ${c.name}
        </label>`).join('')}
    `;
  } catch { /* silencioso: filtros no son críticos */ }
}

async function loadProducts() {
  const params = currentParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const featured = params.get('featured') || '';
  const sort = params.get('sort') || '';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';

  searchInput.value = q;
  sortSelect.value = sort;
  minInput.value = minPrice;
  maxInput.value = maxPrice;
  featuredCheckbox.checked = featured === 'true';
  catalogTitle.textContent = q ? `Resultados para “${q}”` : 'Catálogo';

  grid.innerHTML = '<div class="loading-row"><span class="spinner"></span> Cargando productos…</div>';

  try {
    const { data, meta } = await api.getProducts({
      q, category, featured, sort, minPrice, maxPrice, pageSize: 24,
    });
    resultCount.textContent = `${meta.total} producto${meta.total === 1 ? '' : 's'}`;
    grid.innerHTML = data.length
      ? data.map(productCardHtml).join('')
      : `<div class="empty-state"><h3>Sin resultados</h3><p>Intenta con otra búsqueda o quita algunos filtros.</p></div>`;
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">No se pudieron cargar los productos: ${err.message}</div>`;
  }

  loadCategoryFilters(category);
}

function applyFilters() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
  const checkedCat = categoriesContainer.querySelector('input[name="cat"]:checked');
  if (checkedCat && checkedCat.value) params.set('category', checkedCat.value);
  if (minInput.value) params.set('minPrice', minInput.value);
  if (maxInput.value) params.set('maxPrice', maxInput.value);
  if (featuredCheckbox.checked) params.set('featured', 'true');
  if (sortSelect.value) params.set('sort', sortSelect.value);
  window.location.search = params.toString();
}

document.getElementById('apply-filters').addEventListener('click', applyFilters);
document.getElementById('clear-filters').addEventListener('click', () => { window.location.href = '/catalogo.html'; });
sortSelect.addEventListener('change', applyFilters);

loadProducts();
