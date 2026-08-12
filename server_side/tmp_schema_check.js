require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const positions = await supabase
      .from('positions')
      .select('department_id,position_id,position_name')
      .limit(1);
    console.log('POSITIONS SAMPLE:', JSON.stringify(positions, null, 2));
  } catch (err) {
    console.error('POSITIONS SAMPLE ERROR:', err.message || err);
  }

  try {
    const columns = await supabase
      .from('information_schema.columns')
      .select('table_name,column_name')
      .eq('table_name', 'positions');
    console.log('POSITIONS COLUMNS:', JSON.stringify(columns, null, 2));
  } catch (err) {
    console.error('POSITIONS COLUMNS ERROR:', err.message || err);
  }
})();
