/*
  # Función para Calcular Estadísticas de Crédito

  1. Nueva Función
    - `get_credit_stats()` - Calcula estadísticas agregadas del sistema de crédito
      - Total de clientes con línea de crédito
      - Crédito total otorgado
      - Crédito total usado
      - Crédito total disponible
      - Clientes con más del 80% de crédito usado
      - Clientes con crédito al límite (100%)

  2. Descripción
    Esta función proporciona un resumen completo del estado del sistema de crédito
    para mostrar en el dashboard del módulo CRM.
*/

-- Función para obtener estadísticas de crédito
CREATE OR REPLACE FUNCTION get_credit_stats()
RETURNS TABLE (
  totalCustomersWithCredit bigint,
  totalCreditGranted numeric,
  totalCreditUsed numeric,
  totalCreditAvailable numeric,
  customersOver80Percent bigint,
  customersMaxedOut bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total de clientes con línea de crédito
    COUNT(*) FILTER (WHERE credit_limit > 0)::bigint as totalCustomersWithCredit,

    -- Crédito total otorgado (suma de todos los límites)
    COALESCE(SUM(credit_limit) FILTER (WHERE credit_limit > 0), 0)::numeric as totalCreditGranted,

    -- Crédito total usado
    COALESCE(SUM(credit_used) FILTER (WHERE credit_limit > 0), 0)::numeric as totalCreditUsed,

    -- Crédito total disponible
    COALESCE(SUM(credit_limit - credit_used) FILTER (WHERE credit_limit > 0), 0)::numeric as totalCreditAvailable,

    -- Clientes con más del 80% de crédito usado
    COUNT(*) FILTER (
      WHERE credit_limit > 0
      AND credit_used::numeric / credit_limit::numeric >= 0.8
      AND credit_used < credit_limit
    )::bigint as customersOver80Percent,

    -- Clientes con crédito al límite (100%)
    COUNT(*) FILTER (
      WHERE credit_limit > 0
      AND credit_used >= credit_limit
    )::bigint as customersMaxedOut

  FROM customers;
END;
$$;

-- Dar permisos para que usuarios anónimos y autenticados puedan ejecutar la función
GRANT EXECUTE ON FUNCTION get_credit_stats() TO anon, authenticated;

-- Comentario para documentar la función
COMMENT ON FUNCTION get_credit_stats() IS 'Calcula y devuelve estadísticas agregadas del sistema de crédito para el dashboard del CRM';