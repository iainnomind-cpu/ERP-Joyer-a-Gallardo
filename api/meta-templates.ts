export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, category, language, components } = req.body;

    const META_TOKEN = process.env.VITE_META_BEARER_TOKEN || '';
    const WABA_ID = process.env.VITE_META_WABA_ID || ''; // WhatsApp Business Account ID

    if (!META_TOKEN || !WABA_ID) {
      return res.status(500).json({ 
        error: 'Las credenciales de Meta no están configuradas en las variables de entorno (VITE_META_BEARER_TOKEN y VITE_META_WABA_ID).' 
      });
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${WABA_ID}/message_templates`;

    const metaResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        category,
        language,
        components
      })
    });

    const data = await metaResponse.json();

    if (!metaResponse.ok) {
      return res.status(metaResponse.status).json({ 
        error: 'Error al enviar a Meta API', 
        details: data 
      });
    }

    return res.status(200).json({ 
      success: true, 
      meta_template_id: data.id, 
      status: data.status 
    });

  } catch (error) {
    console.error('Error in /api/meta-templates:', error);
    return res.status(500).json({ error: 'Error interno del servidor', details: String(error) });
  }
}
