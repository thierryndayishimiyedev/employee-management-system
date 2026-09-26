const supabase = require('../config/supabase');
const { requireCompanyIds, resolveAuthorizedCompanyId } = require('../utils/companyScope');
const { assertManagerInCompany } = require('../utils/managerScope');

const ownerOnly = (user) => { if (user?.role_name !== 'OWNER') throw new Error('Only the Owner can configure night shifts.'); };
const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''));
const list = async (user) => { ownerOnly(user); const { data, error } = await supabase.from('night_shift_settings').select('*').in('company_id', requireCompanyIds(user)).order('configured_at', { ascending: false }); if (error) throw error; return data || []; };
const current = async (user) => {
  const companyIds = requireCompanyIds(user); const managerId = user?.role_name === 'ACCOUNTANT' ? (user?.manager_user_id || user?.employees?.manager_user_id) : user?.role_name === 'MANAGER' ? user?.user_id : null;
  let query = supabase.from('night_shift_settings').select('*').in('company_id', companyIds).eq('is_active', true);
  if (managerId) query = query.or(`manager_user_id.eq.${managerId},manager_user_id.is.null`);
  const { data, error } = await query.order('manager_user_id', { ascending: false }); if (error) throw error;
  return (data || []).find((item) => item.manager_user_id === managerId) || (data || []).find((item) => !item.manager_user_id) || null;
};
const save = async (payload, user) => {
  ownerOnly(user); const company_id = resolveAuthorizedCompanyId(user, payload.company_id); const manager_user_id = payload.manager_user_id || null;
  if (manager_user_id) await assertManagerInCompany(manager_user_id, company_id);
  if (!validTime(payload.starts_at) || !validTime(payload.ends_at) || payload.starts_at === payload.ends_at) throw new Error('Choose different valid night-shift start and end times.');
  const fixed_worker_rate_adjustment = Number(payload.fixed_worker_rate_adjustment || 0); const flexible_worker_rate_adjustment = Number(payload.flexible_worker_rate_adjustment || 0);
  if (!Number.isFinite(fixed_worker_rate_adjustment) || !Number.isFinite(flexible_worker_rate_adjustment)) throw new Error('Night-shift rate adjustments must be valid numbers.');
  let query = supabase.from('night_shift_settings').select('*').eq('company_id', company_id).eq('is_active', true);
  query = manager_user_id ? query.eq('manager_user_id', manager_user_id) : query.is('manager_user_id', null);
  const { data: existing, error: findError } = await query.maybeSingle(); if (findError) throw findError;
  const values = { starts_at: payload.starts_at, ends_at: payload.ends_at, fixed_worker_rate_adjustment, flexible_worker_rate_adjustment, is_active: payload.is_active !== false, configured_by: user.user_id, configured_at: new Date().toISOString() };
  const request = existing ? supabase.from('night_shift_settings').update(values).eq('night_shift_setting_id', existing.night_shift_setting_id) : supabase.from('night_shift_settings').insert([{ company_id, manager_user_id, ...values }]);
  const { data, error } = await request.select().single(); if (error) throw error; return data;
};
const close = async (id, user) => {
  ownerOnly(user);
  let query = supabase.from('night_shift_settings').select('*').eq('night_shift_setting_id', id).in('company_id', requireCompanyIds(user));
  const { data: plan, error } = await query.maybeSingle();
  if (error || !plan) throw new Error('Night-shift plan was not found for your company.');
  if (!plan.is_active) return plan;
  const { data, error: updateError } = await supabase.from('night_shift_settings')
    .update({ is_active: false, configured_by: user.user_id, configured_at: new Date().toISOString() })
    .eq('night_shift_setting_id', id).select().single();
  if (updateError) throw updateError;
  return data;
};
module.exports = { list, current, save, close };
