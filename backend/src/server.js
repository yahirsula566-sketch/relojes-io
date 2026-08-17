import { createServer } from 'node:http';
import path from 'node:path';
import { env } from './utils/env.js';
import { Router } from './router.js';
import { createStaticHandler } from './utils/staticServer.js';
import { requireAdmin } from './middleware/auth.js';

import { productController } from './controllers/productController.js';
import { cartController } from './controllers/cartController.js';
import { checkoutController } from './controllers/checkoutController.js';
import { webhookController } from './controllers/webhookController.js';
import { authController } from './controllers/authController.js';
import { adminController } from './controllers/adminController.js';
import { uploadController } from './controllers/uploadController.js';

import { db } from './db/connection.js';
import { adminRepository } from './repositories/adminRepository.js';

const router = new Router();

// ---------------------------------------------------------------
// API pública: catálogo
// ---------------------------------------------------------------
router.get('/api/categories', productController.listCategories);
router.get('/api/products', productController.listProducts);
router.get('/api/products/:slug', productController.getProduct);

// ---------------------------------------------------------------
// API pública: carrito, checkout, pedidos, pagos
// ---------------------------------------------------------------
router.post('/api/cart/validate', cartController.validate);
router.post('/api/checkout', checkoutController.submit);
router.get('/api/orders/:id', checkoutController.getOrder);
router.post('/api/payments/webhook', webhookController.receive);

// ---------------------------------------------------------------
// Autenticación admin
// ---------------------------------------------------------------
router.post('/api/admin/auth/login', authController.login);
router.post('/api/admin/auth/logout', authController.logout);
router.get('/api/admin/auth/me', requireAdmin, authController.me);

// ---------------------------------------------------------------
// Panel administrativo (todas protegidas por sesión)
// ---------------------------------------------------------------
router.get('/api/admin/dashboard', requireAdmin, adminController.dashboard);

router.post('/api/admin/uploads', requireAdmin, uploadController.uploadImage);

router.get('/api/admin/products', requireAdmin, adminController.listProducts);
router.post('/api/admin/products', requireAdmin, adminController.createProduct);
router.get('/api/admin/products/:id', requireAdmin, adminController.getProduct);
router.put('/api/admin/products/:id', requireAdmin, adminController.updateProduct);
router.delete('/api/admin/products/:id', requireAdmin, adminController.deleteProduct);

router.post('/api/admin/products/:productId/styles', requireAdmin, adminController.createStyle);
router.delete('/api/admin/styles/:styleId', requireAdmin, adminController.deleteStyle);

router.post('/api/admin/products/:productId/variants', requireAdmin, adminController.createVariant);
router.put('/api/admin/variants/:variantId', requireAdmin, adminController.updateVariant);
router.delete('/api/admin/variants/:variantId', requireAdmin, adminController.deleteVariant);

router.get('/api/admin/orders', requireAdmin, adminController.listOrders);
router.get('/api/admin/orders/:id', requireAdmin, adminController.getOrder);
router.put('/api/admin/orders/:id/status', requireAdmin, adminController.updateOrderStatus);

// ---------------------------------------------------------------
// Estáticos: frontend público y panel admin
// ---------------------------------------------------------------
const frontendRoot = path.resolve(env.ROOT, 'frontend', 'public');
const adminRoot = path.resolve(env.ROOT, 'admin', 'public');
const serveFrontend = createStaticHandler(frontendRoot);
const serveAdmin = createStaticHandler(adminRoot);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname.startsWith('/api/')) {
    await router.handle(req, res);
    return;
  }

  const staticHandler = url.pathname.startsWith('/admin') ? serveAdmin : serveFrontend;
  const normalizedPath = url.pathname.startsWith('/admin')
    ? url.pathname.replace(/^\/admin/, '') || '/'
    : url.pathname;

  const file = await staticHandler(normalizedPath);
  if (file) {
    res.writeHead(200, { 'Content-Type': file.contentType });
    res.end(file.data);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 - No encontrado');
});

// Limpieza periódica de sesiones expiradas.
setInterval(() => {
  try { adminRepository.purgeExpiredSessions(); } catch { /* noop */ }
}, 1000 * 60 * 30).unref();

server.listen(env.PORT, () => {
  console.log(`\n🚀 WatchStore backend escuchando en http://localhost:${env.PORT}`);
  console.log(`   Tienda:       http://localhost:${env.PORT}/`);
  console.log(`   Panel admin:  http://localhost:${env.PORT}/admin/`);
  console.log(`   Base de datos: ${env.DATABASE_FILE}`);
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => { server.close(); process.exit(0); });
