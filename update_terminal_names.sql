-- Script para actualizar los nombres de las terminales POS existentes
-- Ejecuta este script en el SQL Editor de Supabase

-- Actualizar nombres de terminales existentes
UPDATE pos_terminals
SET
  terminal_name = 'Almacén',
  location = 'Almacén Principal',
  updated_at = now()
WHERE terminal_number = 'CAJA-01';

UPDATE pos_terminals
SET
  terminal_name = 'Local GJ',
  location = 'Local Gallardo Joyas',
  updated_at = now()
WHERE terminal_number = 'CAJA-02';

-- Agregar tercera terminal si no existe
INSERT INTO pos_terminals (
  terminal_number,
  terminal_name,
  location,
  is_active,
  printer_config,
  scanner_config
) VALUES (
  'CAJA-03',
  'Local 2',
  'Local Secundario',
  true,
  '{"brand": "Zebra", "model": "ZD410", "paper_width": "58mm", "print_speed": "normal"}'::jsonb,
  '{"brand": "Honeywell", "model": "1900", "interface": "USB", "scan_mode": "auto"}'::jsonb
)
ON CONFLICT (terminal_number) DO NOTHING;

-- Verificar los cambios
SELECT
  terminal_number,
  terminal_name,
  location,
  is_active,
  updated_at
FROM pos_terminals
ORDER BY terminal_number;
