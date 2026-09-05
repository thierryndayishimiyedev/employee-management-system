import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeDollarSign, Building2, CalendarCheck, CreditCard, Mountain, Users, Wallet } from 'lucide-react'
import api from '../api/api'
import AppSidebar from './Appsidebar'
import { useOwnerManagerScope } from '../context/OwnerManagerScope'

const money = (value) => `${Number(value || 0).toLocaleString()} RWF`
const period = (item) => item.period_start && item.period_end ? `${item.period_start} to ${item.period_end}` : `${item.payroll_month || '-'} / ${item.payroll_year || '-'}`

export default function OwnerDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const { managerId, setManagerId, managers } = useOwnerManagerScope()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (selectedManager = managerId) => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/dashboard/owner', { params: selectedManager ? { manager_user_id: selectedManager } : {} })
      setDashboard(response.data?.data || response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load the live owner dashboard.')
    } finally { setLoading(false) }
  }
  useEffect(() => { load(managerId) }, [managerId])
  const chooseManager = (value) => setManagerId(value)
  const financial = dashboard?.financial || {}
  const operations = dashboard?.operations || {}
  const counts = dashboard?.counts || {}
  const cards = [
    ['Companies', dashboard?.total_companies, Building2], ['Managers', dashboard?.total_managers, Users], ['Accountants', dashboard?.total_accountants, Users], ['Workers', counts.workers, Users],
    ['Awaiting payment', money(financial.awaiting_payment), Wallet], ['Materials paid', money(financial.expenses_paid), CreditCard], ['Minerals extracted', operations.production_quantity, Mountain], ['Pending approvals', counts.pending_approvals, BadgeDollarSign],
  ]
  return <div className="flex min-h-screen bg-slate-50"><AppSidebar /><main className="flex-1 p-4 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Owner command center</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Company operations and financial overview</h1><p className="mt-2 text-sm text-slate-500">Every value is calculated from live records for your company and selected management unit.</p></div><label className="text-sm font-medium text-slate-700">Manager<select value={managerId} onChange={(e) => chooseManager(e.target.value)} className="mt-1 block w-64 rounded-lg border border-slate-200 bg-white px-3 py-2"><option value="">All managers</option>{(managers.length ? managers : dashboard?.managers || []).map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select></label></div></header>
    {loading ? <div className="rounded-2xl border bg-white p-6 text-slate-500">Loading live dashboard data…</div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><Icon className="mb-4 h-5 w-5 text-amber-600" /><p className="text-xs font-semibold uppercase text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value ?? 0}</p></article>)}</section>
      <section className="grid gap-4 lg:grid-cols-2"><Panel title="Financial overview" rows={[["Payroll paid", money(financial.payroll_paid)], ["Advances paid", money(financial.advances_paid)], ["Materials & expenses paid", money(financial.expenses_paid)], ["Materials ready to pay", money(financial.expenses_ready_to_pay)], ["Failed payments", money(financial.failed_payments)]]} /><Panel title="Operational overview" rows={[["Present today", counts.present_today], ["Hours worked", operations.attendance_hours], ["Minerals extracted", operations.production_quantity], ["Materials recorded", operations.material_purchases], ["Tools / equipment units", operations.equipment_quantity], ["Expense value", money(financial.expenses_total)]]} /></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-slate-400">Payroll by period</p><h2 className="mt-1 text-xl font-semibold">Approval and payment readiness</h2></div><Link to="/payments" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white">Open payment center</Link></div>{(dashboard?.payroll_periods || []).length ? <div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-400"><tr><th className="p-2">Period</th><th className="p-2">Employees</th><th className="p-2">Gross</th><th className="p-2">Net</th><th className="p-2">Approval</th><th className="p-2">Payment</th></tr></thead><tbody>{dashboard.payroll_periods.map((item, index) => <tr key={index} className="border-t"><td className="p-2">{period(item)}</td><td className="p-2">{item.employees}</td><td className="p-2">{money(item.gross_salary)}</td><td className="p-2">{money(item.net_salary)}</td><td className="p-2">{item.approval_status}</td><td className="p-2">{item.payment_status}</td></tr>)}</tbody></table></div> : <p className="mt-5 text-sm text-slate-500">No payroll records for this selection.</p>}</section>
      {!managerId && (dashboard?.comparison || []).length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Manager comparison</h2><p className="mt-1 text-sm text-slate-500">Compare real spending, material purchases, and mineral extraction across management units.</p><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-slate-400"><tr><th className="p-2">Manager</th><th>Workers</th><th>Payroll paid</th><th>Advances paid</th><th>Materials paid</th><th>Minerals extracted</th><th>Total spent</th></tr></thead><tbody>{dashboard.comparison.map((item) => <tr key={item.manager_user_id} className="border-t"><td className="p-2 font-semibold">{item.manager_name}</td><td>{item.workers}</td><td>{money(item.payroll_paid)}</td><td>{money(item.advances_paid)}</td><td>{money(item.expenses_paid)}</td><td>{item.minerals_extracted}</td><td className="font-semibold">{money(item.total_spent)}</td></tr>)}</tbody></table></div></section>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['/payroll','Review payroll'],['/advances','Review advances'],['/expenses','Review expenses'],['/payments','Pay approved items']].map(([to,label]) => <Link key={to} to={to} className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-amber-300">{label}</Link>)}</section>
    </>}</div></main></div>
}

function Panel({ title, rows }) { return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><dl className="mt-4 space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between border-b border-slate-100 pb-3 text-sm"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value ?? 0}</dd></div>)}</dl></section> }
