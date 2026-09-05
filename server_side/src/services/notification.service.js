const supabase = require('../config/supabase');
const { requireCompanyIds } = require('../utils/companyScope');
const { requireManagerUserId, assertManagerInCompany } = require('../utils/managerScope');
const managerForUser = (user, requested) => user.role_name === 'OWNER' ? requested : requireManagerUserId(user);
const list = async (user) => {
  let q = supabase.from('operational_notifications').select('*').in('company_id', requireCompanyIds(user)).order('created_at', { ascending: true });
  if (user.role_name !== 'OWNER') q = q.eq('manager_user_id', requireManagerUserId(user));
  const { data, error } = await q; if (error) throw error;
  const ids = [...new Set((data || []).flatMap((row) => [row.sender_user_id, row.recipient_user_id]).filter(Boolean))];
  const { data: people, error: peopleError } = ids.length ? await supabase.from('users').select('user_id,username,employees!fk_user_employee(first_name,last_name)').in('user_id', ids) : { data: [], error: null };
  if (peopleError) throw peopleError;
  const names = new Map((people || []).map((person) => [person.user_id, [person.employees?.first_name, person.employees?.last_name].filter(Boolean).join(' ') || person.username]));
  return (data || []).map((row) => ({ ...row, sender_name: names.get(row.sender_user_id) || 'System user' }));
};
const send = async ({ manager_user_id, message }, user) => {
  if (!String(message || '').trim()) throw new Error('Write a message before sending.');
  const company_id = requireCompanyIds(user)[0]; const managerId = managerForUser(user, manager_user_id);
  if (!managerId) throw new Error('Select the manager conversation.'); await assertManagerInCompany(managerId, company_id);
  // recipient_user_id remains populated for compatibility with the original table;
  // visibility is controlled by the shared manager_user_id thread.
  const recipient_user_id = user.role_name === 'OWNER' ? managerId : user.user_id;
  const { data, error } = await supabase.from('operational_notifications').insert([{ company_id, manager_user_id: managerId, sender_user_id: user.user_id, recipient_user_id, subject: 'Operations chat', message: String(message).trim() }]).select().single();
  if (error) throw error; return data;
};
const read = async(id,user)=>{const {data,error}=await supabase.from('operational_notifications').update({is_read:true,read_at:new Date().toISOString()}).eq('notification_id',id).select().single();if(error)throw error;return data}; module.exports={list,send,read};
