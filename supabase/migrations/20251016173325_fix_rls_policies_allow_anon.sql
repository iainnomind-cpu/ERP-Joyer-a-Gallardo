/*
  # Actualizar Políticas RLS para Permitir Acceso Anónimo

  ## Cambios
  - Actualizar todas las políticas RLS para permitir acceso tanto a usuarios autenticados como anónimos
  - Esto permite que la aplicación funcione sin sistema de autenticación implementado
  - Las políticas se pueden restringir nuevamente cuando se implemente autenticación

  ## Notas Importantes
  - Esta es una configuración temporal para desarrollo
  - En producción se debe implementar autenticación adecuada
*/

-- Eliminar políticas existentes restrictivas
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can manage customer_segments" ON customer_segments;
DROP POLICY IF EXISTS "Authenticated users can manage churn_alerts" ON churn_alerts;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage inventory_movements" ON inventory_movements;
DROP POLICY IF EXISTS "Authenticated users can manage stock_alerts" ON stock_alerts;
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can manage order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated users can manage business_rules" ON business_rules;
DROP POLICY IF EXISTS "Authenticated users can manage price_lists" ON price_lists;
DROP POLICY IF EXISTS "Authenticated users can manage promotions" ON promotions;

-- Crear nuevas políticas que permiten acceso público
CREATE POLICY "Allow all access to customers"
  ON customers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to customer_segments"
  ON customer_segments FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to churn_alerts"
  ON churn_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to products"
  ON products FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to inventory_movements"
  ON inventory_movements FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to stock_alerts"
  ON stock_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to orders"
  ON orders FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to order_items"
  ON order_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to business_rules"
  ON business_rules FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to price_lists"
  ON price_lists FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to promotions"
  ON promotions FOR ALL
  USING (true)
  WITH CHECK (true);