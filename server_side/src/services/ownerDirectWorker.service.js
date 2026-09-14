const { randomUUID } = require('crypto');
const supabase = require('../config/supabase');
const { requireCompanyIds, resolveAuthorizedCompanyId } = require('../utils/companyScope');
const { normalizeMtnRwandaPhone } = require('../utils/rwandaPhone');
const { getPaymentProvider } = require('./paymentProviders');
const { resolveManagerForWrite, assertManagerInCompany } = require('../utils/managerScope');

const assertOwner = (user) => { if (user?.role_name !== 'OWNER') throw new Error('Only the company owner can manage direct-worker deals.'); };
const listDirectWorkers = async (user) => { assertOwner(user); const { data, error } = await supabase.from('owner_direct_workers').select('*').in('company_id', requireCompanyIds(user)).eq('owner_user_id', user.user_id).order('agreement_date', { ascending: false }).order('created_at', { ascending: false }); if (error) throw error; return data || []; };
const getDirectWorker = async (id, user) => { const worker = (await listDirectWorkers(user)).find((row) => row.direct_worker_id === id); if (!worker) throw new Error('Direct worker was not found in your company scope.'); return worker; };
const createDirectWorker = async (payload, user) => {
  assertOwner(user); const company_id = resolveAuthorizedCompanyId(user, payload.company_id); const manager_user_id = resolveManagerForWrite(user, payload.manager_user_id); const full_name = String(payload.full_name || '').trim(); const national_id = String(payload.national_id || '').trim(); const agreed_amount = Number(payload.agreed_amount || 0);
  if (!manager_user_id) throw new Error('Select the one manager responsible for this direct worker.');
  await assertManagerInCompany(manager_user_id, company_id);
  if (!full_name || !national_id || !payload.agreement_date || !Number.isFinite(agreed_amount) || agreed_amount <= 0) throw new Error('Name, ID number, agreement date, and a positive agreed payment amount are required.');
  const momo_phone = normalizeMtnRwandaPhone(payload.momo_phone);
  const { data, error } = await supabase.from('owner_direct_workers').insert([{ company_id, owner_user_id: user.user_id, manager_user_id, full_name, national_id, momo_phone, agreement_date: payload.agreement_date, agreed_amount, work_description: String(payload.work_description || '').trim() || null }]).select().single();
  if (error?.code === '23505' || /ID or MTN number|another manager|Duplicate payment identity/i.test(String(error?.message || ''))) throw new Error('This national ID or MTN number is already registered to another worker or manager. Duplicate payment identity is impossible.'); if (error) throw error; return data;
};
const payDirectWorker = async (id, user) => {
  assertOwner(user); const worker = await getDirectWorker(id, user); if (worker.payment_status === 'PAID') throw new Error('This direct-worker deal has already been paid.');
  const { data: existing, error: existingError } = await supabase.from('owner_direct_worker_payments').select('direct_worker_payment_id, payment_status').eq('direct_worker_id', id).maybeSingle(); if (existingError) throw existingError; if (existing && existing.payment_status !== 'FAILED') throw new Error('A payment record already exists for this direct worker and is awaiting reconciliation.');
  const reference = `OWNER-DIRECT-${randomUUID()}`; const now = new Date().toISOString();
  // Reserve an idempotent ledger row first. If the provider answers but a later
  // database write fails, the deal stays pending reconciliation instead of
  // being incorrectly marked failed or sent a second time.
  const reservePayload = { payment_status: 'PENDING', provider_name: getPaymentProvider().name || 'INTERNAL', transaction_reference: reference, provider_response: null, paid_by: user.user_id, paid_at: now };
  const { error: reserveError } = existing
    ? await supabase.from('owner_direct_worker_payments').update(reservePayload).eq('direct_worker_id', id)
    : await supabase.from('owner_direct_worker_payments').insert([{ direct_worker_id: id, company_id: worker.company_id, amount: worker.agreed_amount, receiver_name: worker.full_name, receiver_phone: worker.momo_phone, ...reservePayload }]);
  if (reserveError) throw reserveError;
  let providerConfirmed = false;
  try {
    const transaction = await getPaymentProvider().processPayment({ reference_id: reference, amount: Number(worker.agreed_amount), receiver_phone: worker.momo_phone, phone: worker.momo_phone });
    providerConfirmed = true;
    const { error: paymentError } = await supabase.from('owner_direct_worker_payments').update({ payment_status: 'PAID', provider_name: transaction.provider || 'INTERNAL', transaction_reference: transaction.reference_id || reference, provider_response: transaction, paid_at: now }).eq('direct_worker_id', id); if (paymentError) throw paymentError;
    const { data, error } = await supabase.from('owner_direct_workers').update({ payment_status: 'PAID', payment_reference: transaction.reference_id || reference, payment_provider: transaction.provider || 'INTERNAL', payment_failure_reason: null, paid_at: now, updated_at: now }).eq('direct_worker_id', id).select().single(); if (error) throw error; return data;
  } catch (error) {
    if (providerConfirmed) throw new Error(`The provider confirmed this payment, but the platform could not finish saving its proof. Do not retry it; reconcile reference ${reference}.`);
    await supabase.from('owner_direct_worker_payments').update({ payment_status: 'FAILED', provider_response: { error: error.message } }).eq('direct_worker_id', id);
    await supabase.from('owner_direct_workers').update({ payment_status: 'FAILED', payment_failure_reason: error.message, updated_at: now }).eq('direct_worker_id', id);
    throw error;
  }
};
module.exports = { listDirectWorkers, createDirectWorker, payDirectWorker };
