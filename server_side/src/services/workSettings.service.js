const supabase = require('../config/supabase');
const { requireCompanyIds, resolveAuthorizedCompanyId } = require('../utils/companyScope');
const defaults = { sunday_work_allowed: false, standard_day_hours: 10 };
const getForCompany = async (companyId) => {
  const { data, error } = await supabase.from('company_work_settings').select('*').eq('company_id', companyId).maybeSingle();
  if (error) throw error;
  return { ...defaults, ...(data || {}), company_id: companyId };
};
const get = async (user) => getForCompany(requireCompanyIds(user)[0]);
const save = async (payload, user) => {
  if (user.role_name !== 'OWNER') throw new Error('Only the Owner can change company work settings.');
  const company_id = resolveAuthorizedCompanyId(user, payload.company_id);
  const standard_day_hours = Number(payload.standard_day_hours);
  if (!Number.isFinite(standard_day_hours) || standard_day_hours <= 0 || standard_day_hours > 24) throw new Error('Standard daily hours must be between 0 and 24.');
  const { data, error } = await supabase.from('company_work_settings').upsert({ company_id, sunday_work_allowed: Boolean(payload.sunday_work_allowed), standard_day_hours, updated_by: user.user_id, updated_at: new Date().toISOString() }, { onConflict: 'company_id' }).select().single();
  if (error) throw error;
  return data;
};
module.exports = { get, getForCompany, save };
