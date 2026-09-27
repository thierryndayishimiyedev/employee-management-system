const crypto = require('crypto');
const bcrypt = require('bcrypt');
const supabase = require('../config/supabase');
const { sendEmail } = require('./email.service');

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const appUrl = () => String(process.env.CLIENT_APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
const generic = { message: 'If an eligible Owner or Super Admin account matches this email, a reset link has been sent.' };

async function eligibleAccount(email, role) {
  if (role === 'SUPER_ADMIN') {
    const { data } = await supabase.from('admins').select('admin_id,email,full_name').ilike('email', email).maybeSingle();
    return data?.email ? { type: 'SUPER_ADMIN', admin_id: data.admin_id, email: data.email, name: data.full_name || 'Super Admin' } : null;
  }
  if (role === 'OWNER') {
    const { data: ownerRole, error: roleError } = await supabase.from('roles').select('role_id').eq('role_name', 'OWNER').maybeSingle();
    if (roleError) throw roleError;
    if (!ownerRole) return null;
    // Newer owner registrations keep the email on company_owners.
    const { data: assignment, error: assignmentError } = await supabase.from('company_owners').select('owner_user_id,email,first_name,last_name').ilike('email', email).not('owner_user_id', 'is', null).limit(1).maybeSingle();
    if (assignmentError) throw assignmentError;
    if (assignment?.owner_user_id && assignment.email) {
      const { data: user, error } = await supabase.from('users').select('user_id').eq('user_id', assignment.owner_user_id).eq('role_id', ownerRole.role_id).maybeSingle();
      if (error) throw error;
      if (user) return { type: 'OWNER', user_id: user.user_id, email: assignment.email, name: [assignment.first_name, assignment.last_name].filter(Boolean).join(' ') || 'Owner' };
    }
    // Legacy Owner records may have the email only on employees. Support
    // those records without allowing any non-Owner role to use email reset.
    const { data: employees, error: employeeError } = await supabase.from('employees').select('employee_id,email,first_name,last_name').ilike('email', email).limit(5);
    if (employeeError) throw employeeError;
    const ids = (employees || []).map((item) => item.employee_id);
    if (!ids.length) return null;
    const { data: users, error: userError } = await supabase.from('users').select('user_id,employee_id').in('employee_id', ids).eq('role_id', ownerRole.role_id).limit(1);
    if (userError) throw userError;
    const user = users?.[0]; const employee = (employees || []).find((item) => item.employee_id === user?.employee_id);
    return user && employee?.email ? { type: 'OWNER', user_id: user.user_id, email: employee.email, name: [employee.first_name, employee.last_name].filter(Boolean).join(' ') || 'Owner' } : null;
  }
  return null;
}

async function requestReset({ email, role }, ip) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !['SUPER_ADMIN', 'OWNER'].includes(role)) return generic;
  const account = await eligibleAccount(normalized, role);
  if (!account) return generic; // Do not disclose whether an account exists.
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabase.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq(account.type === 'OWNER' ? 'user_id' : 'admin_id', account.type === 'OWNER' ? account.user_id : account.admin_id).is('used_at', null);
  const { error } = await supabase.from('password_reset_tokens').insert({ account_type: account.type, admin_id: account.admin_id || null, user_id: account.user_id || null, token_hash: hash(token), expires_at: expiresAt, requested_ip: ip || null });
  if (error) throw error;
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({ to: account.email, subject: 'Reset your Mining Operations password', text: `Hello ${account.name}, use this link within 30 minutes to reset your password: ${url}`, html: `<p>Hello ${account.name},</p><p>Use the link below within 30 minutes to reset your password.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>` });
  return generic;
}

async function resetPassword({ token, password }) {
  if (!token || String(password || '').length < 8) throw new Error('Password must contain at least 8 characters.');
  const { data: record, error } = await supabase.from('password_reset_tokens').select('*').eq('token_hash', hash(token)).is('used_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  if (!record) throw new Error('This reset link is invalid or has expired. Request a new link.');
  const passwordHash = await bcrypt.hash(password, 12);
  const target = record.account_type === 'SUPER_ADMIN' ? supabase.from('admins').update({ password: passwordHash }).eq('admin_id', record.admin_id) : supabase.from('users').update({ password: passwordHash }).eq('user_id', record.user_id);
  const { error: updateError } = await target;
  if (updateError) throw updateError;
  const { error: tokenError } = await supabase.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('password_reset_token_id', record.password_reset_token_id).is('used_at', null);
  if (tokenError) throw tokenError;
  return { message: 'Password reset successfully. You can now sign in.' };
}
module.exports = { requestReset, resetPassword };
