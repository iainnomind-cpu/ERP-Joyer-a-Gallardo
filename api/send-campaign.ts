import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId } = req.body;
    if (!campaignId) {
      return res.status(400).json({ error: 'El campaignId es requerido' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
    const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
    const META_TOKEN = process.env.VITE_META_BEARER_TOKEN || '';
    const WABA_ID = process.env.VITE_META_WABA_ID || '';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !META_TOKEN || !WABA_ID) {
      console.error('Missing configuration variables');
      return res.status(500).json({ error: 'Configuración incompleta en el servidor' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Get Campaign setup
    const { data: campaign, error: campError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      throw new Error(`Campaña no encontrada: ${campError?.message}`);
    }

    // 2. Fetch the actual Template details from Supabase (to get its language/vars)
    const { data: templateData, error: tplError } = await supabase
      .from('whatsapp_templates')
      .select('name, language, components')
      .eq('name', campaign.message_template)
      .limit(1)
      .single();

    if (tplError || !templateData) {
      throw new Error(`La plantilla usada en esta campaña no existe en la base de datos o no está leíble. ${tplError?.message}`);
    }

    // 3. Fetch phone configurations from Meta to discover PHONE_ID
    const phoneRes = await fetch(`https://graph.facebook.com/v19.0/${WABA_ID}/phone_numbers`, {
      headers: { Authorization: `Bearer ${META_TOKEN}` }
    });
    const phoneData = await phoneRes.json();
    
    if (!phoneRes.ok || !phoneData.data || phoneData.data.length === 0) {
      throw new Error(`No se pudo extraer ningún Phone ID asociado al WABA. Respuesta: ${JSON.stringify(phoneData)}`);
    }
    const PHONE_ID = phoneData.data[0].id;

    // 4. Retrieve matching Customers parsing the exact segment filters
    const { data: segmentData } = await supabase
      .from('marketing_segments')
      .select('filters')
      .eq('id', campaign.target_segment.id)
      .single();

    if (!segmentData) throw new Error("Parámetros del segmento no encontrados");

    const cleanFilters = segmentData.filters;
    let query = supabase.from('customers').select('id, phone, name');

    if (cleanFilters.customerType === 'new') query = query.lte('total_purchases', 1);
    if (cleanFilters.customerType === 'frequent') query = query.gte('total_purchases', 2).lte('total_purchases', 5);
    if (cleanFilters.customerType === 'vip') query = query.gt('total_purchases', 5);
    if (cleanFilters.activity === 'recent') {
      const thirty = new Date(); thirty.setDate(thirty.getDate() - 30);
      query = query.gte('last_purchase_date', thirty.toISOString());
    }
    if (cleanFilters.activity === 'inactive') {
      const ninety = new Date(); ninety.setDate(ninety.getDate() - 90);
      query = query.lte('last_purchase_date', ninety.toISOString());
    }
    if (cleanFilters.material === 'oro') query = query.ilike('material_preference', '%Oro%');
    if (cleanFilters.material === 'plata') query = query.ilike('material_preference', '%Plata%');

    const { data: customers, error: custError } = await query;
    if (custError) throw new Error(`Ocurrió un error leyendo clientes: ${custError.message}`);

    if (!customers || customers.length === 0) {
      return res.status(200).json({ success: true, message: 'La campaña terminó, pero el segmento está vacío.', sent: 0, failed: 0 });
    }

    // 5. Build dynamic parameters mapping
    // (Logic moved inside loop)

    // 6. Loop and dispatch
    let sentCount = 0;
    let failedCount = 0;
    let lastError: string | null = null;

    // Wait minimally between requests to avoid rate limits entirely
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    for (const customer of customers) {
      if (!customer.phone) {
        failedCount++;
        continue;
      }
      
      // Clean phone number (Meta uses 521XXXXXXXXXX or similar for MX, needs to be clean numeric)
      const cleanPhone = customer.phone.replace(/\D/g, '');

      // Build Template Payload
      const templatePayload: any = {
        name: templateData.name,
        language: {
          code: templateData.language || 'es'
        },
        components: []
      };

      // 1. Analyze and inject HEADER parameters if needed
      const headerComponent = templateData.components?.find((c: any) => c.type === 'HEADER');
      if (headerComponent && headerComponent.format === 'IMAGE') {
        const defaultImg = "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=600&auto=format&fit=crop";
        const sampleUrl = headerComponent.example?.header_handle?.[0] || defaultImg;
        templatePayload.components.push({
          type: "header",
          parameters: [{ type: "image", image: { link: sampleUrl } }]
        });
      }

      // 2. Analyze and inject BODY parameters
      const bodyComponent = templateData.components?.find((c: any) => c.type === 'BODY');
      if (bodyComponent && bodyComponent.text) {
        // Count how many {{n}} variables exist in the string
        const varMatches = bodyComponent.text.match(/\{\{\d+\}\}/g);
        if (varMatches && varMatches.length > 0) {
          const bodyParams = varMatches.map((match: string, i: number) => {
            if (i === 0) return { type: "text", text: customer.name || "Apreciable Cliente" };
            if (i === 1) return { type: "text", text: "Joyería Gallardo" };
            return { type: "text", text: "Detalles especiales" };
          });
          templatePayload.components.push({
            type: "body",
            parameters: bodyParams
          });
        }
      }

      // If no components needed parameters, we must delete the empty array to avoid syntax errors
      if (templatePayload.components.length === 0) {
        delete templatePayload.components;
      }

      const metaRequest = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "template",
        template: templatePayload
      };

      try {
        const sendUrl = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`;
        const r = await fetch(sendUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${META_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metaRequest)
        });

        const fbResponse = await r.json();

        if (r.ok && fbResponse.messages) {
          sentCount++;
        } else {
          console.error(`Meta rejected send to ${cleanPhone}:`, fbResponse);
          failedCount++;
          lastError = fbResponse.error?.message || JSON.stringify(fbResponse);
        }
      } catch (err: any) {
        console.error(`Fetch exception to ${cleanPhone}:`, err);
        failedCount++;
        lastError = err.message;
      }

      // Backoff (250ms -> 4 msg/sec)
      await delay(250);
    }

    // 7. Update Campaign Stats
    const newStats = {
       ...campaign.stats,
       sent: (campaign.stats?.sent || 0) + sentCount,
       delivered: (campaign.stats?.delivered || 0) + sentCount, // Emulating delivered
       failed: (campaign.stats?.failed || 0) + failedCount
    };

    await supabase.from('marketing_campaigns')
      .update({
         stats: newStats,
         status: 'completed'
      })
      .eq('id', campaign.id);

    return res.status(200).json({ 
      success: true, 
      message: 'Campaña orquestada!',
      stats: { sent: sentCount, failed: failedCount },
      lastError
    });

  } catch (error: any) {
    console.error("Campaign API Error: ", error);
    return res.status(500).json({ error: error.message });
  }
}
