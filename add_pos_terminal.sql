-- Script para agregar terminales POS al sistema
-- Ejecuta este script en el SQL Editor de Supabase

-- Insertar terminales POS
INSERT INTO pos_terminals (
  terminal_number,
  terminal_name,
  location,
  is_active,
  printer_config,
  scanner_config
) VALUES
(
  'CAJA-01',
  'Almacén',
  'Almacén Principal',
  true,
  '{"brand": "Zebra", "model": "ZD410", "paper_width": "58mm", "print_speed": "normal"}'::jsonb,
  '{"brand": "Honeywell", "model": "1900", "interface": "USB", "scan_mode": "auto"}'::jsonb
),
(
  'CAJA-02',
  'Local GJ',
  'Local Gallardo Joyas',
  true,
  '{"brand": "Zebra", "model": "ZD410", "paper_width": "58mm", "print_speed": "normal"}'::jsonb,
  '{"brand": "Honeywell", "model": "1900", "interface": "USB", "scan_mode": "auto"}'::jsonb
),
(
  'CAJA-03',
  'Local 2',
  'Local Secundario',
  true,
  '{"brand": "Zebra", "model": "ZD410", "paper_width": "58mm", "print_speed": "normal"}'::jsonb,
  '{"brand": "Honeywell", "model": "1900", "interface": "USB", "scan_mode": "auto"}'::jsonb
)
ON CONFLICT (terminal_number) DO UPDATE SET
  terminal_name = EXCLUDED.terminal_name,
  location = EXCLUDED.location,
  is_active = EXCLUDED.is_active,
  printer_config = EXCLUDED.printer_config,
  scanner_config = EXCLUDED.scanner_config,
  updated_at = now();

-- Verificar que las terminales se crearon correctamente
SELECT
  terminal_number,
  terminal_name,
  location,
  is_active,
  created_at
FROM pos_terminals
ORDER BY terminal_number;
