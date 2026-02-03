/*
  # Sistema POS para Gallardo Joyas - Parte 1: Terminales y Sesiones

  1. Terminales de Punto de Venta
    - Gestión de cajas registradoras físicas
    - Configuración de impresoras y escáneres
    
  2. Sesiones de Caja
    - Control de apertura y cierre diario
    - Arqueo de caja y conciliación de efectivo
*/

-- Terminales de Punto de Venta
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

-- Sesiones de Caja (Apertura y Cierre)
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_pos_sessions_terminal ON pos_sessions(terminal_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opened_at ON pos_sessions(opened_at);

-- RLS
ALTER TABLE pos_terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pos_terminals" ON pos_terminals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to pos_sessions" ON pos_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Terminal predeterminada
INSERT INTO pos_terminals (terminal_number, terminal_name, location) VALUES
  ('CAJA-01', 'Caja Principal', 'Centro Joyero - Planta Baja')
ON CONFLICT (terminal_number) DO NOTHING;
