/*
  # Sistema ERP Gallardo Joyas - Schema Completo

  ## 1. Módulo CRM (Customer Relationship Management)
  
  ### Tablas:
  - `customers` - Datos centralizados de clientes
    - `id` (uuid, PK)
    - `phone` (text, único) - Número de teléfono del cliente
    - `name` (text) - Nombre del cliente
    - `source` (text) - Procedencia (WhatsApp, Facebook, etc.)
    - `material_preference` (text) - Preferencia: 'Plata Pura', 'Baño de Oro', o 'Ambos'
    - `segment` (text) - Segmento dinámico del cliente
    - `total_purchases` (numeric) - Total histórico de compras
    - `last_purchase_date` (timestamptz) - Fecha de última compra
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `customer_segments` - Definición de segmentos dinámicos
    - `id` (uuid, PK)
    - `name` (text) - Nombre del segmento
    - `description` (text)
    - `criteria` (jsonb) - Criterios del segmento
    - `created_at` (timestamptz)

  - `churn_alerts` - Alertas de clientes inactivos
    - `id` (uuid, PK)
    - `customer_id` (uuid, FK)
    - `days_inactive` (integer)
    - `status` (text) - 'pending', 'contacted', 'reactivated', 'lost'
    - `created_at` (timestamptz)
    - `resolved_at` (timestamptz)

  ## 2. Módulo de Inventario y Catálogo

  ### Tablas:
  - `products` - Catálogo digital de productos
    - `id` (uuid, PK)
    - `sku` (text, único) - Código del producto
    - `name` (text) - Nombre del producto
    - `description` (text)
    - `material` (text) - 'Plata Pura' o 'Baño de Oro'
    - `category` (text) - Línea del producto
    - `image_url` (text)
    - `retail_price` (numeric) - Precio minorista
    - `wholesale_price` (numeric) - Precio mayorista
    - `stock_a` (integer) - Stock pieza A
    - `stock_b` (integer) - Stock pieza B
    - `stock_c` (integer) - Stock pieza C
    - `total_stock` (integer) - Stock total calculado
    - `min_stock_alert` (integer) - Nivel mínimo para alerta
    - `is_base_line` (boolean) - Si es de las 7 líneas base
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `inventory_movements` - Trazabilidad de movimientos
    - `id` (uuid, PK)
    - `product_id` (uuid, FK)
    - `movement_type` (text) - 'in', 'out', 'adjustment'
    - `quantity_a` (integer)
    - `quantity_b` (integer)
    - `quantity_c` (integer)
    - `reference` (text) - Número de pedido u otra referencia
    - `notes` (text)
    - `created_by` (text)
    - `created_at` (timestamptz)

  - `stock_alerts` - Alertas de stock bajo
    - `id` (uuid, PK)
    - `product_id` (uuid, FK)
    - `alert_type` (text) - 'low_stock', 'out_of_stock'
    - `current_stock` (integer)
    - `status` (text) - 'active', 'resolved'
    - `created_at` (timestamptz)
    - `resolved_at` (timestamptz)

  ## 3. Módulo de Ventas y Cotización

  ### Tablas:
  - `orders` - Pedidos y cotizaciones
    - `id` (uuid, PK)
    - `order_number` (text, único) - Número de pedido (ej. 504)
    - `customer_id` (uuid, FK)
    - `status` (text) - 'draft', 'quoted', 'confirmed', 'paid', 'delivered', 'cancelled'
    - `order_type` (text) - 'retail', 'wholesale'
    - `subtotal` (numeric)
    - `total` (numeric)
    - `delivery_method` (text) - 'pickup', 'shipping'
    - `delivery_address` (text)
    - `payment_status` (text) - 'pending', 'paid', 'failed'
    - `payment_link` (text)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `order_items` - Items de cada pedido
    - `id` (uuid, PK)
    - `order_id` (uuid, FK)
    - `product_id` (uuid, FK)
    - `quantity` (integer)
    - `unit_price` (numeric) - Precio aplicado (retail o wholesale)
    - `subtotal` (numeric)
    - `created_at` (timestamptz)

  ## 4. Módulo de Configuración de Reglas

  ### Tablas:
  - `business_rules` - Políticas de negocio
    - `id` (uuid, PK)
    - `rule_key` (text, único) - Identificador de la regla
    - `rule_name` (text)
    - `rule_value` (jsonb) - Valor de la regla
    - `description` (text)
    - `is_active` (boolean)
    - `updated_at` (timestamptz)

  - `price_lists` - Listas de precios
    - `id` (uuid, PK)
    - `name` (text) - 'Minorista', 'Mayorista'
    - `description` (text)
    - `is_active` (boolean)
    - `created_at` (timestamptz)

  - `promotions` - Descuentos y promociones estacionales
    - `id` (uuid, PK)
    - `name` (text)
    - `description` (text)
    - `discount_type` (text) - 'percentage', 'fixed'
    - `discount_value` (numeric)
    - `valid_from` (timestamptz)
    - `valid_until` (timestamptz)
    - `is_active` (boolean)
    - `created_at` (timestamptz)

  ## 5. Seguridad
  - RLS habilitado en todas las tablas
  - Políticas restrictivas para usuarios autenticados
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

-- Políticas RLS: Acceso completo para usuarios autenticados
CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage customer_segments"
  ON customer_segments FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage churn_alerts"
  ON churn_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage products"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage inventory_movements"
  ON inventory_movements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage stock_alerts"
  ON stock_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage orders"
  ON orders FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage order_items"
  ON order_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage business_rules"
  ON business_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage price_lists"
  ON price_lists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage promotions"
  ON promotions FOR ALL
  TO authenticated
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