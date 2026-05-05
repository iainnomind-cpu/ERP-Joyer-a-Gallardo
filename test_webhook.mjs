

const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          value: {
            metadata: {
              phone_number_id: '1000468656487231'
            },
            contacts: [
              {
                profile: { name: 'Test User' }
              }
            ],
            messages: [
              {
                from: '5215555555555',
                text: { body: 'Hola joyeria' }
              }
            ]
          }
        }
      ]
    }
  ]
};

async function testWebhook() {
  const res = await fetch('https://erp-joyer-a-gallardo.vercel.app/api/whatsapp-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

testWebhook();
