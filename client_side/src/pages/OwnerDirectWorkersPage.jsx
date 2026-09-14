import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, RefreshCw, TriangleAlert, UserRoundPlus, Wallet } from 'lucide-react'
import api from '../api/api'
import AppSidebar from './Appsidebar'

const today = () => new Date().toISOString().slice(0, 10)
const money = (value) => `${Number(value || 0).toLocaleString()} RWF`
const statusTone = (status) => status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'

export default function OwnerDirectWorkersPage() {
  const [rows, setRows] = useState([])
  const [companies, setCompanies] = useState([])
  const [managers, setManagers] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [payingId, setPayingId] = useState('')
  const [form, setForm] = useState({ company_id: '', manager_user_id: '', full_name: '', national_id: '', momo_phone: '', agreement_date: today(), agreed_amount: '', work_description: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [workersResult, companiesResult, managersResult] = await Promise.all([
        api.get('/owner-direct-workers'),
        api.get('/companies').catch(() => ({ data: { data: [] } })),
        api.get('/managers')
      ])
      const companyRows = companiesResult.data?.data || []
      setRows(workersResult.data?.data || [])
      setCompanies(companyRows)
      setManagers(managersResult.data?.data || [])
      if (!form.company_id && companyRows.length === 1) setForm((current) => ({ ...current, company_id: companyRows[0].company_id }))
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not load owner direct-worker deals.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totals = useMemo(() => ({
    deals: rows.length,
    due: rows.filter((row) => row.payment_status !== 'PAID').reduce((sum, row) => sum + Number(row.agreed_amount || 0), 0),
    paid: rows.filter((row) => row.payment_status === 'PAID').reduce((sum, row) => sum + Number(row.agreed_amount || 0), 0),
    failed: rows.filter((row) => row.payment_status === 'FAILED').reduce((sum, row) => sum + Number(row.agreed_amount || 0), 0)
  }), [rows])

  const submit = async (event) => {
    event.preventDefault()
    try {
      await api.post('/owner-direct-workers', form)
      setMessage('Direct-worker deal saved. It is not part of payroll, attendance, advances, or any manager/accountant records.')
      setForm({ company_id: form.company_id, manager_user_id: form.manager_user_id, full_name: '', national_id: '', momo_phone: '', agreement_date: today(), agreed_amount: '', work_description: '' })
      load()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not save the direct-worker deal.')
    }
  }

  const pay = async (row) => {
    if (!window.confirm(`Pay ${money(row.agreed_amount)} to ${row.full_name} on ${row.momo_phone}?`)) return
    setPayingId(row.direct_worker_id)
    try {
      const result = await api.post(`/owner-direct-workers/${row.direct_worker_id}/pay`)
      const provider = result.data?.data?.payment_provider || 'the configured payment provider'
      setMessage(`Payment marked successful by ${provider}. The payment reference and timestamp are saved as proof.`)
      load()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Payment failed. The reason is saved in the register for investigation.')
      load()
    } finally {
      setPayingId('')
    }
  }

  const availableManagers = managers.filter((manager) => !form.company_id || manager.employees?.company_id === form.company_id)
  const managerName = (managerUserId) => {
    const manager = managers.find((item) => item.user_id === managerUserId)
    return manager ? `${manager.employees?.first_name || ''} ${manager.employees?.last_name || ''}`.trim() || 'Assigned manager' : 'Assigned manager'
  }
  return <div className="flex min-h-screen bg-slate-50"><AppSidebar /><main className="min-w-0 flex-1 p-4 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Owner-controlled direct payments</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Owner direct workers</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Register personal work agreements that the Owner pays directly. These people remain outside the normal worker payroll, attendance, advance, manager, and accountant workflows.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"><RefreshCw size={17}/> Refresh</button></header>
    {message && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">{message}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={UserRoundPlus} label="Direct-worker deals" value={totals.deals} tone="blue"/><Metric icon={Wallet} label="Amount still due" value={money(totals.due)} tone="amber"/><Metric icon={CheckCircle2} label="Paid amount" value={money(totals.paid)} tone="green"/><Metric icon={TriangleAlert} label="Failed payment value" value={money(totals.failed)} tone="red"/></section>
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]"><form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">New direct-worker agreement</p><h2 className="mt-1 text-xl font-bold text-slate-900">Record agreed payment</h2><p className="mt-2 text-sm text-slate-600">Every direct worker is assigned to exactly one manager for tracking. An amount is required so the Owner knows exactly what will be paid.</p><div className="mt-5 grid gap-3"><select value={form.company_id} onChange={(event) => setForm({ ...form, company_id: event.target.value, manager_user_id: '' })} required={companies.length > 1} className="rounded-lg border border-slate-300 bg-white p-3"><option value="">{companies.length > 1 ? 'Select company' : 'Your authorized company'}</option>{companies.map((company) => <option key={company.company_id} value={company.company_id}>{company.company_name}</option>)}</select><select required value={form.manager_user_id || ''} onChange={(event) => setForm({ ...form, manager_user_id: event.target.value })} className="rounded-lg border border-slate-300 bg-white p-3"><option value="">Select the responsible manager</option>{availableManagers.map((manager) => <option key={manager.user_id} value={manager.user_id}>{manager.employees?.first_name} {manager.employees?.last_name}</option>)}</select><input required placeholder="Full name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} className="rounded-lg border border-slate-300 p-3"/><input required placeholder="National ID / identification number" value={form.national_id} onChange={(event) => setForm({ ...form, national_id: event.target.value })} className="rounded-lg border border-slate-300 p-3"/><input required placeholder="MTN MoMo number (078… or 079…)" value={form.momo_phone} onChange={(event) => setForm({ ...form, momo_phone: event.target.value })} className="rounded-lg border border-slate-300 p-3"/><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Agreement date<input required type="date" value={form.agreement_date} onChange={(event) => setForm({ ...form, agreement_date: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label><label className="text-sm font-medium text-slate-700">Agreed amount (RWF)<input required min="1" step="0.01" type="number" value={form.agreed_amount} onChange={(event) => setForm({ ...form, agreed_amount: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-3"/></label></div><textarea placeholder="Work, agreement, or payment note (optional)" value={form.work_description} onChange={(event) => setForm({ ...form, work_description: event.target.value })} className="min-h-24 rounded-lg border border-slate-300 p-3"/><button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"><UserRoundPlus size={18}/> Save direct-worker deal</button></div></form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 p-6"><CircleDollarSign className="text-blue-600"/><div><h2 className="text-xl font-bold text-slate-900">Direct payment register</h2><p className="mt-1 text-sm text-slate-600">Each row shows its assigned manager, agreed amount, payment status, proof, and failure reason.</p></div></div><div className="overflow-x-auto"><table className="min-w-[1060px] w-full text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr><th className="p-4">Worker / ID</th><th>Responsible manager</th><th>Agreement</th><th>MoMo number</th><th>Amount</th><th>Payment proof</th><th>Status</th><th className="p-4">Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.direct_worker_id} className="border-t border-slate-100 align-top"><td className="p-4"><strong className="text-slate-900">{row.full_name}</strong><br/><span className="text-slate-500">ID: {row.national_id}</span></td><td className="font-medium text-slate-700">{managerName(row.manager_user_id)}</td><td><span className="inline-flex items-center gap-1 text-slate-700"><CalendarDays size={15}/>{row.agreement_date}</span><br/><span className="text-xs text-slate-500">{row.work_description || 'No work note'}</span></td><td>{row.momo_phone}</td><td className="font-bold text-slate-900">{money(row.agreed_amount)}</td><td>{row.payment_status === 'PAID' ? <><span className="text-xs font-semibold text-emerald-700">{row.payment_provider || 'Provider'} · {row.paid_at ? new Date(row.paid_at).toLocaleString() : 'saved'}</span><br/><span className="break-all text-xs text-slate-500">{row.payment_reference || 'Reference unavailable'}</span></> : row.payment_status === 'FAILED' ? <span className="text-xs text-red-700">{row.payment_failure_reason || 'Provider did not confirm payment.'}</span> : <span className="text-xs text-slate-500">Not paid yet</span>}</td><td><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusTone(row.payment_status)}`}>{row.payment_status}</span></td><td className="p-4">{row.payment_status !== 'PAID' && <button disabled={payingId === row.direct_worker_id} onClick={() => pay(row)} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"><CreditCard size={14}/>{payingId === row.direct_worker_id ? 'Processing…' : row.payment_status === 'FAILED' ? 'Retry payment' : 'Pay now'}</button>}</td></tr>)}{!loading && !rows.length && <tr><td colSpan="8" className="p-8 text-center text-slate-500">No Owner direct-worker deal is recorded yet.</td></tr>}{loading && <tr><td colSpan="8" className="p-8 text-center text-slate-500">Loading direct-worker deals…</td></tr>}</tbody><tfoot className="border-t-2 border-blue-200 bg-blue-50 font-bold text-blue-950"><tr><td colSpan="4" className="p-4">All registered direct-worker deals</td><td>{money(rows.reduce((sum, row) => sum + Number(row.agreed_amount || 0), 0))}</td><td colSpan="3">Still due: {money(totals.due)} · Paid: {money(totals.paid)} · Failed: {money(totals.failed)}</td></tr></tfoot></table></div></section></section>
  </div></main></div>
}

function Metric({ icon: Icon, label, value, tone }) {
  const colors = { blue: 'border-blue-200 bg-blue-50 text-blue-950', amber: 'border-amber-200 bg-amber-50 text-amber-950', green: 'border-emerald-200 bg-emerald-50 text-emerald-950', red: 'border-red-200 bg-red-50 text-red-950' }
  return <article className={`rounded-2xl border p-5 shadow-sm ${colors[tone]}`}><Icon size={20}/><p className="mt-3 text-xs font-bold uppercase tracking-wider">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>
}
