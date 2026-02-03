/*
  # Sistema ERP Gallardo Joyas - Schema con acceso anónimo

  1. Nuevas Tablas
    - `customers` - Clientes del negocio
    - `products` - Catálogo de productos
    - `orders` - Pedidos y cotizaciones
    - `order_items` - Items de pedidos
    - `inventory_movements` - Movimientos de inventario
    - `stock_alerts` - Alertas de stock bajo
    - `churn_alerts` - Alertas de clientes inactivos
    - `customer_segments` - Segmentos de clientes
    - `business_rules` - Reglas de negocio
    - `price_lists` - Listas de precios
    - `promotions` - Promociones

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas permisivas para usuarios anónimos (anon)
    - Acceso completo para usuarios autenticados
*/

-- Módulo CRM
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  name text NOT NULL,
  source text DEFAULT 'manual',
  material_preference text DEFAULT 'Ambos',
  segment text,
  total_purchases numeric DEFAULT 0,
  last_purchase_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  criteria jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS churn_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  days_inactive integer NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Módulo de Inventario
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  material text NOT NULL,
  category text,
  image_url text,
  retail_price numeric NOT NULL,
  wholesale_price numeric NOT NULL,
  stock_a integer DEFAULT 0,
  stock_b integer DEFAULT 0,
  stock_c integer DEFAULT 0,
  total_stock integer GENERATED ALWAYS AS (stock_a + stock_b + stock_c) STORED,
  min_stock_alert integer DEFAULT 5,
  is_base_line boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  quantity_a integer DEFAULT 0,
  quantity_b integer DEFAULT 0,
  quantity_c integer DEFAULT 0,
  reference text,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  current_stock integer NOT NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Módulo de Ventas
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text DEFAULT 'draft',
  order_type text DEFAULT 'retail',
  subtotal numeric DEFAULT 0,
  total numeric DEFAULT 0,
  delivery_method text,
  delivery_address text,
  payment_status text DEFAULT 'pending',
  payment_link text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Módulo de Configuración
CREATE TABLE IF NOT EXISTS business_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text UNIQUE NOT NULL,
  rule_name text NOT NULL,
  rule_value jsonb NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
CREATE INDEX IF NOT EXISTS idx_customers_last_purchase ON customers(last_purchase_date);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_material ON products(material);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- RLS: Habilitar en todas las tablas
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE churn_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Acceso completo para anon y authenticated
CREATE POLICY "Allow all access to customers"
  ON customers FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to customer_segments"
  ON customer_segments FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to churn_alerts"
  ON churn_alerts FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to products"
  ON products FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to inventory_movements"
  ON inventory_movements FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to stock_alerts"
  ON stock_alerts FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to orders"
  ON orders FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to order_items"
  ON order_items FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to business_rules"
  ON business_rules FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to price_lists"
  ON price_lists FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to promotions"
  ON promotions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insertar reglas de negocio iniciales
INSERT INTO business_rules (rule_key, rule_name, rule_value, description) VALUES
  ('wholesale_threshold', 'Umbral de Compra Mayoreo', '{"amount": 3000, "currency": "MXN"}'::jsonb, 'Monto mínimo para aplicar precios de mayoreo'),
  ('churn_days', 'Días de Inactividad para Churn', '{"days": 45}'::jsonb, 'Días sin compra para considerar cliente inactivo')
ON CONFLICT (rule_key) DO NOTHING;

-- Insertar listas de precios iniciales
INSERT INTO price_lists (name, description) VALUES
  ('Minorista', 'Lista de precios para clientes minoristas'),
  ('Mayorista', 'Lista de precios para clientes mayoristas')
ON CONFLICT DO NOTHING;
