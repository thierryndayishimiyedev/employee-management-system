import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeDollarSign, Building2, CalendarCheck, CreditCard, Mountain, Users, Wallet } from 'lucide-react'
import api from '../api/api'
import AppSidebar from './Appsidebar'
import { useOwnerManagerScope } from '../context/OwnerManagerScope'
import { LiveTrendChart } from '../components/DashboardKit'

const money = (value) => `${Number(value || 0).toLocaleString()} RWF`
const period = (item) => item.period_start && item.period_end ? `${item.period_start} to ${item.period_end}` : `${item.payroll_month || '-'} / ${item.payroll_year || '-'}`

export default function OwnerDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [paymentReadiness, setPaymentReadiness] = useState(null)
  const { managerId, setManagerId, managers } = useOwnerManagerScope()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (selectedManager = managerId) => {
    setLoading(true)
    setError('')
    try {
      const [dashboardResponse, readinessResponse] = await Promise.all([
        api.get('/dashboard/owner', { params: selectedManager ? { manager_user_id: selectedManager } : {} }),
        api.get('/payments/readiness')
      ])
      setDashboard(dashboardResponse.data?.data || dashboardResponse.data)
      setPaymentReadiness(readinessResponse.data?.data || readinessResponse.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load the live owner dashboard.')
    } finally { setLoading(false) }
  }
  useEffect(() => { load(managerId) }, [managerId])
  const chooseManager = (value) => setManagerId(value)
  const financial = dashboard?.financial || {}
  const operations = dashboard?.operations || {}
  const counts = dashboard?.counts || {}
  const tracking = dashboard?.owner_tracking || {}
  const managerName = (managerUserId) => (dashboard?.managers || []).find((manager) => manager.user_id === managerUserId)?.name || 'Company scope'
  const cards = [
    ['Companies', dashboard?.total_companies, Building2], ['Managers', dashboard?.total_managers, Users], ['Accountants', dashboard?.total_accountants, Users], ['Workers', counts.workers, Users],
    ['Ready to pay', money(financial.awaiting_payment), Wallet], ['Materials paid', money(financial.expenses_paid), CreditCard], ['Minerals extracted', operations.production_quantity, Mountain], ['Pending approvals', counts.pending_approvals, BadgeDollarSign],
  ]
  return <div className="flex min-h-screen bg-slate-50"><AppSidebar /><main className="min-w-0 flex-1 p-4 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Owner command center</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Company operations and financial overview</h1><p className="mt-2 text-sm text-slate-500">Every value is calculated from live records for your company and selected management unit.</p></div><label className="text-sm font-medium text-slate-700">Manager<select value={managerId} onChange={(e) => chooseManager(e.target.value)} className="mt-1 block w-64 rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="">All managers</option>{(managers.length ? managers : dashboard?.managers || []).map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select></label></div></header>
    {loading ? <div className="rounded-2xl border bg-white p-6 text-slate-500">Loading live dashboard data…</div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div> : <>
      <section className={`rounded-2xl border p-5 shadow-sm ${paymentReadiness?.wallet_balance_available ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/70'}`}><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Owner-only payment wallet</p><h2 className="mt-1 text-xl font-bold text-slate-900">Company MTN SIM balance</h2><p className="mt-1 text-sm text-slate-600">{paymentReadiness?.wallet_balance_available ? 'Live provider balance, shown only to the Owner.' : 'Balance is not connected yet. The system will never invent or estimate a SIM balance.'}</p></div><div className="rounded-xl border border-white bg-white/90 px-5 py-3 text-right shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available balance</p><p className="mt-1 text-2xl font-bold text-slate-900">{paymentReadiness?.wallet_balance_available ? money(paymentReadiness.wallet_balance) : 'Not connected'}</p></div></div><p className="mt-3 text-xs text-slate-500">Provider: {paymentReadiness?.provider || 'Checking…'} · {paymentReadiness?.message || 'Payment configuration is being checked.'}</p></section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <article data-dashboard-card key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="mb-4 h-5 w-5 text-amber-600" /><p className="text-xs font-semibold uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value ?? 0}</p></article>)}</section>
      <section className="grid gap-4 lg:grid-cols-2"><Panel title="Financial overview" rows={[["Payroll paid", money(financial.payroll_paid)], ["Advances paid", money(financial.advances_paid)], ["Materials & expenses paid", money(financial.expenses_paid)], ["Food supplies paid", money(financial.food_paid)], ["Shopkeepers ready to pay", money(financial.shopkeeper_ready_to_pay)], ["Failed payments", money(financial.failed_payments)]]} /><Panel title="Operational overview" rows={[["Present today", counts.present_today], ["Hours worked", operations.attendance_hours], ["Minerals extracted", operations.production_quantity], ["Food supplies recorded", operations.food_supplies], ["Materials recorded", operations.material_purchases], ["Tools / equipment units", operations.equipment_quantity], ["Expense value", money(financial.expenses_total)]]} /></section>
      <section className="grid gap-4 xl:grid-cols-3">
        <TrackingTable title="Approval tracking" description="All pending records, whether waiting for a manager or your final decision." rows={tracking.approvals} managerName={managerName} empty="No approval records are waiting." linkTo="/reports" />
        <TrackingTable title="Approved and ready to pay" description="Payments that can be paid now, including shopkeepers and food suppliers." rows={tracking.ready_payments} managerName={managerName} empty="No approved payments are waiting." linkTo="/payments" emphasis="blue" />
        <TrackingTable title="Failed payments" description="Review each failed record and its provider reason before taking action." rows={tracking.failed_payments} managerName={managerName} empty="No failed payments were found." linkTo="/payment-proof" emphasis="red" />
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full operational trace</p><h2 className="mt-1 text-xl font-semibold">Latest company activity</h2><p className="mt-1 text-sm text-slate-500">Every row is time-stamped and scoped to the selected manager or all managers.</p></div><span className="text-sm font-semibold text-slate-600">{(tracking.activity || []).length} recent records</span></div><div className="mt-5 overflow-x-auto"><table className="min-w-[780px] w-full text-sm"><thead><tr><th className="p-3 text-left">When</th><th className="p-3 text-left">Record</th><th className="p-3 text-left">Manager</th><th className="p-3 text-left">Details</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Amount / quantity</th></tr></thead><tbody>{(tracking.activity || []).map((item, index) => <tr key={`${item.type}-${item.date}-${index}`} className="border-t border-slate-100"><td className="p-3 whitespace-nowrap text-slate-600">{formatWhen(item.date)}</td><td className="p-3 font-semibold text-slate-800">{item.type}</td><td className="p-3">{managerName(item.manager_user_id)}</td><td className="p-3 text-slate-600">{item.detail || '—'}</td><td className="p-3"><StatusBadge status={item.status} /></td><td className="p-3 text-right font-semibold">{item.quantity !== undefined ? `${Number(item.quantity).toLocaleString()} kg` : money(item.amount)}</td></tr>)}{!(tracking.activity || []).length && <tr><td colSpan="6" className="p-6 text-center text-slate-500">No company activity has been recorded for this selection.</td></tr>}</tbody></table></div></section>
      <section className="grid gap-4 xl:grid-cols-2"><LiveTrendChart title="Payroll trend" description="Net payroll generated by date." data={dashboard?.charts?.payroll} color="#2563eb" valueFormatter={money} /><LiveTrendChart title="Advance trend" description="Advance requests created by date." data={dashboard?.charts?.advances} color="#f59e0b" type="bar" valueFormatter={money} /><LiveTrendChart title="Expense trend" description="Materials and operating expenses recorded by date." data={dashboard?.charts?.expenses} color="#16834a" valueFormatter={money} /><LiveTrendChart title="Payment trend" description="Completed payment records by date." data={dashboard?.charts?.payments} color="#2563eb" type="bar" valueFormatter={money} /><LiveTrendChart title="Attendance trend" description="Present workers recorded by date." data={dashboard?.charts?.attendance} dataKey="present" color="#16834a" type="bar" /><LiveTrendChart title="Production trend" description="Mineral quantity extracted by date." data={dashboard?.charts?.production} color="#2563eb" /></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-slate-400">Payroll by period</p><h2 className="mt-1 text-xl font-semibold">Approval and payment readiness</h2></div><Link to="/payments" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white">Open payment center</Link></div>{(dashboard?.payroll_periods || []).length ? <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-400"><tr><th className="p-2">Period</th><th className="p-2">Employees</th><th className="p-2">Gross</th><th className="p-2">Net</th><th className="p-2">Approval</th><th className="p-2">Payment</th></tr></thead><tbody>{dashboard.payroll_periods.map((item, index) => <tr key={index} className="border-t"><td className="p-2">{period(item)}</td><td className="p-2">{item.employees}</td><td className="p-2">{money(item.gross_salary)}</td><td className="p-2">{money(item.net_salary)}</td><td className="p-2">{item.approval_status}</td><td className="p-2">{item.payment_status}</td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-slate-500">No payroll records for this selection.</p>}</section>
      {!managerId && (dashboard?.comparison || []).length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Manager comparison</h2><p className="mt-1 text-sm text-slate-500">Compare real spending, material purchases, and mineral extraction across management units.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-400"><tr><th className="p-2">Manager</th><th>Workers</th><th>Payroll paid</th><th>Advances paid</th><th>Materials paid</th><th>Minerals extracted</th><th>Total spent</th></tr></thead><tbody>{dashboard.comparison.map((item) => <tr key={item.manager_user_id} className="border-t"><td className="p-2 font-semibold">{item.manager_name}</td><td>{item.workers}</td><td>{money(item.payroll_paid)}</td><td>{money(item.advances_paid)}</td><td>{money(item.expenses_paid)}</td><td>{item.minerals_extracted}</td><td className="font-semibold">{money(item.total_spent)}</td></tr>)}</tbody></table></div></section>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['/payroll','Review payroll'],['/advances','Review advances'],['/expenses','Review expenses'],['/payments','Pay approved items']].map(([to,label]) => <Link key={to} to={to} className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-amber-300">{label}</Link>)}</section>
    </>}</div></main></div>
}

function Panel({ title, rows }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><dl className="mt-4 space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between border-b border-slate-100 pb-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value ?? 0}</dd></div>)}</dl></section> }

function TrackingTable({ title, description, rows = [], managerName, empty, linkTo, emphasis = 'green' }) {
  const colors = emphasis === 'red' ? 'border-red-200 bg-red-50/60' : emphasis === 'blue' ? 'border-blue-200 bg-blue-50/50' : 'border-emerald-200 bg-emerald-50/50'
  return <section className={`rounded-2xl border p-5 shadow-sm ${colors}`}><div><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div><div className="mt-4 space-y-3">{rows.slice(0, 6).map((item, index) => <div key={`${item.type}-${item.date}-${index}`} className="rounded-xl border border-white bg-white/90 p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-800">{item.type}</p><p className="mt-1 text-xs text-slate-500">{managerName(item.manager_user_id)} · {formatWhen(item.date)}</p>{item.detail && <p className="mt-1 truncate text-xs text-slate-500">{item.detail}</p>}</div><StatusBadge status={item.status} /></div><div className="mt-2 flex items-center justify-between gap-2 text-sm"><span className="text-red-700">{item.reason || ''}</span><strong>{money(item.amount)}</strong></div></div>)}{rows.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">{empty}</p>}</div><Link to={linkTo} className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800">Open full record →</Link></section>
}

function StatusBadge({ status }) {
  const value = String(status || 'UNKNOWN').replaceAll('_', ' ')
  const color = value.startsWith('FAILED') ? 'bg-red-100 text-red-700' : value.includes('PAID') ? 'bg-emerald-100 text-emerald-700' : value.includes('APPROVED') || value === 'READY' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${color}`}>{value}</span>
}

function formatWhen(value) {
  if (!value) return 'Date not recorded'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: String(value).includes('T') ? 'short' : undefined })
}
