import { useState } from 'react'
import { BadgeDollarSign, CreditCard, Package, Pickaxe, ReceiptText, Users, Wallet } from 'lucide-react'

const money = (value) => `${Number(value || 0).toLocaleString()} RWF`
const labels = { today: 'Today', week: 'This week', month: 'This month', year: 'This year' }

const rangeLabel = (period) => {
  const today = new Date()
  const iso = (date) => date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  if (period === 'today') return iso(today)
  if (period === 'week') {
    const start = new Date(today)
    const weekday = start.getDay() || 7
    start.setDate(start.getDate() - weekday + 1)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${iso(start)} – ${iso(end)}`
  }
  if (period === 'month') return today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  return String(today.getFullYear())
}

function Metric({ icon: Icon, label, value, tone = 'blue', note }) {
  const tones = { blue: 'border-blue-200 bg-blue-50 text-blue-800', green: 'border-emerald-200 bg-emerald-50 text-emerald-800', amber: 'border-amber-200 bg-amber-50 text-amber-900', red: 'border-red-200 bg-red-50 text-red-800' }
  return <article className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide">{label}</p><Icon size={18} /></div><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>{note && <p className="mt-2 text-xs text-slate-600">{note}</p>}</article>
}

export default function PeriodOperationsCards({ periods = {}, title = 'Operations and payment overview' }) {
  const [period, setPeriod] = useState('week')
  const data = periods[period] || {}
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Real database totals · {rangeLabel(period)}</p><h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">Fixed payroll covers the 14-calendar-day cycle (up to 12 paid days). Gross is before deductions; net is after advances and worker consumptions.</p></div><div className="flex flex-wrap gap-2">{Object.keys(labels).map((key) => <button key={key} onClick={() => setPeriod(key)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${period === key ? 'bg-blue-600 text-white' : 'border border-blue-200 text-blue-700 hover:bg-blue-50'}`}>{labels[key]}</button>)}</div></div>
    <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-bold uppercase text-blue-800">Gross earned before deductions</p><p className="mt-2 text-sm text-slate-700">Attendance and worked days build the gross salary. An advance can only be requested from eligible unpaid work.</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase text-emerald-800">Net payroll settlement</p><p className="mt-2 text-sm text-slate-700">After biweekly payroll is generated, gross less advances and consumptions becomes the net amount due.</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold uppercase text-amber-800">No invented forecast</p><p className="mt-2 text-sm text-slate-700">Cards use saved attendance, flexible entries, approvals, and payments only—never estimated money.</p></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Wallet} label="Fixed workers — gross payroll" value={money(data.fixed_payroll_gross)} tone="blue" note="Generated gross before advances and consumptions"/><Metric icon={Wallet} label="Fixed workers — net payroll" value={money(data.fixed_payroll_net)} tone="green" note="Generated amount due after deductions"/><Metric icon={BadgeDollarSign} label="Advance deductions" value={`−${money(data.fixed_payroll_advances)}`} tone="amber" note="Taken from this period's fixed payroll"/><Metric icon={ReceiptText} label="Worker consumption deductions" value={`−${money(data.fixed_payroll_consumptions)}`} tone="red" note="Taken from this period's fixed payroll"/><Metric icon={Users} label="Flexible work recorded" value={money(data.flexible_work_value)} tone="blue" note={`${Number(data.flexible_work_days || 0)} actual flexible work day(s) recorded`}/><Metric icon={Wallet} label="Flexible weekly payroll" value={money(data.flexible_payroll_total)} tone="green" note="Separate weekly flexible-worker payroll generated"/><Metric icon={BadgeDollarSign} label="Advance requests" value={money(data.advances_total)} tone="amber" note="Requested in this period"/><Metric icon={CreditCard} label="Ready for owner payment" value={money(data.ready_to_pay)} tone="green" note="Approved payroll, advances, suppliers, shopkeepers, expenses, direct workers"/><Metric icon={Users} label="Owner direct workers" value={money(data.owner_direct_workers_total)} tone="blue" note={`${money(data.owner_direct_workers_due)} still due in this period`}/><Metric icon={Package} label="Food supplies" value={money(data.food_total)} tone="amber" note="Food supply value recorded"/><Metric icon={ReceiptText} label="Expenses & materials" value={money(data.expenses_total)} tone="red" note="Tools, fuel, equipment, materials"/><Metric icon={Package} label="Worker consumptions" value={money(data.consumptions_total)} tone="amber" note="Shopkeeper items recorded"/><Metric icon={Pickaxe} label="Minerals extracted" value={`${Number(data.production_quantity || 0).toLocaleString()} kg`} tone="blue" note={`${Number(data.pending_approvals || 0)} item(s) pending review`}/></div>
  </section>
}
