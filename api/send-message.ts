// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { to, text } = req.body;
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || '1000468656487231';

  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    return res.status(500).json({ error: 'Meta credentials missing' });
  }

  try {
    const fetchRes = await fetch(`https://graph.facebook.com/v17.0/${META_PHONE_NUMBER_ID}/messages`, {
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
    
    const data = await fetchRes.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
