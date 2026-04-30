import { createClient } from '@supabase/supabase-js';

// No instalamos @vercel/node para ahorrar dependencias, usamos typing genérico
export default async function handler(req: any, res: any) {
  // Manejador para CORS opcional
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Fase de Verificación del Webhook (Petición GET desde Meta)
  if (req.method === 'GET') {
    // Meta Cloud API mandará estos query parameters:
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'gallardo_joyas_whatsapp_token_2026';

    // Verificamos que el modo sea "subscribe" y el token coincida
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).json({ error: 'Fallo la verificación' });
    }
  }

  // 2. Fase de Recepción de Mensajes (Petición POST desde Meta)
  if (req.method === 'POST') {
    // Extraemos el cuerpo (payload)
    const body = req.body;

    // Comprobamos si es un evento de webhook de la API de WhatsApp
    if (body.object === 'whatsapp_business_account') {

      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // O mejor el SERVICE_ROLE_KEY si tienes RLS restringido
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Iteramos los entries (pueden venir batch de mensajes)
        for (const entry of body.entry) {
          const changes = entry.changes[0];
          const value = changes.value;

          // Si el array existe significa que recibimos un mensaje nuevo (no es solo un ack de estado)
          if (value.messages && value.messages[0]) {
            const phoneNumberId = value.metadata.phone_number_id;
            const from = value.messages[0].from; // El número de teléfono remitente
            const msgBody = value.messages[0].text?.body || ''; // El texto del mensaje
            const messageId = value.messages[0].id;
            const timestamp = value.messages[0].timestamp;
            const contactName = value.contacts?.[0]?.profile?.name || 'Desconocido';

            console.log(`Mensaje recibido - De: ${from}, Contacto: ${contactName}, Texto: ${msgBody}`);

            // AQUI PODEMOS INSERTAR EN NUESTRAS TABLAS DEL CRM/MARKETING
            // Simularemos inserción a la tabla "crm_messages" 
            const { error } = await supabase
              .from('crm_messages') // Asumiendo que esta es tu tabla donde agrupas los chats
              .insert([{
                channel: 'whatsapp',
                message_id: messageId,
                sender_phone: from,
                sender_name: contactName,
                content: msgBody,
                direction: 'inbound',
                status: 'received',
                timestamp: new Date(timestamp * 1000).toISOString()
              }]);

            if (error) {
              console.error('Error insertando a Supabase:', error);
            }
          }
        }

        // Es muy importante retornar siempre un statusCode de 200 INMEDIATAMENTE
        // de lo contrario, Meta creerá que falló el webhook, e intentará reenviarlo una y otra vez
        return res.status(200).json({ status: 'ok' });

      } catch (error) {
        console.error('Error procesando webhook POST:', error);
        // Aun así mandamos un 200, pero registramos el error
        return res.status(200).json({ status: 'error_procesamiento', dev_error: String(error) });
      }

    } else {
      // Requerimientos meta dictan que debemos retornar 404 para eventos que no son de una cuenta whatsapp_business_account válida
      return res.status(404).json({ error: 'Not a whatsapp API event' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
