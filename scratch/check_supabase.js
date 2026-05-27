const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cdjuzogayydnenjrnajg.supabase.co';
// Use the service role key from .env.local
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkanV6b2dheXlkbmVuanJuYWpnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc3MzkyNiwiZXhwIjoyMDk1MzQ5OTI2fQ.EOJXdOF-iEzPq_8-pfxEJgllvD_OCTiZT9X_KmO8hSI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Profiles:');
  console.log(profiles);
}

check();
