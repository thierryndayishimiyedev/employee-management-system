const supabase = require('../config/supabase');
const { requireCompanyIds } = require('../utils/companyScope');
const { requireManagerUserId, scopeByManager } = require('../utils/managerScope');
const { normalizeRwandaPhone } = require('../utils/rwandaPhone');

const validPhone = (phone) => /^(?:\+?2507[2389]\d{7}|07[2389]\d{7})$/.test(String(phone || '').replace(/[^\d+]/g, ''));
const createShopkeeper = async ({ shopkeeper_name, phone }, user) => {
  if (!shopkeeper_name?.trim() || !validPhone(phone)) throw new Error('Shopkeeper name and a valid Rwanda mobile-money phone number are required.');
  const manager_user_id = requireManagerUserId(user); const company_id = requireCompanyIds(user)[0];
  const { data, error } = await supabase.from('shopkeepers').insert([{ company_id, manager_user_id, shopkeeper_name: shopkeeper_name.trim(), phone: normalizeRwandaPhone(phone), created_by: user.user_id }]).select().single();
  if (error) throw error; return data;
};
const getShopkeepers = async (user) => { let query = supabase.from('shopkeepers').select('*').in('company_id', requireCompanyIds(user)).order('created_at', { ascending: false }); query = scopeByManager(query, user); const { data, error } = await query; if (error) throw error; return data || []; };
module.exports = { createShopkeeper, getShopkeepers };
