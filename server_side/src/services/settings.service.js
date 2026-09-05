const bcrypt = require('bcrypt'); const supabase = require('../config/supabase'); const { isSuperAdmin, requireCompanyIds } = require('../utils/companyScope');
const profile = async (user) => { if (isSuperAdmin(user)) { const {data,error}=await supabase.from('admins').select('admin_id,username,full_name,phone,email').eq('admin_id',user.admin_id).single();if(error)throw error;return data; } return { username:user.username, role_name:user.role_name }; };
const updateProfile = async (payload,user) => { if(!isSuperAdmin(user)) throw new Error('Only Super Admin profile changes are handled here.'); const updates={username:payload.username,full_name:payload.full_name,phone:payload.phone,email:payload.email}; if(payload.password){if(String(payload.password).length<8)throw new Error('Password must contain at least 8 characters.');updates.password=await bcrypt.hash(payload.password,10)} const {data,error}=await supabase.from('admins').update(updates).eq('admin_id',user.admin_id).select('admin_id,username,full_name,phone,email').single();if(error)throw error;return data; };
const accounts = async (user) => {
  if (user.role_name !== 'OWNER') throw new Error('Only owners can manage company accounts.');
  const companyIds = requireCompanyIds(user);
  // Do not embed food_suppliers under users: Supabase has two possible foreign
  // keys between these tables in some deployments, which makes that join ambiguous.
  const [usersResult, employeesResult, suppliersResult] = await Promise.all([
    supabase.from('users').select('user_id,employee_id,username,is_active,role_id'),
    supabase.from('employees').select('employee_id,company_id,first_name,last_name,phone,email'),
    supabase.from('food_suppliers').select('supplier_id,user_id,company_id,supplier_name,phone,email').in('company_id', companyIds)
  ]);
  if (usersResult.error || employeesResult.error || suppliersResult.error) throw usersResult.error || employeesResult.error || suppliersResult.error;
  const { data: roles, error: roleError } = await supabase.from('roles').select('role_id,role_name').in('role_name', ['MANAGER', 'ACCOUNTANT', 'FOOD_SUPPLIER']);
  if (roleError) throw roleError;
  const roleById = new Map((roles || []).map((role) => [role.role_id, role.role_name]));
  const employeeById = new Map((employeesResult.data || []).map((employee) => [employee.employee_id, employee]));
  return (usersResult.data || []).flatMap((account) => {
    const role_name = roleById.get(account.role_id); if (!role_name) return [];
    const supplier = (suppliersResult.data || []).find((row) => row.user_id === account.user_id);
    const employee = employeeById.get(account.employee_id);
    if (role_name === 'FOOD_SUPPLIER') return supplier ? [{ ...account, roles: { role_name }, food_suppliers: [supplier] }] : [];
    return employee && companyIds.includes(employee.company_id) ? [{ ...account, roles: { role_name }, employees: employee }] : [];
  });
};
const updateAccount = async(id,payload,user)=>{if(user.role_name!=='OWNER')throw new Error('Only the owner can change company account logins.');const rows=await accounts(user);const account=rows.find(x=>x.user_id===id);if(!account)throw new Error('Account is outside your company.');const updates={};if(payload.username?.trim())updates.username=payload.username.trim();if(payload.password){if(String(payload.password).length<8)throw new Error('Password must contain at least 8 characters.');updates.password=await bcrypt.hash(payload.password,10)}if(payload.is_active!==undefined)updates.is_active=Boolean(payload.is_active);const {data,error}=await supabase.from('users').update(updates).eq('user_id',id).select('user_id,username,is_active').single();if(error)throw error;return data;}; module.exports={profile,updateProfile,accounts,updateAccount};
