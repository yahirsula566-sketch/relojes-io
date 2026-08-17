// Capa de acceso a datos para productos, estilos, colores y variantes.
// Esta es la única capa que conoce SQL; controladores y servicios
// siempre pasan por aquí. Si en el futuro se cambia de SQLite a
// Postgres/MySQL, solo este archivo (y connection.js) deben cambiar.
import { db } from '../db/connection.js';

function rowToProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    basePrice: row.base_price,
    categoryId: row.category_id,
    categoryName: row.category_name ?? undefined,
    images: JSON.parse(row.images || '[]'),
    active: !!row.active,
    featured: !!row.featured,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const productRepository = {
  listCategories() {
    return db.prepare('SELECT * FROM categories ORDER BY name').all();
  },

  getCategoryBySlug(slug) {
    return db.prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
  },

  /**
   * Lista productos activos aplicando búsqueda, filtros y orden.
   * @param {object} opts { search, categorySlug, minPrice, maxPrice, featured, sort, page, pageSize }
   */
  listProducts(opts = {}) {
    const {
      search, categorySlug, minPrice, maxPrice, featured, sort,
      page = 1, pageSize = 24, includeInactive = false,
    } = opts;

    const where = [];
    const params = [];

    if (!includeInactive) where.push('p.active = 1');
    if (search) {
      where.push('(p.name LIKE ? OR p.description LIKE ? OR p.slug LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }
    if (categorySlug) {
      where.push('c.slug = ?');
      params.push(categorySlug);
    }
    if (minPrice !== undefined) { where.push('p.base_price >= ?'); params.push(minPrice); }
    if (maxPrice !== undefined) { where.push('p.base_price <= ?'); params.push(maxPrice); }
    if (featured !== undefined) { where.push('p.featured = ?'); params.push(featured ? 1 : 0); }

    let orderBy = 'p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'p.base_price ASC';
    else if (sort === 'price_desc') orderBy = 'p.base_price DESC';
    else if (sort === 'featured') orderBy = 'p.featured DESC, p.created_at DESC';
    else if (sort === 'name') orderBy = 'p.name ASC';

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, page) - 1) * pageSize;

    const rows = db.prepare(`
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const totalRow = db.prepare(`
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ${whereSql}
    `).get(...params);

    return {
      items: rows.map(rowToProduct),
      total: totalRow.total,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  },

  getProductBySlug(slug, { includeInactive = false } = {}) {
    const sql = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ? ${includeInactive ? '' : 'AND p.active = 1'}
    `;
    const row = db.prepare(sql).get(slug);
    return rowToProduct(row);
  },

  getProductById(id) {
    const row = db.prepare(`
      SELECT p.*, c.name AS category_name FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(id);
    return rowToProduct(row);
  },

  /** Devuelve estilos con sus variantes (y color) para un producto. */
  getStylesWithVariants(productId) {
    const styles = db.prepare(
      'SELECT * FROM product_styles WHERE product_id = ? ORDER BY sort_order, name'
    ).all(productId);

    const variantStmt = db.prepare(`
      SELECT v.*, co.name AS color_name, co.hex AS color_hex
      FROM product_variants v
      JOIN colors co ON co.id = v.color_id
      WHERE v.style_id = ?
      ORDER BY co.name
    `);

    return styles.map((style) => ({
      id: style.id,
      name: style.name,
      sortOrder: style.sort_order,
      variants: variantStmt.all(style.id).map((v) => ({
        id: v.id,
        productId: v.product_id,
        styleId: v.style_id,
        colorId: v.color_id,
        colorName: v.color_name,
        colorHex: v.color_hex,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        image: v.image,
        active: !!v.active,
      })),
    }));
  },

  getVariantById(variantId) {
    return db.prepare(`
      SELECT v.*, co.name AS color_name, co.hex AS color_hex,
             ps.name AS style_name, p.name AS product_name, p.id AS product_id
      FROM product_variants v
      JOIN colors co ON co.id = v.color_id
      JOIN product_styles ps ON ps.id = v.style_id
      JOIN products p ON p.id = v.product_id
      WHERE v.id = ?
    `).get(variantId);
  },

  getVariantBySku(sku) {
    return db.prepare('SELECT * FROM product_variants WHERE sku = ?').get(sku);
  },

  /** Reduce el stock de una variante de forma atómica; falla si no hay suficiente. */
  decrementStock(variantId, quantity) {
    const result = db.prepare(`
      UPDATE product_variants
      SET stock = stock - ?, updated_at = datetime('now')
      WHERE id = ? AND stock >= ?
    `).run(quantity, variantId, quantity);
    return result.changes === 1;
  },

  restoreStock(variantId, quantity) {
    db.prepare(`
      UPDATE product_variants SET stock = stock + ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(quantity, variantId);
  },

  // ---- Escritura (usada por el panel administrativo) ----

  createProduct(data) {
    const info = db.prepare(`
      INSERT INTO products (name, slug, description, base_price, category_id, images, active, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name, data.slug, data.description || '', data.basePrice,
      data.categoryId || null, JSON.stringify(data.images || []),
      data.active ? 1 : 0, data.featured ? 1 : 0
    );
    return this.getProductById(info.lastInsertRowid);
  },

  updateProduct(id, data) {
    const current = this.getProductById(id);
    if (!current) return null;
    db.prepare(`
      UPDATE products SET name = ?, description = ?, base_price = ?, category_id = ?,
        images = ?, active = ?, featured = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.name ?? current.name,
      data.description ?? current.description,
      data.basePrice ?? current.basePrice,
      data.categoryId ?? current.categoryId,
      JSON.stringify(data.images ?? current.images),
      data.active !== undefined ? (data.active ? 1 : 0) : (current.active ? 1 : 0),
      data.featured !== undefined ? (data.featured ? 1 : 0) : (current.featured ? 1 : 0),
      id
    );
    return this.getProductById(id);
  },

  deleteProduct(id) {
    return db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0;
  },

  createStyle(productId, name, sortOrder = 0) {
    const info = db.prepare(
      'INSERT INTO product_styles (product_id, name, sort_order) VALUES (?, ?, ?)'
    ).run(productId, name, sortOrder);
    return { id: info.lastInsertRowid, productId, name, sortOrder };
  },

  deleteStyle(styleId) {
    return db.prepare('DELETE FROM product_styles WHERE id = ?').run(styleId).changes > 0;
  },

  findOrCreateColor(name, hex) {
    const existing = db.prepare('SELECT * FROM colors WHERE name = ?').get(name);
    if (existing) return existing;
    const info = db.prepare('INSERT INTO colors (name, hex) VALUES (?, ?)').run(name, hex || '#333333');
    return { id: info.lastInsertRowid, name, hex: hex || '#333333' };
  },

  createVariant(data) {
    const info = db.prepare(`
      INSERT INTO product_variants (product_id, style_id, color_id, sku, price, stock, image, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.productId, data.styleId, data.colorId, data.sku,
      data.price, data.stock ?? 0, data.image || null, data.active === false ? 0 : 1
    );
    return this.getVariantById(info.lastInsertRowid);
  },

  updateVariant(variantId, data) {
    const current = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(variantId);
    if (!current) return null;
    db.prepare(`
      UPDATE product_variants SET price = ?, stock = ?, image = ?, active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.price ?? current.price,
      data.stock ?? current.stock,
      data.image ?? current.image,
      data.active !== undefined ? (data.active ? 1 : 0) : current.active,
      variantId
    );
    return this.getVariantById(variantId);
  },

  deleteVariant(variantId) {
    return db.prepare('DELETE FROM product_variants WHERE id = ?').run(variantId).changes > 0;
  },
};
