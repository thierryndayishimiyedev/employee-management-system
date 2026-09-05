import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import AppSidebar from './Appsidebar'

const today = new Date().toISOString().slice(0, 10)
const unwrap = (response) => response?.data?.data ?? response?.data ?? response

export default function ProductionPage() {
  const { user } = useAuth()
  const [records, setRecords] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ employee_id: '', production_date: today, mineral_type: '', quantity: '', unit: 'kg', activity_details: '', working_hours: '', remarks: '', workers: [] })

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

  const canRecord = user?.role_name === 'ACCOUNTANT' || user?.role_name === 'SUPER_ADMIN'
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const toggleWorker = (employee_id) => setForm(current => ({ ...current, workers: current.workers.some(w => w.employee_id === employee_id) ? current.workers.filter(w => w.employee_id !== employee_id) : [...current.workers, { employee_id, working_hours: '' }] }))
  const setWorkerHours = (employee_id, working_hours) => setForm(current => ({ ...current, workers: current.workers.map(w => w.employee_id === employee_id ? { ...w, working_hours } : w) }))

  const saveProduction = async (event) => {
    event.preventDefault(); setSaving(true)
    try {
      const payload = { ...form, quantity: Number(form.quantity), working_hours: form.working_hours === '' ? null : Number(form.working_hours), workers: form.workers.map(w => ({ ...w, working_hours: w.working_hours === '' ? null : Number(w.working_hours) })) }
      const created = unwrap(await api.post('/production', payload))
      toast.success('Production operation recorded')
      setSelected(created); setForm({ employee_id: '', production_date: today, mineral_type: '', quantity: '', unit: 'kg', activity_details: '', working_hours: '', remarks: '', workers: [] }); await load()
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to record production') }
    finally { setSaving(false) }
  }

  return <div className="flex min-h-screen bg-slate-50">{user && <AppSidebar />}<main className="flex-1 p-5 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Daily operations</p><h1 className="text-2xl font-bold text-slate-900">Production & mineral operations</h1><p className="text-sm text-slate-500">Record extracted quantities and the workers who performed the work. Mineral values are set later outside production.</p></header>
    {canRecord && <form onSubmit={saveProduction} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Record production</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{[['production_date','Date','date'],['mineral_type','Mineral type','text'],['quantity','Quantity','number'],['unit','Unit','text'],['working_hours','Operation hours','number']].map(([key,label,type])=><label key={key} className="text-sm"><span className="mb-1 block text-slate-600">{label}</span><input required={['production_date','mineral_type','quantity','unit'].includes(key)} type={type} min={type==='number'?'0':undefined} value={form[key]} onChange={e=>set(key,e.target.value)} className="w-full rounded border border-slate-200 p-2"/></label>)}<label className="text-sm"><span className="mb-1 block text-slate-600">Lead worker</span><select required value={form.employee_id} onChange={e=>set('employee_id',e.target.value)} className="w-full rounded border border-slate-200 p-2"><option value="">Select worker</option>{workers.map(w=><option key={w.employee_id} value={w.employee_id}>{w.employee_code} {w.first_name} {w.last_name}</option>)}</select></label><label className="text-sm md:col-span-2"><span className="mb-1 block text-slate-600">Activity details</span><input value={form.activity_details} onChange={e=>set('activity_details',e.target.value)} className="w-full rounded border border-slate-200 p-2"/></label><label className="text-sm md:col-span-3"><span className="mb-1 block text-slate-600">Remarks</span><textarea value={form.remarks} onChange={e=>set('remarks',e.target.value)} className="w-full rounded border border-slate-200 p-2"/></label></div><div className="mt-4"><p className="text-sm font-medium text-slate-700">Workers involved</p><div className="mt-2 grid gap-2 md:grid-cols-2">{workers.map(w=>{const involved=form.workers.find(x=>x.employee_id===w.employee_id);return <div key={w.employee_id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={Boolean(involved)} onChange={()=>toggleWorker(w.employee_id)}/><span className="flex-1">{w.first_name} {w.last_name}</span>{involved && <input type="number" min="0" placeholder="Hours" value={involved.working_hours} onChange={e=>setWorkerHours(w.employee_id,e.target.value)} className="w-20 rounded border p-1"/>}</div>})}</div></div><button disabled={saving} className="mt-4 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save production'}</button></form>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b p-4"><h2 className="font-semibold">Recorded production</h2></div>{loading?<p className="p-5 text-sm text-slate-500">Loading…</p>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th>Mineral</th><th>Quantity extracted</th><th>Lead worker</th></tr></thead><tbody>{records.map(r=><tr key={r.production_id} className="border-t"><td className="p-3">{r.production_date}</td><td>{r.mineral_type}</td><td>{r.quantity} {r.unit}</td><td>{r.employees?.first_name} {r.employees?.last_name}</td></tr>)}</tbody></table></div>}</section>
  </div></main></div>
}
