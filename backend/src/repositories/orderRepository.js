import { db, withTransaction } from '../db/connection.js';

export const orderRepository = {
  findOrCreateCustomer({ name, email, phone, address, city }) {
    const existing = db.prepare('SELECT * FROM customers WHERE email = ?').get(email);
    if (existing) {
      db.prepare(`
        UPDATE customers SET name = ?, phone = ?, address = ?, city = ? WHERE id = ?
      `).run(name, phone || existing.phone, address || existing.address, city || existing.city, existing.id);
      return db.prepare('SELECT * FROM customers WHERE id = ?').get(existing.id);
    }
    const info = db.prepare(`
      INSERT INTO customers (name, email, phone, address, city) VALUES (?, ?, ?, ?, ?)
    `).run(name, email, phone || null, address || null, city || null);
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(info.lastInsertRowid);
  },

  createOrder({ customerId, items, subtotal, total, currency = 'GTQ' }) {
    const insertOrder = db.prepare(`
      INSERT INTO orders (customer_id, subtotal, total, currency, payment_status, order_status)
      VALUES (?, ?, ?, ?, 'pending', 'pending')
    `);
    const insertItem = db.prepare(`
      INSERT INTO order_items
        (order_id, product_id, product_name, style_id, style_name, color_id, color_name, sku, quantity, unit_price, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderId = withTransaction(() => {
      const info = insertOrder.run(customerId, subtotal, total, currency);
      const newOrderId = info.lastInsertRowid;
      for (const item of items) {
        insertItem.run(
          newOrderId, item.productId, item.productName, item.styleId, item.styleName,
          item.colorId, item.colorName, item.sku, item.quantity, item.unitPrice, item.subtotal
        );
      }
      return newOrderId;
    });
    return this.getOrderById(orderId);
  },

  getOrderById(id) {
    const order = db.prepare(`
      SELECT o.*, c.name AS customer_name, c.email AS customer_email,
             c.phone AS customer_phone, c.address AS customer_address, c.city AS customer_city
      FROM orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(id);
    if (!order) return null;
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return { ...order, items };
  },

  listOrders({ search, status, page = 1, pageSize = 20 } = {}) {
    const where = [];
    const params = [];
    if (status) { where.push('o.order_status = ?'); params.push(status); }
    if (search) {
      where.push('(c.name LIKE ? OR c.email LIKE ? OR CAST(o.id AS TEXT) = ?)');
      params.push(`%${search}%`, `%${search}%`, search);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (Math.max(1, page) - 1) * pageSize;

    const rows = db.prepare(`
      SELECT o.*, c.name AS customer_name, c.email AS customer_email
      FROM orders o JOIN customers c ON c.id = o.customer_id
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const totalRow = db.prepare(`
      SELECT COUNT(*) AS total FROM orders o JOIN customers c ON c.id = o.customer_id ${whereSql}
    `).get(...params);

    return { items: rows, total: totalRow.total, page: Number(page), pageSize: Number(pageSize) };
  },

  updateOrderStatus(id, { orderStatus, paymentStatus, paymentProvider, paymentId, transactionId }) {
    const current = this.getOrderById(id);
    if (!current) return null;
    db.prepare(`
      UPDATE orders SET
        order_status = ?, payment_status = ?, payment_provider = ?,
        payment_id = ?, transaction_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      orderStatus ?? current.order_status,
      paymentStatus ?? current.payment_status,
      paymentProvider ?? current.payment_provider,
      paymentId ?? current.payment_id,
      transactionId ?? current.transaction_id,
      id
    );
    return this.getOrderById(id);
  },

  // ---- Pagos ----
  createPayment({ orderId, provider, status, amount, currency, providerPaymentId, rawPayload }) {
    const info = db.prepare(`
      INSERT INTO payments (order_id, provider, status, amount, currency, provider_payment_id, raw_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, provider, status, amount, currency, providerPaymentId || null, JSON.stringify(rawPayload || {}));
    return db.prepare('SELECT * FROM payments WHERE id = ?').get(info.lastInsertRowid);
  },

  updatePaymentStatus(providerPaymentId, status, rawPayload) {
    return db.prepare(`
      UPDATE payments SET status = ?, raw_payload = ?, updated_at = datetime('now')
      WHERE provider_payment_id = ?
    `).run(status, JSON.stringify(rawPayload || {}), providerPaymentId);
  },

  getPaymentByProviderId(providerPaymentId) {
    return db.prepare('SELECT * FROM payments WHERE provider_payment_id = ?').get(providerPaymentId);
  },

  // ---- Dashboard ----
  getDashboardStats() {
    const totalSales = db.prepare(`
      SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE payment_status = 'paid'
    `).get().total;
    const totalOrders = db.prepare('SELECT COUNT(*) AS total FROM orders').get().total;
    const pendingOrders = db.prepare(`
      SELECT COUNT(*) AS total FROM orders WHERE order_status = 'pending'
    `).get().total;
    const totalProducts = db.prepare('SELECT COUNT(*) AS total FROM products').get().total;
    const lowStock = db.prepare(`
      SELECT v.id, v.sku, v.stock, p.name AS product_name, ps.name AS style_name, co.name AS color_name
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      JOIN product_styles ps ON ps.id = v.style_id
      JOIN colors co ON co.id = v.color_id
      WHERE v.stock <= 5 AND v.active = 1
      ORDER BY v.stock ASC
      LIMIT 10
    `).all();
    const recentOrders = db.prepare(`
      SELECT o.id, o.total, o.order_status, o.payment_status, o.created_at, c.name AS customer_name
      FROM orders o JOIN customers c ON c.id = o.customer_id
      ORDER BY o.created_at DESC LIMIT 5
    `).all();
    return { totalSales, totalOrders, pendingOrders, totalProducts, lowStock, recentOrders };
  },
};
