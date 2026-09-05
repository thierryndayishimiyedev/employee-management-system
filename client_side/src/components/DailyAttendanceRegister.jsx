import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, Pencil, UserCheck, UserX } from 'lucide-react'
import api from '../api/api'
import { createAttendance } from '../api/attendanceApi'

const today = () => new Date().toISOString().slice(0, 10)
const dataOf = (response) => response?.data?.data || response?.data || []

export default function DailyAttendanceRegister({ enabled, todayRecords = [], onChanged }) {
  const [workers, setWorkers] = useState([])
  const [savingId, setSavingId] = useState('')
  const [manualWorker, setManualWorker] = useState(null)
  const [manual, setManual] = useState({ attendance_status: 'PRESENT', check_in: '07:00', check_out: '17:00', remarks: '' })

  const loadWorkers = async () => {
    if (!enabled) return
    try { setWorkers(dataOf(await api.get('/employees'))) } catch (error) { toast.error(error.response?.data?.message || 'Could not load the worker register.') }
  }
  useEffect(() => { loadWorkers() }, [enabled])

  const recordsByWorker = useMemo(() => new Map(todayRecords.map((row) => [row.employee_id, row])), [todayRecords])
  const mark = async (worker, status) => {
    setSavingId(worker.employee_id)
    try {
      const present = status === 'PRESENT'
      await createAttendance({
        employee_id: worker.employee_id,
        attendance_date: today(),
        attendance_status: status,
        check_in: present ? '07:00' : null,
        check_out: present ? '17:00' : null,
        remarks: present ? 'Standard shift: 07:00–17:00' : null,
      })
      toast.success(`${worker.first_name} marked ${status.toLowerCase()}.`)
      await onChanged?.()
    } catch (error) { toast.error(error.response?.data?.message || 'Could not record attendance.') } finally { setSavingId('') }
  }

  const openManual = (worker) => {
    setManualWorker(worker)
    setManual({ attendance_status: 'PRESENT', check_in: '07:00', check_out: '17:00', remarks: '' })
  }
  const saveManual = async (event) => {
    event.preventDefault()
    if (!manualWorker) return
    setSavingId(manualWorker.employee_id)
    try {
      const present = manual.attendance_status === 'PRESENT'
      await createAttendance({
        employee_id: manualWorker.employee_id,
        attendance_date: today(),
        attendance_status: manual.attendance_status,
        check_in: present ? manual.check_in : null,
        check_out: present ? manual.check_out : null,
        remarks: manual.remarks || 'Manual attendance exception',
      })
      toast.success('Manual attendance exception saved.')
      setManualWorker(null)
      await onChanged?.()
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save the manual attendance.') } finally { setSavingId('') }
  }
  const downloadToday = async () => {
    try {
      const response = await api.get(`/downloads/attendance/pdf?start_date=${today()}&end_date=${today()}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a'); link.href = url; link.download = `attendance-${today()}.pdf`; link.click(); URL.revokeObjectURL(url)
    } catch (error) { toast.error(error.response?.data?.message || 'Could not download today’s attendance report.') }
  }

  if (!enabled) return null
  const isSunday = new Date(`${today()}T00:00:00`).getDay() === 0
  return <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 bg-emerald-50 px-5 py-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Daily attendance register · {today()}</p><h2 className="mt-1 text-xl font-bold text-slate-900">Mark every available worker</h2><p className="mt-1 text-sm text-slate-600">Present automatically saves 07:00–17:00 (10 hours). Use Manual only for a real exception.</p></div>
      <button onClick={downloadToday} className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"><Download size={17}/> Download today’s PDF</button>
    </div>
    {isSunday ? <p className="m-5 rounded-lg bg-amber-50 p-4 text-sm font-medium text-amber-800">Sunday is a rest day. Attendance cannot be recorded today.</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Worker</th><th className="px-5 py-3">Standard shift</th><th className="px-5 py-3">Today’s result</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{workers.map((worker) => { const record = recordsByWorker.get(worker.employee_id); const busy = savingId === worker.employee_id; return <tr key={worker.employee_id} className="border-t border-slate-100"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{worker.first_name} {worker.last_name}</p><p className="text-xs text-slate-500">{worker.employee_code}</p></td><td className="px-5 py-4 text-slate-600">07:00 – 17:00 <span className="text-xs">(10 hrs)</span></td><td className="px-5 py-4">{record ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{record.attendance_status} · {record.check_in || '--'}–{record.check_out || '--'}</span> : <span className="text-slate-400">Not marked</span>}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{record ? null : <><button disabled={busy} onClick={() => mark(worker, 'PRESENT')} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><UserCheck size={15}/> Present</button><button disabled={busy} onClick={() => mark(worker, 'ABSENT')} className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><UserX size={15}/> Absent</button><button disabled={busy} onClick={() => openManual(worker)} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"><Pencil size={14}/> Manual</button></>}</div></td></tr> })}{!workers.length && <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-500">No workers are assigned to your manager unit.</td></tr>}</tbody></table></div>}
    {manualWorker && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={saveManual} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"><h3 className="text-xl font-bold text-slate-900">Manual attendance exception</h3><p className="mt-1 text-sm text-slate-600">{manualWorker.first_name} {manualWorker.last_name} · {today()}</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Status<select value={manual.attendance_status} onChange={(e) => setManual({ ...manual, attendance_status: e.target.value })} className="mt-1 w-full rounded-md border p-2"><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="LEAVE">Leave</option></select></label>{manual.attendance_status === 'PRESENT' && <><label className="text-sm font-medium">Check in<input required type="time" value={manual.check_in} onChange={(e) => setManual({ ...manual, check_in: e.target.value })} className="mt-1 w-full rounded-md border p-2"/></label><label className="text-sm font-medium">Check out<input required type="time" value={manual.check_out} onChange={(e) => setManual({ ...manual, check_out: e.target.value })} className="mt-1 w-full rounded-md border p-2"/></label></>}</div><label className="mt-4 block text-sm font-medium">Reason / remarks<textarea required rows="3" value={manual.remarks} onChange={(e) => setManual({ ...manual, remarks: e.target.value })} className="mt-1 w-full rounded-md border p-2" placeholder="Example: went home early for medical appointment"/></label><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setManualWorker(null)} className="rounded-md px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button disabled={Boolean(savingId)} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Save exception</button></div></form></div>}
  </section>
}
