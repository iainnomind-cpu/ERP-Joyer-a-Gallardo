-- ========================================
-- SCRIPT DE CONFIGURACIÓN DE TERMINALES POS
-- Sistema ERP Gallardo Joyas
-- ========================================
--
-- INSTRUCCIONES:
-- 1. Abre tu proyecto de Supabase
-- 2. Ve a SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script
--
-- Este script creará las tablas necesarias para el sistema POS
-- y agregará dos terminales predeterminadas
-- ========================================

-- Crear tabla de terminales POS
CREATE TABLE IF NOT EXISTS pos_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_number text UNIQUE NOT NULL,
  terminal_name text NOT NULL,
  location text NOT NULL,
  is_active boolean DEFAULT true,
  printer_config jsonb DEFAULT '{"model": "thermal", "port": "USB001", "paper_width": 58}'::jsonb,
  scanner_config jsonb DEFAULT '{"type": "barcode", "port": "USB002", "encoding": "CODE128"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de sesiones de caja
CREATE TABLE IF NOT EXISTS pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  terminal_id uuid REFERENCES pos_terminals(id) ON DELETE RESTRICT,
  session_number text UNIQUE NOT NULL,
  opened_by text NOT NULL,
  opened_at timestamptz DEFAULT now(),
  closed_by text,
  closed_at timestamptz,
  opening_cash numeric DEFAULT 0,
  closing_cash numeric,
  expected_cash numeric,
  cash_difference numeric,
  total_sales numeric DEFAULT 0,
  total_transactions integer DEFAULT 0,
  status text DEFAULT 'open',
  notes text,
  CHECK (status IN ('open', 'closed', 'suspended'))
);

-- Crear tabla de transacciones POS
CREATE TABLE IF NOT EXISTS pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES pos_sessions(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE RESTRICT,
  transaction_number text UNIQUE NOT NULL,
  sale_type text NOT NULL,
  payment_method text NOT NULL,
  payment_reference text,
  payment_details jsonb,
  amount_tendered numeric,
  change_given numeric DEFAULT 0,
  ticket_printed boolean DEFAULT false,
  ticket_number text,
  completed_at timestamptz DEFAULT now(),
  created_by text,
  CHECK (sale_type IN ('physical_pos', 'phone_order', 'online_order'))
);

-- Crear tabla de métodos de pago
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
  CHECK (type IN ('cash', 'card', 'transfer', 'digital_wallet', 'other'))
);

-- Crear tabla de enlaces de pago
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  link_code text UNIQUE NOT NULL,
  link_url text NOT NULL,
  amount numeric NOT NULL,
  payment_provider text DEFAULT 'mercadopago',
  provider_transaction_id text,
  expires_at timestamptz NOT NULL,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  payment_method_used text,
  created_at timestamptz DEFAULT now(),
  CHECK (status IN ('pending', 'paid', 'expired', 'cancelled'))
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_pos_sessions_terminal ON pos_sessions(terminal_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at ON pos_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_session ON pos_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_order ON pos_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_order ON payment_links(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_code ON payment_links(link_code);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);

-- Habilitar Row Level Security
ALTER TABLE pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Acceso completo para desarrollo
CREATE POLICY "Allow all access to pos_terminals"
  ON pos_terminals FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to pos_sessions"
  ON pos_sessions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to pos_transactions"
  ON pos_transactions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to payment_methods"
  ON payment_methods FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to payment_links"
  ON payment_links FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Funciones auxiliares para generar números únicos
CREATE OR REPLACE FUNCTION generate_session_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  date_prefix text;
  sequence_num integer;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(SUBSTRING(session_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM pos_sessions
  WHERE session_number LIKE date_prefix || '%';

  new_number := date_prefix || '-' || LPAD(sequence_num::text, 4, '0');
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_number text;
  date_prefix text;
  sequence_num integer;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 10) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM pos_transactions
  WHERE transaction_number LIKE date_prefix || '%';

  new_number := date_prefix || '-' || LPAD(sequence_num::text, 6, '0');
  RETURN new_number;
END;
$$;

CREATE OR REPLACE FUNCTION generate_payment_link_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8));

    SELECT EXISTS(SELECT 1 FROM payment_links WHERE link_code = new_code) INTO code_exists;

    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_cash_reconciliation(p_session_id uuid)
RETURNS TABLE (
  expected_cash numeric,
  actual_cash numeric,
  difference numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.opening_cash + COALESCE(SUM(CASE
      WHEN t.payment_method = 'cash' THEN t.amount_tendered
      ELSE 0
    END), 0) as expected_cash,
    s.closing_cash as actual_cash,
    s.closing_cash - (s.opening_cash + COALESCE(SUM(CASE
      WHEN t.payment_method = 'cash' THEN t.amount_tendered
      ELSE 0
    END), 0)) as difference
  FROM pos_sessions s
  LEFT JOIN pos_transactions t ON t.session_id = s.id
  WHERE s.id = p_session_id
  GROUP BY s.id, s.opening_cash, s.closing_cash;
END;
$$;

-- Insertar terminales predeterminadas
INSERT INTO pos_terminals (terminal_number, terminal_name, location, is_active) VALUES
  ('CAJA-01', 'Almacén', 'Almacén Principal', true),
  ('CAJA-02', 'Local GJ', 'Local Gallardo Joyas', true),
  ('CAJA-03', 'Local 2', 'Local Secundario', true)
ON CONFLICT (terminal_number) DO NOTHING;

-- Insertar métodos de pago predeterminados
INSERT INTO payment_methods (name, display_name, type, requires_reference, commission_rate, sort_order) VALUES
  ('cash', 'Efectivo', 'cash', false, 0, 1),
  ('card', 'Tarjeta', 'card', true, 2.5, 2),
  ('transfer', 'Transferencia', 'transfer', true, 0, 3),
  ('mercadopago', 'Mercado Pago', 'digital_wallet', true, 3.49, 4),
  ('paypal', 'PayPal', 'digital_wallet', true, 4.2, 5)
ON CONFLICT (name) DO NOTHING;

-- Agregar columnas necesarias a la tabla orders si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'sale_channel'
  ) THEN
    ALTER TABLE orders ADD COLUMN sale_channel text DEFAULT 'remote';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pos_terminal_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN pos_terminal_id uuid REFERENCES pos_terminals(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'served_by'
  ) THEN
    ALTER TABLE orders ADD COLUMN served_by text;
  END IF;
END $$;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✓ Tablas del sistema POS creadas exitosamente';
  RAISE NOTICE '✓ 3 terminales agregadas: Almacén, Local GJ y Local 2';
  RAISE NOTICE '✓ 5 métodos de pago configurados';
  RAISE NOTICE '✓ Sistema POS listo para usar';
END $$;
