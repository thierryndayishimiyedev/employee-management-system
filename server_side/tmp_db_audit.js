require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const tables = [
    'admins', 'roles', 'companies', 'users', 'employees', 'departments', 'positions',
    'attendance', 'production', 'payroll', 'payments', 'salary_advances', 'reports', 'advance_requests'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`TABLE ${table} ERROR ${error.message}`);
        continue;
      }
      const keys = data && data[0] ? Object.keys(data[0]) : [];
      console.log(`TABLE ${table} COLUMNS ${keys.join(', ') || 'none'}`);
    } catch (e) {
      console.log(`TABLE ${table} EXCEPTION ${e.message}`);
    }
  }
})();
