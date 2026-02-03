/*
  # Sistema POS para Gallardo Joyas - Parte 2: Transacciones y Métodos de Pago

  1. Transacciones de Venta
    - Registro de cada venta en terminal
    - Control de tickets impresos
    
  2. Métodos de Pago
    - Efectivo, tarjetas, transferencias
    - Configuración de comisiones
    
  3. Enlaces de Pago para Venta Remota
    - Generación de URLs de pago
    - Integración con pasarelas de pago
*/

-- Ampliar tabla orders para soporte POS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'sale_channel') THEN
    ALTER TABLE orders ADD COLUMN sale_channel text DEFAULT 'remote';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'pos_terminal_id') THEN
    ALTER TABLE orders ADD COLUMN pos_terminal_id uuid REFERENCES pos_terminals(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_applied') THEN
    ALTER TABLE orders ADD COLUMN discount_applied numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_reason') THEN
    ALTER TABLE orders ADD COLUMN discount_reason text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'served_by') THEN
    ALTER TABLE orders ADD COLUMN served_by text;
  END IF;
END $$;

-- Transacciones de Venta en POS
CREATE TABLE IF NOT EXISTS pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES pos_sessions(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  transaction_number text UNIQUE NOT NULL,
  sale_type text NOT NULL DEFAULT 'physical_pos',
  payment_method text NOT NULL,
  payment_reference text,
  payment_details jsonb,
  amount_tendered numeric,
  change_given numeric DEFAULT 0,
  ticket_printed boolean DEFAULT false,
  ticket_number text,
  completed_at timestamptz DEFAULT now(),
  created_by text,
  CHECK (sale_type IN ('physical_pos', 'remote_quote'))
);

-- Métodos de Pago Disponibles
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  type text NOT NULL,
  icon text,
  requires_reference boolean DEFAULT false,
  requires_authorization boolean DEFAULT false,
  commission_rate numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (type IN ('cash', 'card', 'transfer', 'digital_wallet', 'check'))
);

-- Enlaces de Pago para Venta Remota
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  link_code text UNIQUE NOT NULL,
  link_url text NOT NULL,
  amount numeric NOT NULL,
  payment_provider text NOT NULL,
  provider_transaction_id text,
  expires_at timestamptz NOT NULL,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  payment_method_used text,
  created_at timestamptz DEFAULT now(),
  CHECK (status IN ('pending', 'paid', 'expired', 'cancelled', 'failed')),
  CHECK (payment_provider IN ('mercadopago', 'stripe', 'clip', 'openpay', 'conekta', 'paypal'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pos_transactions_session ON pos_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_order ON pos_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_completed_at ON pos_transactions(completed_at);
CREATE INDEX IF NOT EXISTS idx_payment_links_order ON payment_links(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_links_code ON payment_links(link_code);

-- RLS
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pos_transactions" ON pos_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payment_methods" ON payment_methods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payment_links" ON payment_links FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Métodos de pago predeterminados
INSERT INTO payment_methods (name, display_name, type, icon, requires_reference, commission_rate, sort_order) VALUES
  ('cash', 'Efectivo', 'cash', '💵', false, 0, 1),
  ('card_debit', 'Tarjeta de Débito', 'card', '💳', false, 2.5, 2),
  ('card_credit', 'Tarjeta de Crédito', 'card', '💳', false, 3.5, 3),
  ('transfer', 'Transferencia Bancaria', 'transfer', '🏦', true, 0, 4),
  ('mercadopago', 'Mercado Pago', 'digital_wallet', '📱', true, 3.99, 5),
  ('clip', 'Clip', 'digital_wallet', '📱', true, 3.6, 6)
ON CONFLICT (name) DO NOTHING;
