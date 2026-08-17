import { api } from './api.js';
import { variantImage, categoryIcon } from './img.js';

const PALETTE = ['#b8925a', '#1E3A8A', '#DC2626', '#16A34A', '#6D28D9', '#111111', '#8A8D8F'];
function colorForProduct(p) {
  return PALETTE[p.id % PALETTE.length];
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

async function loadFeatured() {
  const grid = document.getElementById('featured-grid');
  try {
    const { data } = await api.getProducts({ featured: 'true', pageSize: 4 });
    grid.innerHTML = data.length
      ? data.map(productCardHtml).join('')
      : '<p>No hay productos destacados por ahora.</p>';
  } catch (err) {
    grid.innerHTML = `<div class="alert alert-error">No se pudieron cargar los destacados: ${err.message}</div>`;
  }
}

async function loadCategories() {
  const grid = document.getElementById('category-grid');
  try {
    const { data } = await api.getCategories();
    grid.innerHTML = data.map((c) => `
      <a class="cat-card fade-in" href="/catalogo.html?category=${c.slug}">
        <div class="icon"><img src="${categoryIcon()}" alt="" width="24" height="24"></div>
        <h3 style="font-size:1.05rem;">${c.name}</h3>
        <p style="margin:0;font-size:.86rem;">Ver colección</p>
      </a>
    `).join('');
  } catch {
    grid.innerHTML = '';
  }
}

const heroVisual = document.getElementById('hero-visual');
if (heroVisual) {
  heroVisual.innerHTML = `<img src="${variantImage('#b8925a', 'Pro')}" alt="Smartwatch destacado" style="width:70%;">`;
}

loadFeatured();
loadCategories();
