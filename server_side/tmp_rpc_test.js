require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const r = await supabase.rpc('pg_catalog.pg_table_is_visible', { table_name: 'positions' });
    console.log('RPC pg_table_is_visible:', JSON.stringify(r, null, 2));
  } catch (err) {
    console.error('RPC ERROR:', err);
  }
})();
