-- =============================================================
-- WatchStore - Esquema de base de datos
-- Motor: SQLite embebido (módulo nativo node:sqlite, sin dependencias)
-- Diseñado para migrar sin cambios de modelo a Postgres/MySQL en
-- producción si el proyecto lo requiere más adelante.
-- =============================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------
-- Categorías del catálogo
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------
-- Colores reutilizables (entidad Color independiente)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS colors (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  hex         TEXT NOT NULL
);

-- ---------------------------------------------------------------
-- Productos (reloj/smartwatch como concepto general)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT NOT NULL DEFAULT '',
  base_price   REAL NOT NULL,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  images       TEXT NOT NULL DEFAULT '[]', -- JSON array de imágenes generales
  active       INTEGER NOT NULL DEFAULT 1, -- boolean 0/1
  featured     INTEGER NOT NULL DEFAULT 0, -- boolean 0/1
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

-- ---------------------------------------------------------------
-- Estilos de un producto (Classic, Sport, Pro, ...)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_styles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, name)
);
CREATE INDEX IF NOT EXISTS idx_styles_product ON product_styles(product_id);

-- ---------------------------------------------------------------
-- Variantes: combinación única de Producto + Estilo + Color
-- Cada variante tiene su propio SKU, precio, stock e imagen.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  style_id    INTEGER NOT NULL REFERENCES product_styles(id) ON DELETE CASCADE,
  color_id    INTEGER NOT NULL REFERENCES colors(id) ON DELETE RESTRICT,
  sku         TEXT NOT NULL UNIQUE,
  price       REAL NOT NULL,           -- puede sobreescribir base_price
  stock       INTEGER NOT NULL DEFAULT 0,
  image       TEXT,                    -- override de imagen estilo+color
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(style_id, color_id)
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_style ON product_variants(style_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

-- ---------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ---------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  subtotal        REAL NOT NULL,
  total           REAL NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'GTQ',
  payment_status  TEXT NOT NULL DEFAULT 'pending',  -- pending|paid|failed|cancelled
  order_status    TEXT NOT NULL DEFAULT 'pending',  -- pending|paid|processing|shipped|delivered|cancelled
  payment_provider TEXT,
  payment_id      TEXT,
  transaction_id  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);

-- ---------------------------------------------------------------
-- Ítems del pedido: copia congelada de los datos de la variante
-- en el momento de la compra (no deben cambiar si el admin edita
-- el producto después).
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL,
  product_name  TEXT NOT NULL,
  style_id      INTEGER NOT NULL,
  style_name    TEXT NOT NULL,
  color_id      INTEGER NOT NULL,
  color_name    TEXT NOT NULL,
  sku           TEXT NOT NULL,
  quantity      INTEGER NOT NULL,
  unit_price    REAL NOT NULL,
  subtotal      REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ---------------------------------------------------------------
-- Pagos (registro de intentos/transacciones por pedido)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,             -- mock|recurrente
  status              TEXT NOT NULL DEFAULT 'pending',
  amount              REAL NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'GTQ',
  provider_payment_id TEXT,
  raw_payload         TEXT,                      -- JSON crudo (webhook/respuesta)
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(provider_payment_id);

-- ---------------------------------------------------------------
-- Usuarios administradores
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  password_salt  TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------
-- Sesiones de administrador (autenticación real, no solo ocultar URL)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  token           TEXT PRIMARY KEY,   -- hash del token, nunca el token en claro
  admin_user_id   INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
