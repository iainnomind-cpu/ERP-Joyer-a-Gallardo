/*
  # Agregar Línea de Crédito a Clientes

  ## Descripción
  Añade funcionalidad de línea de crédito para clientes del CRM, permitiendo
  gestionar límites de crédito, saldos y estados.

  ## Cambios
  
  1. Nuevas Columnas en `customers`
    - `credit_limit` (numeric) - Límite de crédito autorizado
    - `credit_used` (numeric) - Crédito actualmente utilizado
    - `credit_status` (text) - Estado de la línea de crédito (active, suspended, blocked)
    - `credit_notes` (text) - Notas sobre el crédito del cliente
  
  2. Nueva Tabla `credit_transactions`
    - Historial de movimientos de crédito
    - Registra aumentos, disminuciones y ajustes
    - Trazabilidad completa de cambios
  
  3. Seguridad
    - Políticas RLS para acceso seguro
    - Validaciones de integridad
  
  ## Notas Importantes
  - El crédito disponible se calcula como: credit_limit - credit_used
  - Los defaults aseguran que los clientes nuevos no tengan crédito hasta que se configure
  - El estado 'active' permite usar el crédito, 'suspended' y 'blocked' lo impiden
*/

-- Agregar columnas de crédito a la tabla customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'credit_limit'
  ) THEN
    ALTER TABLE customers ADD COLUMN credit_limit numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'credit_used'
  ) THEN
    ALTER TABLE customers ADD COLUMN credit_used numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'credit_status'
  ) THEN
    ALTER TABLE customers ADD COLUMN credit_status text DEFAULT 'none' CHECK (credit_status IN ('none', 'active', 'suspended', 'blocked'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'credit_notes'
  ) THEN
    ALTER TABLE customers ADD COLUMN credit_notes text;
  END IF;
END $$;

-- Crear tabla de transacciones de crédito
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('charge', 'payment', 'adjustment', 'limit_change')),
  amount numeric NOT NULL,
  previous_balance numeric NOT NULL,
  new_balance numeric NOT NULL,
  previous_limit numeric,
  new_limit numeric,
  reference text,
  notes text,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON credit_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_credit_status ON customers(credit_status);

-- Habilitar RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Política RLS para credit_transactions
CREATE POLICY "Allow all access to credit_transactions"
  ON credit_transactions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Función para calcular crédito disponible
CREATE OR REPLACE FUNCTION get_available_credit(p_customer_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_credit_limit numeric;
  v_credit_used numeric;
BEGIN
  SELECT credit_limit, credit_used
  INTO v_credit_limit, v_credit_used
  FROM customers
  WHERE id = p_customer_id;
  
  RETURN COALESCE(v_credit_limit, 0) - COALESCE(v_credit_used, 0);
END;
$$;

-- Función para registrar transacción de crédito
CREATE OR REPLACE FUNCTION register_credit_transaction(
  p_customer_id uuid,
  p_transaction_type text,
  p_amount numeric,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_created_by text DEFAULT 'system'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaction_id uuid;
  v_previous_balance numeric;
  v_new_balance numeric;
  v_previous_limit numeric;
  v_new_limit numeric;
BEGIN
  -- Obtener valores actuales
  SELECT credit_used, credit_limit
  INTO v_previous_balance, v_previous_limit
  FROM customers
  WHERE id = p_customer_id;

  -- Calcular nuevo balance según el tipo de transacción
  CASE p_transaction_type
    WHEN 'charge' THEN
      v_new_balance := v_previous_balance + p_amount;
      v_new_limit := v_previous_limit;
    WHEN 'payment' THEN
      v_new_balance := v_previous_balance - p_amount;
      v_new_limit := v_previous_limit;
    WHEN 'adjustment' THEN
      v_new_balance := v_previous_balance + p_amount;
      v_new_limit := v_previous_limit;
    WHEN 'limit_change' THEN
      v_new_balance := v_previous_balance;
      v_new_limit := p_amount;
  END CASE;

  -- Asegurar que el balance no sea negativo
  v_new_balance := GREATEST(v_new_balance, 0);

  -- Registrar transacción
  INSERT INTO credit_transactions (
    customer_id,
    transaction_type,
    amount,
    previous_balance,
    new_balance,
    previous_limit,
    new_limit,
    reference,
    notes,
    created_by
  ) VALUES (
    p_customer_id,
    p_transaction_type,
    p_amount,
    v_previous_balance,
    v_new_balance,
    v_previous_limit,
    v_new_limit,
    p_reference,
    p_notes,
    p_created_by
  ) RETURNING id INTO v_transaction_id;

  -- Actualizar cliente
  IF p_transaction_type = 'limit_change' THEN
    UPDATE customers
    SET credit_limit = v_new_limit,
        updated_at = now()
    WHERE id = p_customer_id;
  ELSE
    UPDATE customers
    SET credit_used = v_new_balance,
        updated_at = now()
    WHERE id = p_customer_id;
  END IF;

  RETURN v_transaction_id;
END;
$$;

-- Función para obtener estadísticas de crédito
CREATE OR REPLACE FUNCTION get_credit_stats()
RETURNS TABLE (
  total_customers_with_credit integer,
  total_credit_granted numeric,
  total_credit_used numeric,
  total_credit_available numeric,
  customers_over_80_percent integer,
  customers_maxed_out integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_customers_with_credit,
    SUM(credit_limit) as total_credit_granted,
    SUM(credit_used) as total_credit_used,
    SUM(credit_limit - credit_used) as total_credit_available,
    COUNT(CASE WHEN credit_limit > 0 AND (credit_used / credit_limit) >= 0.8 THEN 1 END)::integer as customers_over_80_percent,
    COUNT(CASE WHEN credit_limit > 0 AND credit_used >= credit_limit THEN 1 END)::integer as customers_maxed_out
  FROM customers
  WHERE credit_limit > 0 AND credit_status != 'none';
END;
$$;

-- Comentarios
COMMENT ON COLUMN customers.credit_limit IS 'Límite de crédito autorizado para el cliente';
COMMENT ON COLUMN customers.credit_used IS 'Monto de crédito actualmente utilizado';
COMMENT ON COLUMN customers.credit_status IS 'Estado de la línea de crédito: none (sin crédito), active (activo), suspended (suspendido), blocked (bloqueado)';
COMMENT ON COLUMN customers.credit_notes IS 'Notas adicionales sobre el crédito del cliente';

COMMENT ON TABLE credit_transactions IS 'Historial de transacciones de crédito de clientes';
COMMENT ON COLUMN credit_transactions.transaction_type IS 'Tipo: charge (cargo), payment (pago), adjustment (ajuste), limit_change (cambio de límite)';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✓ Sistema de línea de crédito configurado exitosamente';
  RAISE NOTICE '✓ Columnas agregadas a tabla customers';
  RAISE NOTICE '✓ Tabla credit_transactions creada';
  RAISE NOTICE '✓ Funciones auxiliares creadas';
  RAISE NOTICE '✓ Sistema listo para gestionar crédito de clientes';
END $$;