import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;

// Supabase Setup
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // Idealmente SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

async function sendWhatsAppMessage(to: string, text: string) {
  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.error('Meta credentials missing');
    return;
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v17.0/${META_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text },
      }),
    });
    const data = await res.json();
    if (!res.ok) console.error('Error sending WA message:', data);
  } catch (e) {
    console.error('Fetch error sending WA message:', e);
  }
}

// ----------------------------------------------------------------------
// AI FUNCTIONS
// ----------------------------------------------------------------------

async function classifyInitialIntent(message: string): Promise<string> {
  const prompt = `Eres el sistema de inteligencia artificial encargado de clasificar la intención de los clientes de "Joyería Gallardo".
Tu único objetivo es analizar el mensaje del usuario y categorizarlo en una de las etiquetas permitidas para dirigir el flujo de la conversación.

Contexto: Joyería mexicana especializada en piezas finas y artesanales (anillos, collares, aretes, pulseras).

Entradas:
- Mensaje actual del usuario: "${message}"

INSTRUCCIONES:
1. Analiza el mensaje del usuario.
2. Clasifica la intención estrictamente en UNA de las siguientes categorías:

DEFINICIÓN DE CATEGORÍAS:
1. precios_mayoreo
2. ubicacion
3. ver_catalogo
4. coleccion_identificada
5. hacer_pedido
6. envios
7. otra

REGLAS DE SALIDA:
- Tu respuesta debe ser ÚNICAMENTE la palabra de la categoría en minúsculas.
- No escribas signos de puntuación, ni explicaciones.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0,
    max_tokens: 10,
  });
  return response.choices[0].message.content?.trim().toLowerCase() || 'otra';
}

async function extractCollection(message: string): Promise<string> {
  const prompt = `Actúa como un motor de extracción de entidades para el chatbot de Joyería Gallardo.
El usuario acaba de ver una lista de colecciones y debe escribir cuál le interesa. Tu trabajo es interpretar su respuesta y estandarizarla en UNA sola variable de salida.

ENTRADAS:
- Mensaje del usuario: "${message}"

INSTRUCCIONES DE MAPEO (devuelve la etiqueta en minúsculas sin signos):
1. piedra_natural
2. florentino
3. zirconias
4. perlas
5. monedas
6. ver_todo (Si dice "todas", "catálogo general")
7. otra_duda (Si hace pregunta, saluda, dice no o gracias)`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0,
    max_tokens: 10,
  });
  return response.choices[0].message.content?.trim().toLowerCase() || 'otra_duda';
}

async function resolveDoubt(history: string, message: string, intent: string): Promise<string> {
  const prompt = `Eres Gema, la asesora ejecutiva de Joyería Gallardo. 
Tu objetivo es responder con precisión técnica y guiar al usuario hacia el catálogo con una persuasión natural y profesional.

INFORMACIÓN DEL NEGOCIO:
- Ubicación: Paseo del Hospicio #65, locales A y B.
- Horarios: Lunes a Viernes 9 AM – 6 PM | Sábados 9 AM – 3 PM.
- Mayoreo: Mínimo de compra 3 piezas para precio de mayoreo.
- Precios: Desde $250.
- Envíos: A todo México.

ENTRADAS:
- Historial de conversación: "${history}"
- Mensaje actual: "${message}"
- Intención: ${intent}

REGLAS DE RESPUESTA:
1. Responde la duda exacta (Si pregunta precio, no hables de mayoreo y viceversa).
2. Tono: Ejecutivo, formal, < 40 palabras.
3. Si pide humano o asesor, diles que transferirás a un asesor y cierra la duda.
Genera solo el texto de respuesta:`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.7,
    max_tokens: 100,
  });
  return response.choices[0].message.content?.trim() || 'Un momento, por favor.';
}

async function classifyHybrid(lastBotMessage: string, userMessage: string): Promise<string> {
  const prompt = `Actúa como un clasificador de intención híbrido para Joyería Gallardo.
ENTRADAS:
- Último mensaje del bot: "${lastBotMessage}"
- Mensaje del usuario: "${userMessage}"

GRUPO A: piedra_natural, florentino, zirconias, perlas, monedas, ver_todo
GRUPO B: hacer_pedido, seguir_preguntando, finalizar

Regla: Si pide un humano, es seguir_preguntando. Si responde "sí", lee qué le ofreció el bot (ej. catálogo -> ver_catalogo).
Devuelve ÚNICAMENTE la palabra clave en minúsculas sin puntos.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0,
    max_tokens: 10,
  });
  return response.choices[0].message.content?.trim().toLowerCase() || 'seguir_preguntando';
}

// ----------------------------------------------------------------------
// MAIN HANDLER
// ----------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'gallardo_joyas_whatsapp_token_2026';
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Fallo la verificación' });
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      try {
        for (const entry of body.entry) {
          const changes = entry.changes[0];
          const value = changes.value;

          if (value.messages && value.messages[0]) {
            const from = value.messages[0].from;
            const msgBody = value.messages[0].text?.body || '';
            const contactName = value.contacts?.[0]?.profile?.name || 'Desconocido';

            console.log(`[WA] De: ${from} | Texto: ${msgBody}`);

            // 1. Obtener o crear Chat
            let { data: chat } = await supabase.from('crm_chats').select('*').eq('phone_number', from).maybeSingle();
            
            let isFirstTime = false;
            if (!chat) {
              const { data: newChat } = await supabase.from('crm_chats').insert([{
                phone_number: from,
                customer_name: contactName,
                last_message: msgBody,
                bot_state: 'initial'
              }]).select('*').single();
              chat = newChat;
              isFirstTime = true;
            } else {
              await supabase.from('crm_chats').update({ last_message: msgBody, last_message_at: new Date().toISOString(), unread_count: chat.unread_count + 1 }).eq('id', chat.id);
            }

            // Guardar el mensaje del usuario
            await supabase.from('crm_messages').insert([{
              chat_id: chat.id,
              content: msgBody,
              role: 'user'
            }]);

            // Comprobar si pide hablar con un humano
            const askForHuman = msgBody.toLowerCase().match(/(humano|asesor|persona|operador)/);
            if (askForHuman && chat.status !== 'paused') {
              await supabase.from('crm_chats').update({ status: 'paused', requires_attention: true }).eq('id', chat.id);
              await supabase.from('crm_messages').insert([{ chat_id: chat.id, content: 'El cliente solicitó un humano. Bot pausado.', role: 'system' }]);
              await sendWhatsAppMessage(from, "He pausado mi sistema automático. Un asesor se pondrá en contacto contigo a la brevedad.");
              return res.status(200).json({ status: 'ok' });
            }

            if (chat.status === 'paused') {
              // El bot está pausado, no hace nada
              return res.status(200).json({ status: 'ok' });
            }

            let botResponseText = "";
            let newBotState = chat.bot_state;
            const history = "Mensaje previo: ..."; // Simplified history

            // Lógica principal de la máquina de estados
            if (isFirstTime || chat.bot_state === 'initial') {
              if (isFirstTime) {
                botResponseText = `💎 ¡Hola! Bienvenido(a) a Joyería Gallardo, ${contactName}.\nSoy Gema, tu asistente virtual 💍\n\nPuedo ayudarte a explorar nuestras colecciones, realizar un pedido o resolver cualquier duda que tengas.\n\nCuéntame, ¿en qué puedo apoyarte hoy?`;
                await sendWhatsAppMessage(from, botResponseText);
                await supabase.from('crm_messages').insert([{ chat_id: chat.id, content: botResponseText, role: 'assistant' }]);
                continue; // Wait for next reply to classify
              }

              const intent = await classifyInitialIntent(msgBody);
              if (intent === 'ver_catalogo') {
                botResponseText = `💎 ¡Perfecto, ${contactName}!\nEstas son nuestras colecciones actuales:\n\n✨ Piedra Natural\n🌀 Florentino\n💍 Zirconias\n🤍 Perlas\n🪙 Monedas\n\nEscribe el nombre de la colección que te interesa (por ejemplo: Zirconias) y te mostraré esa parte del catálogo.`;
                newBotState = 'awaiting_collection';
              } else if (intent === 'hacer_pedido') {
                botResponseText = `¡Qué buen gusto, ${contactName}! 😍\n\nAquí tienes toda nuestra colección exclusiva.\nAhí mismo podrás ver los precios y realizar tu pedido directamente de forma fácil y segura.\n\n👉 https://erp-joyer-a-gallardo.vercel.app/ecommerce`;
                newBotState = 'awaiting_hybrid';
              } else if (intent === 'coleccion_identificada') {
                // Pass directly to collection extraction
                const collection = await extractCollection(msgBody);
                botResponseText = `¡Qué buen gusto, ${contactName}! 😍\nAquí tienes nuestra colección exclusiva de ${collection}.\n\nPara entrar, por favor toca el enlace: https://erp-joyer-a-gallardo.vercel.app/ecommerce`;
                newBotState = 'awaiting_hybrid';
              } else {
                botResponseText = await resolveDoubt(history, msgBody, intent);
                newBotState = 'awaiting_hybrid';
              }

            } else if (chat.bot_state === 'awaiting_collection') {
              const collection = await extractCollection(msgBody);
              if (collection === 'otra_duda') {
                botResponseText = await resolveDoubt(history, msgBody, 'otra_duda');
                newBotState = 'awaiting_hybrid';
              } else if (collection === 'ver_todo') {
                botResponseText = `¡Qué buen gusto, ${contactName}! 😍\nAquí tienes toda nuestra colección exclusiva.\n\n👉 https://erp-joyer-a-gallardo.vercel.app/ecommerce`;
                newBotState = 'awaiting_hybrid';
              } else {
                botResponseText = `¡Qué buen gusto, ${contactName}! 😍\nAquí tienes nuestra colección exclusiva de ${collection}.\n\nPara entrar, por favor toca el enlace: https://erp-joyer-a-gallardo.vercel.app/ecommerce`;
                newBotState = 'awaiting_hybrid';
              }

            } else if (chat.bot_state === 'awaiting_hybrid') {
              const lastBotMsg = chat.last_message || '';
              const intent = await classifyHybrid(lastBotMsg, msgBody);
              
              const isCollection = ['piedra_natural', 'florentino', 'zirconias', 'perlas', 'monedas'].includes(intent);
              
              if (isCollection) {
                botResponseText = `¡Excelente elección! Aquí tienes nuestra colección de ${intent}.\n\n👉 https://erp-joyer-a-gallardo.vercel.app/ecommerce`;
              } else if (intent === 'ver_todo' || intent === 'ver_catalogo') {
                botResponseText = `¡Perfecto! Aquí tienes toda nuestra colección exclusiva.\n\n👉 https://erp-joyer-a-gallardo.vercel.app/ecommerce`;
              } else if (intent === 'hacer_pedido') {
                botResponseText = `¡Perfecto! Puedes hacer tu pedido seguro aquí:\n\n👉 https://erp-joyer-a-gallardo.vercel.app/ecommerce`;
              } else if (intent === 'finalizar') {
                botResponseText = `¡Entendido, ${contactName}! 💎\nMuchas gracias por tu interés. Aquí quedamos a la orden para cuando gustes ver modelos nuevos o iniciar tu pedido.\n\n✨ No olvides seguirnos en Instagram: @joyasgallardo`;
                newBotState = 'initial'; // Reset state
              } else {
                // seguir_preguntando o otra_duda
                botResponseText = await resolveDoubt(history, msgBody, intent);
              }
            }

            if (botResponseText) {
              await sendWhatsAppMessage(from, botResponseText);
              await supabase.from('crm_messages').insert([{ chat_id: chat.id, content: botResponseText, role: 'assistant' }]);
            }
            if (newBotState !== chat.bot_state) {
              await supabase.from('crm_chats').update({ bot_state: newBotState }).eq('id', chat.id);
            }
          }
        }
        return res.status(200).json({ status: 'ok' });
      } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(200).json({ status: 'error_procesamiento' });
      }
    } else {
      return res.status(404).json({ error: 'Not a whatsapp API event' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
