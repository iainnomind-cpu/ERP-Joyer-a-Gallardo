INSERT INTO whatsapp_templates (name, category, language, status, components) VALUES 
(
  'promocion_temporada', 
  'MARKETING', 
  'es_MX', 
  'DRAFT', 
  '[{"type": "BODY", "text": "Hola {{1}}, descubre nuestra nueva colección de joyas. Tenemos piezas exclusivas de {{2}} elaboradas en {{3}}. Visítanos y encuentra el detalle perfecto."}]'::jsonb
),
(
  'recordatorio_limpieza', 
  'UTILITY', 
  'es_MX', 
  'DRAFT', 
  '[{"type": "HEADER", "format": "TEXT", "text": "Mantenimiento Joyería Gallardo"}, {"type": "BODY", "text": "Hola {{1}}, ha pasado un tiempo desde tu última compra. Te invitamos a traer tus joyas a mantenimiento gratuito para que siempre luzcan espectaculares."}]'::jsonb
),
(
  'felicitacion_cumpleanos', 
  'MARKETING', 
  'es_MX', 
  'DRAFT', 
  '[{"type": "BODY", "text": "¡Feliz cumpleaños {{1}}! 🎂 En Joyería Gallardo queremos celebrarte regalándote un 15% de descuento en tu próxima compra de {{2}} de {{3}}. Presenta este mensaje en tienda."}]'::jsonb
),
(
  'lanzamiento_exclusivo', 
  'MARKETING', 
  'es_MX', 
  'DRAFT', 
  '[{"type": "HEADER", "format": "TEXT", "text": "Lanzamiento Exclusivo VIP"}, {"type": "BODY", "text": "Hola {{1}}, por ser un cliente VIP te damos acceso anticipado a la nueva línea de {{2}} en {{3}}. ¡Reserva la tuya antes de que salgan al público general!"}]'::jsonb
),
(
  'agradecimiento_compra', 
  'UTILITY', 
  'es_MX', 
  'DRAFT', 
  '[{"type": "BODY", "text": "Hola {{1}}, gracias por tu reciente compra en Joyería Gallardo. Esperamos que disfrutes tus nuevas piezas de {{2}} de {{3}}. ¡Vuelve pronto!"}]'::jsonb
);
