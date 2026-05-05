import { createClient } from '@supabase/supabase-js';

const supaUrl = 'https://bpcxruxnoeiknlvspvhe.supabase.co';
const supaKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwY3hydXhub2Vpa25sdnNwdmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDgzODQsImV4cCI6MjA4MDgyNDM4NH0.YTAe9_qUY4gPk69pRv0ck8FSeTwSi-qBrVHt5rfzxMI';
const supabase = createClient(supaUrl, supaKey);

async function test() {
  const { data, error } = await supabase.from('crm_messages').select('*').limit(5);
  if (error) {
    console.error('DB Error:', error);
  } else {
    console.log('Success, data:', data);
  }
}
test();
