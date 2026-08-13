import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import AppSidebar from './Appsidebar'

const today = new Date().toISOString().slice(0, 10)
const unwrap = (response) => response?.data?.data ?? response?.data ?? response
const money = (value) => value == null ? 'Not priced' : `${Number(value).toLocaleString()} RWF`

export default function ProductionPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ employee_id: '', production_date: today, mineral_type: '', quantity: '', unit: 'kg', unit_price: '', activity_details: '', working_hours: '', remarks: '', workers: [] })
  const [expense, setExpense] = useState({ expense_date: today, description: '', amount: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [production, employeeList] = await Promise.all([api.get('/production'), api.get('/employees')])
      setRecords(Array.isArray(unwrap(production)) ? unwrap(production) : [])
      setWorkers(Array.isArray(unwrap(employeeList)) ? unwrap(employeeList) : [])
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to load production operations') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const grossPreview = useMemo(() => Number(form.quantity || 0) * Number(form.unit_price || 0), [form.quantity, form.unit_price])
  const canRecord = user?.role_name === 'ACCOUNTANT' || user?.role_name === 'SUPER_ADMIN'
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const toggleWorker = (employee_id) => setForm(current => ({ ...current, workers: current.workers.some(w => w.employee_id === employee_id) ? current.workers.filter(w => w.employee_id !== employee_id) : [...current.workers, { employee_id, working_hours: '' }] }))
  const setWorkerHours = (employee_id, working_hours) => setForm(current => ({ ...current, workers: current.workers.map(w => w.employee_id === employee_id ? { ...w, working_hours } : w) }))

  const saveProduction = async (event) => {
    event.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, quantity: Number(form.quantity), unit_price: form.unit_price === '' ? null : Number(form.unit_price), working_hours: form.working_hours === '' ? null : Number(form.working_hours), workers: form.workers.map(w => ({ ...w, working_hours: w.working_hours === '' ? null : Number(w.working_hours) })) }
      const created = unwrap(await api.post('/production', payload))
      toast.success('Production operation recorded')
      setSelected(created); setForm({ employee_id: '', production_date: today, mineral_type: '', quantity: '', unit: 'kg', unit_price: '', activity_details: '', working_hours: '', remarks: '', workers: [] }); await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to record production') }
    finally { setSaving(false) }
  }
  const saveExpense = async (event) => {
    event.preventDefault(); if (!selected?.production_id) return
    try { await api.post(`/production/${selected.production_id}/expenses`, { ...expense, amount: Number(expense.amount) }); toast.success('Expense added'); setExpense({ expense_date: today, description: '', amount: '' }); const refreshed = unwrap(await api.get(`/production/${selected.production_id}`)); setSelected(refreshed); await load() }
    catch (error) { toast.error(error.response?.data?.message || 'Failed to add expense') }
  }

  return <div className="flex min-h-screen bg-slate-50">{user && <AppSidebar />}<main className="flex-1 p-5 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Daily operations</p><h1 className="text-2xl font-bold text-slate-900">Production & mineral operations</h1><p className="text-sm text-slate-500">Values, expenses, and results are calculated by the backend from saved records.</p></header>
    {canRecord && <form onSubmit={saveProduction} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Record production</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{[['production_date','Date','date'],['mineral_type','Mineral type','text'],['quantity','Quantity','number'],['unit','Unit','text'],['unit_price','Unit price (RWF)','number'],['working_hours','Operation hours','number']].map(([key,label,type])=><label key={key} className="text-sm"><span className="mb-1 block text-slate-600">{label}</span><input required={['production_date','mineral_type','quantity','unit'].includes(key)} type={type} min={type==='number'?'0':undefined} value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full rounded border border-slate-200 p-2"/></label>)}<label className="text-sm"><span className="mb-1 block text-slate-600">Lead worker</span><select required value={form.employee_id} onChange={e=>set('employee_id',e.target.value)} className="w-full rounded border border-slate-200 p-2"><option value="">Select worker</option>{workers.map(w=><option key={w.employee_id} value={w.employee_id}>{w.employee_code} {w.first_name} {w.last_name}</option>)}</select></label><label className="text-sm md:col-span-2"><span className="mb-1 block text-slate-600">Activity details</span><input value={form.activity_details} onChange={e=>set('activity_details',e.target.value)} className="w-full rounded border border-slate-200 p-2"/></label><label className="text-sm md:col-span-3"><span className="mb-1 block text-slate-600">Remarks</span><textarea value={form.remarks} onChange={e=>set('remarks',e.target.value)} className="w-full rounded border border-slate-200 p-2"/></label></div>
      <div className="mt-4 rounded bg-cyan-50 p-3 text-sm text-cyan-900">Gross value preview: <strong>{money(form.unit_price === '' ? null : grossPreview)}</strong></div><div className="mt-4"><p className="text-sm font-medium text-slate-700">Workers involved</p><div className="mt-2 grid gap-2 md:grid-cols-2">{workers.map(w=>{const involved=form.workers.find(x=>x.employee_id===w.employee_id);return <div key={w.employee_id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={Boolean(involved)} onChange={()=>toggleWorker(w.employee_id)}/><span className="flex-1">{w.first_name} {w.last_name}</span>{involved && <input type="number" min="0" placeholder="Hours" value={involved.working_hours} onChange={e=>setWorkerHours(w.employee_id,e.target.value)} className="w-20 rounded border p-1"/>}</div>})}</div></div><button disabled={saving} className="mt-4 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save production'}</button></form>}
    {selected && canRecord && <form onSubmit={saveExpense} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Add expense to selected operation</h2><p className="text-sm text-slate-500">{selected.mineral_type}: gross {money(selected.gross_value)}, expenses {money(selected.total_expenses)}, net {money(selected.net_result)}</p><div className="mt-3 grid gap-3 md:grid-cols-3"><input type="date" required value={expense.expense_date} onChange={e=>setExpense(x=>({...x,expense_date:e.target.value}))} className="rounded border p-2"/><input required placeholder="Description" value={expense.description} onChange={e=>setExpense(x=>({...x,description:e.target.value}))} className="rounded border p-2"/><input required type="number" min="0" placeholder="Amount" value={expense.amount} onChange={e=>setExpense(x=>({...x,amount:e.target.value}))} className="rounded border p-2"/></div><button className="mt-3 rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Add expense</button></form>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-4"><h2 className="font-semibold">Recorded production</h2></div>{loading?<p className="p-5 text-sm text-slate-500">Loading…</p>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th>Mineral</th><th>Quantity</th><th>Gross</th><th>Expenses</th><th>Net</th><th/></tr></thead><tbody>{records.map(r=><tr key={r.production_id} className="border-t"><td className="p-3">{r.production_date}</td><td>{r.mineral_type}</td><td>{r.quantity} {r.unit}</td><td>{money(r.gross_value)}</td><td>{money(r.total_expenses)}</td><td>{money(r.net_result)}</td><td><button onClick={()=>setSelected(r)} className="text-amber-700">Details</button></td></tr>)}</tbody></table></div>}</section>
  </div></main></div>
}
