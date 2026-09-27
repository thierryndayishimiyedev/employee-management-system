const supabase = require('../config/supabase');
const { configured, sendEmail } = require('./email.service');
const { getOwnerDashboard } = require('./dashboard.service');

// Rwanda has no daylight-saving changes. This can still be overridden for a
// deployed company, without relying on the server operating-system timezone.
const reportTimeZone = () => process.env.REPORT_TIMEZONE || 'Africa/Kigali';
const localParts = (now = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', {
    timeZone: reportTimeZone(), year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
    .filter(({ type }) => ['year', 'month', 'day', 'hour', 'minute'].includes(type))
    .map(({ type, value }) => [type, Number(value)]),
);
const isoDate = ({ year, month, day }) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const addLocalDays = (parts, days) => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return isoDate({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
};
const localWeekday = (parts) => new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay(); // Sunday = 0
const lastDayOfMonth = (parts) => new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();

// A report is the period which has just ended at 23:59, not an incomplete
// prior period. Weekly reports close Sunday; monthly reports close on the
// actual calendar end, including February 28/29.
const periodFor = (type, parts = localParts()) => {
  const end = isoDate(parts);
  if (type === 'DAILY') return { start: end, end };
  if (type === 'WEEKLY') return { start: addLocalDays(parts, -((localWeekday(parts) + 6) % 7)), end };
  return { start: `${parts.year}-${String(parts.month).padStart(2, '0')}-01`, end };
};
const dueTypes = (now = new Date()) => {
  const parts = localParts(now);
  // Do not send at startup, midday, or the following morning. The delivery
  // ledger makes the two checks during this minute harmlessly idempotent.
  if (parts.hour !== 23 || parts.minute !== 59) return [];
  const types = ['DAILY'];
  if (localWeekday(parts) === 0) types.push('WEEKLY');
  if (parts.day === lastDayOfMonth(parts)) types.push('MONTHLY');
  return types;
};
const money = (value) => `${Number(value || 0).toLocaleString()} RWF`;

async function recipients() {
  const { data, error } = await supabase.from('company_owners').select('company_id,owner_user_id,email,first_name,last_name').not('owner_user_id', 'is', null).not('email', 'is', null);
  if (error) throw error;
  return (data || []).filter((item) => item.email);
}
async function alreadyDelivered(owner, type, range) {
  const { data, error } = await supabase.from('owner_report_deliveries').select('owner_report_delivery_id').eq('company_id', owner.company_id).eq('owner_user_id', owner.owner_user_id).eq('report_type', type).eq('period_start', range.start).eq('period_end', range.end).eq('delivery_status', 'SENT').maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
async function deliver(owner, type, range) {
  if (await alreadyDelivered(owner, type, range)) return false;
  const dashboard = await getOwnerDashboard({ role_name: 'OWNER', user_id: owner.owner_user_id, company_ids: [owner.company_id], company_id: owner.company_id }, { company_id: owner.company_id });
  // Use the existing dashboard service as the source of authorized, saved
  // company figures. The delivery record stores the exact closed period.
  const key = type === 'DAILY' ? 'today' : type === 'WEEKLY' ? 'week' : 'month';
  const summary = dashboard.periods?.[key] || {}; const counts = dashboard.counts || {}; const operations = dashboard.operations || {};
  const subject = `${type[0]}${type.slice(1).toLowerCase()} Owner Operations Summary · ${range.start} to ${range.end}`;
  const rows = [['Workers', counts.workers], ['Gross worker salary', money(summary.fixed_payroll_gross)], ['Net worker salary', money(summary.fixed_payroll_net)], ['Flexible work', money(summary.flexible_work_value)], ['Advances requested', money(summary.advances_total)], ['Expenses and materials', money(summary.expenses_total)], ['Food supplies', money(summary.food_total)], ['Ready to pay', money(summary.ready_to_pay)], ['Minerals extracted', `${Number(operations.production_quantity || 0).toLocaleString()} kg`], ['Pending approvals', counts.pending_approvals]];
  const htmlRows = rows.map(([label, value]) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${label}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700">${value ?? 0}</td></tr>`).join('');
  try {
    await sendEmail({ to: owner.email, subject, text: `${subject}\n${rows.map(([label, value]) => `${label}: ${value ?? 0}`).join('\n')}`, html: `<h2>${subject}</h2><p>Prepared from authorized saved company records only.</p><table cellspacing="0">${htmlRows}</table>` });
    const { error } = await supabase.from('owner_report_deliveries').insert({ company_id: owner.company_id, owner_user_id: owner.owner_user_id, report_type: type, period_start: range.start, period_end: range.end, recipient_email: owner.email, delivery_status: 'SENT' }); if (error) throw error;
    return true;
  } catch (error) { await supabase.from('owner_report_deliveries').upsert({ company_id: owner.company_id, owner_user_id: owner.owner_user_id, report_type: type, period_start: range.start, period_end: range.end, recipient_email: owner.email, delivery_status: 'FAILED', failure_reason: error.message }, { onConflict: 'company_id,owner_user_id,report_type,period_start,period_end' }); throw error; }
}
async function runOwnerReportSchedule(now = new Date()) {
  if (!configured() || String(process.env.OWNER_REPORT_EMAILS_ENABLED).toLowerCase() !== 'true') return { skipped: true, reason: 'Email reports are disabled or SMTP is not configured.' };
  const types = dueTypes(now);
  if (!types.length) return { skipped: true, reason: 'Reports are sent only at 23:59 in the report timezone.' };
  const owners = await recipients(); const parts = localParts(now); let sent = 0; const failed = [];
  for (const type of types) for (const owner of owners) try { if (await deliver(owner, type, periodFor(type, parts))) sent += 1; } catch (error) { failed.push({ company_id: owner.company_id, type, error: error.message }); }
  return { sent, failed };
}
function startOwnerReportScheduler() {
  if (String(process.env.OWNER_REPORT_EMAILS_ENABLED).toLowerCase() !== 'true') return;
  // A startup check is safe: runOwnerReportSchedule sends only during 23:59.
  // It avoids missing the minute when the server comes online during it.
  const run = () => runOwnerReportSchedule().catch((error) => console.error('Owner report email run failed:', error.message));
  run();
  // Check several times within the closing minute. The delivery ledger makes
  // this idempotent while keeping reports at the end of the reporting day.
  setInterval(run, 15 * 1000).unref();
}
module.exports = { runOwnerReportSchedule, startOwnerReportScheduler, __test: { localParts, dueTypes, periodFor, lastDayOfMonth } };
