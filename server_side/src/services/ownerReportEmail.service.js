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
const number = (value) => Number(value || 0).toLocaleString();

const managerRows = (summary, dashboard) => [
  ['Workers', number(dashboard.counts?.workers)],
  ['Attendance records (present / absent)', `${number(summary.attendance_records)} (${number(summary.attendance_present)} / ${number(summary.attendance_absent)})`],
  ['Attendance hours recorded', number(summary.attendance_hours)],
  ['Attendance earned value', money(summary.fixed_workers_attendance_gross)],
  ['Fixed payroll records — gross / net', `${number(summary.payroll_records)} — ${money(summary.fixed_payroll_gross)} / ${money(summary.fixed_payroll_net)}`],
  ['Flexible work records / value', `${number(summary.flexible_work_days)} / ${money(summary.flexible_work_value)}`],
  ['Flexible payroll generated', money(summary.flexible_payroll_total)],
  ['Salary advance records / requested', `${number(summary.advance_records)} / ${money(summary.advances_total)}`],
  ['Worker consumptions (salary deductions)', `${number(summary.consumption_records)} / ${money(summary.consumptions_total)}`],
  ['Food supplies records / value', `${number(summary.food_supply_records)} / ${money(summary.food_total)}`],
  ['Expenses/materials records / value', `${number(summary.expense_records)} / ${money(summary.expenses_total)}`],
  ['Owner-direct workers', money(summary.owner_direct_workers_total)],
  ['Production records / minerals extracted', `${number(summary.production_records)} / ${number(summary.production_quantity)} kg`],
  ['Pending approvals', number(summary.pending_approvals)],
  ['Approved items ready for payment', money(summary.ready_to_pay)],
];

const tableHtml = (rows) => `<table cellspacing="0" style="border-collapse:collapse;width:100%;margin:10px 0 18px">${rows.map(([label, value]) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${label}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:700;text-align:right">${value ?? 0}</td></tr>`).join('')}</table>`;
const tableText = (rows) => rows.map(([label, value]) => `${label}: ${value ?? 0}`).join('\n');

async function managerTeam(companyId) {
  const { data, error } = await supabase.from('users')
    .select('user_id,username,employees!fk_user_employee!inner(company_id,manager_user_id,first_name,last_name),roles!inner(role_name)')
    .eq('employees.company_id', companyId)
    .in('roles.role_name', ['MANAGER', 'ACCOUNTANT']);
  if (error) throw error;
  const people = data || [];
  const displayName = (person) => [person.employees?.first_name, person.employees?.last_name].filter(Boolean).join(' ') || person.username || 'Unnamed user';
  return people.filter((person) => person.roles?.role_name === 'MANAGER').map((manager) => ({
    user_id: manager.user_id,
    name: displayName(manager),
    accountants: people.filter((person) => person.roles?.role_name === 'ACCOUNTANT' && person.employees?.manager_user_id === manager.user_id).map(displayName),
  }));
}

const adviceFor = (sections) => {
  const advice = [];
  sections.forEach((section) => {
    const { summary, dashboard, manager } = section;
    if (Number(summary.pending_approvals || 0) > 0) advice.push(`${manager.name}: review ${number(summary.pending_approvals)} pending approval(s) before they delay payment.`);
    if (Number(summary.ready_to_pay || 0) > 0) advice.push(`${manager.name}: ${money(summary.ready_to_pay)} is approved and ready for the Owner payment decision.`);
    if (Number(summary.production_quantity || 0) === 0 && Number(dashboard.counts?.workers || 0) > 0) advice.push(`${manager.name}: workers are registered but no production was recorded in this reporting period; confirm the production register is complete.`);
    if (Number(summary.food_total || 0) + Number(summary.expenses_total || 0) > Number(summary.fixed_workers_attendance_gross || 0) && Number(summary.fixed_workers_attendance_gross || 0) > 0) advice.push(`${manager.name}: food and operating costs are higher than recorded fixed-worker attendance value; review the supporting records.`);
  });
  const productive = [...sections].sort((a, b) => Number(b.summary.production_quantity || 0) - Number(a.summary.production_quantity || 0));
  if (productive.length > 1 && Number(productive[0].summary.production_quantity || 0) > Number(productive[productive.length - 1].summary.production_quantity || 0)) advice.push(`Comparison: ${productive[0].manager.name} recorded the highest extraction quantity (${number(productive[0].summary.production_quantity)} kg); compare work plans and record completeness with the other manager units.`);
  return advice.length ? advice : ['No exception needs attention from the saved records for this reporting period.'];
};

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
  const ownerScope = { role_name: 'OWNER', user_id: owner.owner_user_id, company_ids: [owner.company_id], company_id: owner.company_id };
  const dashboard = await getOwnerDashboard(ownerScope, { company_id: owner.company_id });
  const teams = await managerTeam(owner.company_id);
  const sections = await Promise.all(teams.map(async (manager) => {
    const managerDashboard = await getOwnerDashboard(ownerScope, { company_id: owner.company_id, manager_user_id: manager.user_id });
    const managerKey = type === 'DAILY' ? 'today' : type === 'WEEKLY' ? 'week' : 'month';
    return { manager, dashboard: managerDashboard, summary: managerDashboard.periods?.[managerKey] || {} };
  }));
  // Use the existing dashboard service as the single source of authorized,
  // manager-scoped saved figures. The delivery record stores the exact closed
  // period and prevents a duplicate delivery during the 23:59 minute.
  const key = type === 'DAILY' ? 'today' : type === 'WEEKLY' ? 'week' : 'month';
  const summary = dashboard.periods?.[key] || {}; const counts = dashboard.counts || {}; const operations = dashboard.operations || {};
  const subject = `${type[0]}${type.slice(1).toLowerCase()} Owner Operations Summary · ${range.start} to ${range.end}`;
  const companyRows = managerRows(summary, dashboard);
  // The company total includes owner-controlled items which do not belong to a
  // manager. Manager sections never expose another manager's data.
  const managerHtml = sections.length ? sections.map(({ manager, summary: managerSummary, dashboard: managerDashboard }) => {
    const accountants = manager.accountants.length ? manager.accountants.join(', ') : 'No accountant assigned';
    return `<section style="margin-top:24px"><h2 style="color:#123a76;margin-bottom:4px">Manager: ${manager.name}</h2><p style="margin-top:0">Accountant: ${accountants}</p>${tableHtml(managerRows(managerSummary, managerDashboard))}</section>`;
  }).join('') : '<p>No manager units are registered for this company.</p>';
  const managerText = sections.length ? sections.map(({ manager, summary: managerSummary, dashboard: managerDashboard }) => `\nMANAGER: ${manager.name}\nACCOUNTANT: ${manager.accountants.length ? manager.accountants.join(', ') : 'No accountant assigned'}\n${tableText(managerRows(managerSummary, managerDashboard))}`).join('\n') : '\nNo manager units are registered for this company.';
  const advice = adviceFor(sections);
  const adviceHtml = `<h2 style="color:#123a76">Owner review and comparison</h2><ul>${advice.map((item) => `<li style="margin:6px 0">${item}</li>`).join('')}</ul>`;
  try {
    await sendEmail({
      to: owner.email,
      subject,
      text: `${subject}\nPrepared from authorized saved company records only.\n\nCOMPANY TOTAL — ALL MANAGERS AND OWNER-CONTROLLED ACTIVITIES\n${tableText(companyRows)}${managerText}\n\nOWNER REVIEW AND COMPARISON\n${advice.map((item) => `- ${item}`).join('\n')}`,
      html: `<main style="font-family:Arial,sans-serif;color:#172033;max-width:820px"><h1 style="color:#123a76">${subject}</h1><p>Prepared from authorized saved company records only. Manager sections are restricted to their own operational unit.</p><h2 style="color:#123a76">Company total — all managers and owner-controlled activities</h2>${tableHtml(companyRows)}${managerHtml}${adviceHtml}</main>`,
    });
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
