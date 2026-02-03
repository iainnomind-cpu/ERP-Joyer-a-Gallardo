/*
  # Sistema POS para Gallardo Joyas - Parte 3: Efectivo y Descuentos

  1. Movimientos de Efectivo
    - Entradas y salidas de caja
    - Retiros y depósitos
    
  2. Autorizaciones de Descuento
    - Control de descuentos especiales
    - Requieren aprobación de supervisor
    
  3. Metas de Venta
    - Objetivos diarios, semanales, mensuales
*/

-- Movimientos de Efectivo en Caja
CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES pos_sessions(id) ON DELETE RESTRICT,
  movement_type text NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  reference text,
  authorized_by text,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CHECK (movement_type IN ('cash_in', 'cash_out', 'withdrawal', 'deposit', 'adjustment')),
  CHECK (amount > 0)
);

-- Metas de Venta
CREATE TABLE IF NOT EXISTS sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  target_transactions integer,
  current_transactions integer DEFAULT 0,
  terminal_id uuid REFERENCES pos_terminals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual'))
);

-- Autorizaciones de Descuentos Especiales
CREATE TABLE IF NOT EXISTS discount_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES pos_transactions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  discount_percentage numeric,
  discount_amount numeric NOT NULL,
  original_amount numeric NOT NULL,
  final_amount numeric NOT NULL,
  reason text NOT NULL,
  requested_by text NOT NULL,
  authorized_by text,
  status text DEFAULT 'pending',
  authorized_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CHECK (status IN ('pending', 'approved', 'rejected')),
  CHECK (discount_amount >= 0),
  CHECK (discount_percentage >= 0 AND discount_percentage <= 100)
);

-- Configuración de Impresión de Tickets
CREATE TABLE IF NOT EXISTS ticket_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text UNIQUE NOT NULL,
  template_type text NOT NULL,
  header_text text,
  footer_text text,
  logo_url text,
  paper_width integer DEFAULT 58,
  font_size text DEFAULT 'normal',
  show_barcode boolean DEFAULT true,
  show_qr boolean DEFAULT false,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CHECK (template_type IN ('sale', 'quote', 'refund', 'credit_note')),
  CHECK (paper_width IN (58, 80))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(session_id);
CREATE INDEX IF NOT EXISTS idx_discount_auth_transaction ON discount_authorizations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_discount_auth_status ON discount_authorizations(status);

-- RLS
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to cash_movements" ON cash_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to sales_goals" ON sales_goals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to discount_authorizations" ON discount_authorizations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to ticket_templates" ON ticket_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Plantilla de ticket predeterminada
INSERT INTO ticket_templates (template_name, template_type, header_text, footer_text, is_default) VALUES
  ('default_sale', 'sale', 
   E'GALLARDO JOYAS\nJoyería Fina de Plata y Oro\nCentro Joyero, Local 123\nTel: (33) 1234-5678',
   E'¡Gracias por su compra!\nConserve su ticket\nwww.gallardojoyas.com',
   true)
ON CONFLICT (template_name) DO NOTHING;

-- Meta de venta inicial
INSERT INTO sales_goals (period_type, period_start, period_end, target_amount, target_transactions) VALUES
  ('monthly', 
   DATE_TRUNC('month', NOW()), 
   DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',
   150000,
   200)
ON CONFLICT DO NOTHING;

-- Reglas de negocio adicionales para POS
INSERT INTO business_rules (rule_key, rule_name, rule_value, description) VALUES
  ('max_discount_without_auth', 'Descuento Máximo Sin Autorización', '{"percentage": 10}'::jsonb, 'Porcentaje máximo de descuento que puede aplicar un vendedor sin autorización de supervisor'),
  ('min_opening_cash', 'Efectivo Mínimo de Apertura', '{"amount": 1000, "currency": "MXN"}'::jsonb, 'Cantidad mínima de efectivo para abrir una caja'),
  ('payment_link_expiry_hours', 'Horas de Vigencia de Enlaces de Pago', '{"hours": 72}'::jsonb, 'Tiempo de vigencia de los enlaces de pago generados'),
  ('require_customer_for_invoice', 'Requiere Cliente para Factura', '{"required": true}'::jsonb, 'Si es obligatorio asociar un cliente para generar factura')
ON CONFLICT (rule_key) DO NOTHING;
