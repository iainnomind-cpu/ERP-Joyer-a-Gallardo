/*
  # Sistema POS para Gallardo Joyas - Parte 4: Funciones Auxiliares

  Funciones SQL para automatizar operaciones del POS:
  1. Generación de números de transacción
  2. Generación de números de sesión
  3. Generación de códigos de enlace de pago
  4. Cálculo automático de arqueo de caja
*/

-- Función: Generar número de transacción único
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS text AS $$
DECLARE
  last_number integer;
  new_number text;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM '[0-9]+') AS integer)), 0)
  INTO last_number
  FROM pos_transactions
  WHERE transaction_number ~ '^TXN-[0-9]+$';
  
  new_number := 'TXN-' || LPAD((last_number + 1)::text, 8, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Función: Generar código de sesión de caja
CREATE OR REPLACE FUNCTION generate_session_number()
RETURNS text AS $$
DECLARE
  today_date text;
  session_count integer;
  new_session text;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*)
  INTO session_count
  FROM pos_sessions
  WHERE session_number LIKE today_date || '-%';
  
  new_session := today_date || '-' || LPAD((session_count + 1)::text, 3, '0');
  RETURN new_session;
END;
$$ LANGUAGE plpgsql;

-- Función: Generar código único para enlace de pago
CREATE OR REPLACE FUNCTION generate_payment_link_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN 'PAY-' || result;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular arqueo de caja automáticamente
CREATE OR REPLACE FUNCTION calculate_cash_reconciliation(p_session_id uuid)
RETURNS TABLE (
  total_cash_sales numeric,
  total_cash_in numeric,
  total_cash_out numeric,
  expected_cash numeric,
  opening_cash numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN pt.payment_method = 'cash' THEN pt.amount_tendered - pt.change_given ELSE 0 END), 0) as total_cash_sales,
    COALESCE(SUM(CASE WHEN cm.movement_type IN ('cash_in', 'deposit') THEN cm.amount ELSE 0 END), 0) as total_cash_in,
    COALESCE(SUM(CASE WHEN cm.movement_type IN ('cash_out', 'withdrawal') THEN cm.amount ELSE 0 END), 0) as total_cash_out,
    ps.opening_cash + 
      COALESCE(SUM(CASE WHEN pt.payment_method = 'cash' THEN pt.amount_tendered - pt.change_given ELSE 0 END), 0) +
      COALESCE(SUM(CASE WHEN cm.movement_type IN ('cash_in', 'deposit') THEN cm.amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN cm.movement_type IN ('cash_out', 'withdrawal') THEN cm.amount ELSE 0 END), 0) as expected_cash,
    ps.opening_cash
  FROM pos_sessions ps
  LEFT JOIN pos_transactions pt ON pt.session_id = ps.id
  LEFT JOIN cash_movements cm ON cm.session_id = ps.id
  WHERE ps.id = p_session_id
  GROUP BY ps.id, ps.opening_cash;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener estadísticas de ventas del día
CREATE OR REPLACE FUNCTION get_daily_sales_stats(p_terminal_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_sales numeric,
  total_transactions integer,
  avg_ticket numeric,
  cash_sales numeric,
  card_sales numeric,
  digital_wallet_sales numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(o.total), 0) as total_sales,
    COUNT(pt.id)::integer as total_transactions,
    COALESCE(AVG(o.total), 0) as avg_ticket,
    COALESCE(SUM(CASE WHEN pt.payment_method = 'cash' THEN o.total ELSE 0 END), 0) as cash_sales,
    COALESCE(SUM(CASE WHEN pt.payment_method LIKE 'card%' THEN o.total ELSE 0 END), 0) as card_sales,
    COALESCE(SUM(CASE WHEN pm.type = 'digital_wallet' THEN o.total ELSE 0 END), 0) as digital_wallet_sales
  FROM pos_transactions pt
  JOIN orders o ON o.id = pt.order_id
  LEFT JOIN payment_methods pm ON pm.name = pt.payment_method
  WHERE DATE(pt.completed_at) = CURRENT_DATE
    AND (p_terminal_id IS NULL OR o.pos_terminal_id = p_terminal_id);
END;
$$ LANGUAGE plpgsql;
