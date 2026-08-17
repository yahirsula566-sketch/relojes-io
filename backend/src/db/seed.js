// Inserta datos de ejemplo: categorías, productos de relojes/smartwatches
// con sus estilos, colores y variantes, y un usuario administrador inicial.
// Uso: npm run seed
import { db } from './connection.js';
import { hashPassword } from '../utils/hash.js';
import { env } from '../utils/env.js';
import { productRepository } from '../repositories/productRepository.js';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function seedCategories() {
  const categories = [
    { name: 'Smartwatches', slug: 'smartwatches' },
    { name: 'Relojes Clásicos', slug: 'relojes-clasicos' },
    { name: 'Relojes Deportivos', slug: 'relojes-deportivos' },
    { name: 'Ediciones Limitadas', slug: 'ediciones-limitadas' },
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)');
  for (const c of categories) insert.run(c.name, c.slug);
  return Object.fromEntries(
    db.prepare('SELECT slug, id FROM categories').all().map((r) => [r.slug, r.id])
  );
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(env.ADMIN_EMAIL);
  if (existing) return;
  const { hash, salt } = hashPassword(env.ADMIN_PASSWORD);
  db.prepare('INSERT INTO admin_users (email, password_hash, password_salt) VALUES (?, ?, ?)')
    .run(env.ADMIN_EMAIL, hash, salt);
  console.log(`👤 Admin creado: ${env.ADMIN_EMAIL} (contraseña definida en .env)`);
}

/**
 * Crea un producto con sus estilos y variantes.
 * styleDefs: [{ name, colors: [{ name, hex, sku, price, stock }] }]
 */
function seedProductWithVariants({ name, description, basePrice, categoryId, featured, styleDefs }) {
  const slug = slugify(name);
  const existing = productRepository.getProductBySlug(slug, { includeInactive: true });
  if (existing) return existing;

  const product = productRepository.createProduct({
    name, slug, description, basePrice, categoryId, images: [], active: true, featured,
  });

  styleDefs.forEach((style, styleIndex) => {
    const createdStyle = productRepository.createStyle(product.id, style.name, styleIndex);
    style.colors.forEach((color) => {
      const colorRow = productRepository.findOrCreateColor(color.name, color.hex);
      productRepository.createVariant({
        productId: product.id,
        styleId: createdStyle.id,
        colorId: colorRow.id,
        sku: color.sku,
        price: color.price ?? basePrice,
        stock: color.stock ?? 0,
        active: true,
      });
    });
  });

  return product;
}

function seedProducts(categoryIds) {
  seedProductWithVariants({
    name: 'Smartwatch X',
    description: 'Smartwatch de última generación con pantalla AMOLED, monitor de ritmo cardíaco, GPS integrado y hasta 7 días de batería. Compatible con iOS y Android.',
    basePrice: 899,
    categoryId: categoryIds['smartwatches'],
    featured: true,
    styleDefs: [
      { name: 'Classic', colors: [
        { name: 'Negro', hex: '#111111', sku: 'SW-X-CLASSIC-BLK', stock: 8 },
        { name: 'Plata', hex: '#C0C0C0', sku: 'SW-X-CLASSIC-SLV', stock: 3 },
        { name: 'Azul', hex: '#1E3A8A', sku: 'SW-X-CLASSIC-BLU', stock: 5 },
      ]},
      { name: 'Sport', colors: [
        { name: 'Negro', hex: '#111111', sku: 'SW-X-SPORT-BLK', stock: 12 },
        { name: 'Rojo', hex: '#DC2626', sku: 'SW-X-SPORT-RED', stock: 0 },
        { name: 'Verde', hex: '#16A34A', sku: 'SW-X-SPORT-GRN', stock: 6 },
      ]},
      { name: 'Pro', colors: [
        { name: 'Negro', hex: '#111111', sku: 'SW-X-PRO-BLK', stock: 4, price: 999 },
        { name: 'Titanio', hex: '#8A8D8F', sku: 'SW-X-PRO-TIT', stock: 2, price: 1099 },
        { name: 'Azul', hex: '#1E3A8A', sku: 'SW-X-PRO-BLU', stock: 3, price: 999 },
      ]},
    ],
  });

  seedProductWithVariants({
    name: 'Smartwatch Aria',
    description: 'Diseño minimalista pensado para uso diario, con seguimiento de sueño, notificaciones inteligentes y correa intercambiable.',
    basePrice: 649,
    categoryId: categoryIds['smartwatches'],
    featured: true,
    styleDefs: [
      { name: 'Classic', colors: [
        { name: 'Blanco', hex: '#F5F5F5', sku: 'SW-ARIA-CLASSIC-WHT', stock: 10 },
        { name: 'Negro', hex: '#111111', sku: 'SW-ARIA-CLASSIC-BLK', stock: 7 },
      ]},
      { name: 'Sport', colors: [
        { name: 'Rosa', hex: '#EC4899', sku: 'SW-ARIA-SPORT-PNK', stock: 5 },
        { name: 'Negro', hex: '#111111', sku: 'SW-ARIA-SPORT-BLK', stock: 9 },
      ]},
    ],
  });

  seedProductWithVariants({
    name: 'Reloj Heritage 1965',
    description: 'Reloj clásico de esfera analógica con caja de acero inoxidable y correa de cuero genuino. Inspirado en los relojes de vestir de los años 60.',
    basePrice: 1250,
    categoryId: categoryIds['relojes-clasicos'],
    featured: false,
    styleDefs: [
      { name: 'Clásico', colors: [
        { name: 'Café', hex: '#6B4226', sku: 'RH1965-CLASSIC-BRN', stock: 4 },
        { name: 'Negro', hex: '#111111', sku: 'RH1965-CLASSIC-BLK', stock: 6 },
      ]},
      { name: 'Oro Rosa', colors: [
        { name: 'Café', hex: '#6B4226', sku: 'RH1965-GOLD-BRN', stock: 2, price: 1450 },
        { name: 'Blanco', hex: '#F5F5F5', sku: 'RH1965-GOLD-WHT', stock: 0, price: 1450 },
      ]},
    ],
  });

  seedProductWithVariants({
    name: 'Reloj Trailblazer GPS',
    description: 'Reloj deportivo resistente al agua (10 ATM), pensado para trail running y deportes de montaña, con GPS multibanda y batería de larga duración.',
    basePrice: 1099,
    categoryId: categoryIds['relojes-deportivos'],
    featured: true,
    styleDefs: [
      { name: 'Estándar', colors: [
        { name: 'Negro', hex: '#111111', sku: 'TB-GPS-STD-BLK', stock: 15 },
        { name: 'Naranja', hex: '#EA580C', sku: 'TB-GPS-STD-ORG', stock: 8 },
      ]},
      { name: 'Titanio', colors: [
        { name: 'Titanio', hex: '#8A8D8F', sku: 'TB-GPS-TIT-TIT', stock: 3, price: 1399 },
      ]},
    ],
  });

  seedProductWithVariants({
    name: 'Edición Limitada Nébula',
    description: 'Serie limitada de 500 unidades numeradas, esfera con acabado degradado inspirado en nebulosas y certificado de autenticidad.',
    basePrice: 1899,
    categoryId: categoryIds['ediciones-limitadas'],
    featured: false,
    styleDefs: [
      { name: 'Numerada', colors: [
        { name: 'Púrpura', hex: '#6D28D9', sku: 'LTD-NEBULA-PUR', stock: 5 },
        { name: 'Azul Medianoche', hex: '#1E1B4B', sku: 'LTD-NEBULA-MID', stock: 5 },
      ]},
    ],
  });
}

function main() {
  const categoryIds = seedCategories();
  seedAdmin();
  seedProducts(categoryIds);
  console.log('✅ Seed completado: categorías, productos, variantes y admin listos.');
}

main();
