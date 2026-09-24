import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Moon, Pencil } from 'lucide-react';
import api from '../api/api';
import { createAttendance } from '../api/attendanceApi';

const today = () => new Date().toISOString().slice(0, 10);
const responseData = (response) => response?.data?.data || response?.data || [];
const formatMoney = (value) => `${Number(value || 0).toLocaleString()} RWF`;

function calculateHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
  };
  const duration = toMinutes(checkOut) - toMinutes(checkIn);
  return duration > 0 ? duration / 60 : 0;
}

function AttendanceBadge({ record }) {
  return (
    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
      {record.attendance_status} · {record.check_in || '--'}–{record.check_out || '--'} · {Number(record.hours_worked || 0).toFixed(1)} hrs
    </span>
  );
}

export default function DailyAttendanceRegister({ enabled, attendanceRecords = [], onChanged }) {
  const [workers, setWorkers] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [nightPlan, setNightPlan] = useState(null);
  const [workSettings, setWorkSettings] = useState({ sunday_work_allowed: false, standard_day_hours: 10 });
  const [saving, setSaving] = useState('');
  const [manualWorker, setManualWorker] = useState(null);
  const [manual, setManual] = useState({ status: 'PRESENT', checkIn: '07:00', checkOut: '17:00', remarks: '' });

  const load = async () => {
    if (!enabled) return;
    try {
      const [employees, night, settings] = await Promise.all([
        api.get('/employees'),
        api.get('/night-shifts/current').catch(() => null),
        api.get('/work-settings').catch(() => null)
      ]);
      setWorkers(responseData(employees).filter((worker) => worker.payment_type !== 'FLEXIBLE_DAILY'));
      setNightPlan(night ? responseData(night) : null);
      setWorkSettings(settings ? responseData(settings) : { sunday_work_allowed: false, standard_day_hours: 10 });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load the attendance register.');
    }
  };

  useEffect(() => { load(); }, [enabled]);

  const recordsByWorker = useMemo(() => attendanceRecords
    .filter((record) => record.attendance_date === attendanceDate)
    .reduce((map, record) => {
      const workerRecords = map.get(record.employee_id) || {};
      workerRecords[record.shift_type || 'DAY'] = record;
      map.set(record.employee_id, workerRecords);
      return map;
    }, new Map()), [attendanceRecords, attendanceDate]);

  const isSunday = new Date(`${attendanceDate}T00:00:00`).getDay() === 0;
  const sundayLocked = isSunday && !workSettings.sunday_work_allowed;

  const saveAutomatic = async (worker, shiftType, status = 'PRESENT') => {
    const key = `${worker.employee_id}-${shiftType}`;
    const isNight = shiftType === 'NIGHT';
    const startsAt = String(nightPlan?.starts_at || '19:00').slice(0, 5);
    const endsAt = String(nightPlan?.ends_at || '05:00').slice(0, 5);
    const worked = ['PRESENT', 'LATE'].includes(status);

    setSaving(key);
    try {
      await createAttendance({
        employee_id: worker.employee_id,
        attendance_date: attendanceDate,
        shift_type: shiftType,
        attendance_status: status,
        check_in: worked ? (isNight ? startsAt : '07:00') : null,
        check_out: worked ? (isNight ? endsAt : '17:00') : null,
        remarks: isNight ? `Owner-planned night shift: ${startsAt}–${endsAt}` : 'Automatic day shift: 07:00–17:00'
      });
      toast.success(`${isNight ? 'Night' : 'Day'} attendance saved.`);
      await onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save attendance.');
    } finally {
      setSaving('');
    }
  };

  const markAllPresent = async () => {
    const missingWorkers = workers.filter((worker) => !recordsByWorker.get(worker.employee_id)?.DAY);
    if (!missingWorkers.length) return toast('All day attendance is already recorded.');
    await Promise.allSettled(missingWorkers.map((worker) => saveAutomatic(worker, 'DAY')));
  };

  const openManual = (worker) => {
    setManualWorker(worker);
    setManual({ status: 'PRESENT', checkIn: '07:00', checkOut: '17:00', remarks: '' });
  };

  const manualHours = calculateHours(manual.checkIn, manual.checkOut);
  const manualRate = manualWorker && ['PRESENT', 'LATE'].includes(manual.status)
    ? Number(manualWorker.daily_rate || 0) * (manualHours / Number(workSettings.standard_day_hours || 10))
    : 0;

  const saveManual = async (event) => {
    event.preventDefault();
    if (!manualWorker) return;
    const worked = ['PRESENT', 'LATE'].includes(manual.status);
    if (worked && manualHours <= 0) return toast.error('End time must be later than start time.');

    const key = `${manualWorker.employee_id}-DAY`;
    setSaving(key);
    try {
      await createAttendance({
        employee_id: manualWorker.employee_id,
        attendance_date: attendanceDate,
        shift_type: 'DAY',
        attendance_status: manual.status,
        check_in: worked ? manual.checkIn : null,
        check_out: worked ? manual.checkOut : null,
        manual_pay_by_hours: worked,
        remarks: manual.remarks || 'Manual attendance exception'
      });
      toast.success('Manual attendance and proportional pay were saved.');
      setManualWorker(null);
      await onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save manual attendance.');
    } finally {
      setSaving('');
    }
  };

  const download = async () => {
    try {
      const response = await api.get(`/downloads/attendance/pdf?start_date=${attendanceDate}&end_date=${attendanceDate}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-${attendanceDate}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download the attendance PDF.');
    }
  };

  if (!enabled) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b bg-blue-50 p-5">
        <div>
          <p className="text-xs font-bold uppercase text-blue-700">Attendance register</p>
          <h2 className="mt-1 text-xl font-bold">Automatic and manual attendance</h2>
          <p className="mt-1 text-sm text-slate-600">Automatic day attendance stays 07:00–17:00. Manual attendance calculates proportional pay from actual hours.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-bold">Date<input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} className="ml-2 rounded border p-2" /></label>
          <button type="button" disabled={sundayLocked} onClick={markAllPresent} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-40">Mark all day-present</button>
          <button type="button" onClick={download} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-bold text-blue-700"><Download size={16} />PDF</button>
        </div>
      </div>

      {sundayLocked && <p className="m-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Sunday work is disabled by the Owner. Enable it in Owner settings before recording Sunday attendance.</p>}
      {!nightPlan && <p className="m-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Night attendance is locked until the Owner activates a night-shift plan.</p>}

      <div className="overflow-x-auto">
        <table className="min-w-[950px] w-full text-sm">
          <thead className="bg-slate-50 text-left"><tr><th className="p-4">Worker</th><th>Day record</th><th>Night record</th><th className="p-4 text-right">Actions</th></tr></thead>
          <tbody>
            {workers.map((worker) => {
              const record = recordsByWorker.get(worker.employee_id) || {};
              const daySaving = saving === `${worker.employee_id}-DAY`;
              const nightSaving = saving === `${worker.employee_id}-NIGHT`;
              return <tr className="border-t" key={worker.employee_id}>
                <td className="p-4 font-bold">{worker.first_name} {worker.last_name}<br /><span className="font-normal text-slate-500">{worker.employee_code} · {formatMoney(worker.daily_rate)}/day</span></td>
                <td>{record.DAY ? <AttendanceBadge record={record.DAY} /> : <span className="text-slate-400">Not recorded</span>}</td>
                <td>{record.NIGHT ? <AttendanceBadge record={record.NIGHT} /> : <span className="text-slate-400">Not recorded</span>}</td>
                <td className="p-4 text-right">
                  {!record.DAY && <><button type="button" disabled={daySaving || sundayLocked} onClick={() => saveAutomatic(worker, 'DAY')} className="mr-2 rounded bg-blue-600 px-3 py-2 font-bold text-white disabled:opacity-40">Present</button><button type="button" disabled={daySaving || sundayLocked} onClick={() => saveAutomatic(worker, 'DAY', 'ABSENT')} className="mr-2 rounded border border-red-200 px-3 py-2 font-bold text-red-700 disabled:opacity-40">Absent</button><button type="button" disabled={sundayLocked} onClick={() => openManual(worker)} className="mr-2 inline-flex items-center gap-1 rounded border border-amber-300 px-3 py-2 font-bold text-amber-800 disabled:opacity-40"><Pencil size={14} />Manual</button></>}
                  {!record.NIGHT && <button type="button" disabled={!nightPlan || nightSaving || sundayLocked} onClick={() => saveAutomatic(worker, 'NIGHT')} className="inline-flex items-center gap-1 rounded border border-violet-300 px-3 py-2 font-bold text-violet-700 disabled:opacity-40"><Moon size={15} />Night</button>}
                </td>
              </tr>;
            })}
            {!workers.length && <tr><td colSpan="4" className="p-8 text-center text-slate-500">No fixed daily workers are assigned to this manager unit.</td></tr>}
          </tbody>
        </table>
      </div>

      {manualWorker && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <form onSubmit={saveManual} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <h3 className="text-xl font-bold">Manual attendance — {manualWorker.first_name} {manualWorker.last_name}</h3>
          <p className="mt-1 text-sm text-slate-600">The normal daily rate is not changed. Pay is calculated only for this record.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="font-semibold">Status<select value={manual.status} onChange={(event) => setManual({ ...manual, status: event.target.value })} className="mt-1 block w-full rounded border p-2"><option value="PRESENT">Present</option><option value="LATE">Late</option><option value="ABSENT">Absent</option><option value="LEAVE">Leave</option></select></label>
            {['PRESENT', 'LATE'].includes(manual.status) && <><label className="font-semibold">Started<input required type="time" value={manual.checkIn} onChange={(event) => setManual({ ...manual, checkIn: event.target.value })} className="mt-1 block w-full rounded border p-2" /></label><label className="font-semibold">Ended<input required type="time" value={manual.checkOut} onChange={(event) => setManual({ ...manual, checkOut: event.target.value })} className="mt-1 block w-full rounded border p-2" /></label></>}
          </div>
          {['PRESENT', 'LATE'].includes(manual.status) && <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-950"><b>Calculated:</b> {manualHours.toFixed(1)} hours ÷ {workSettings.standard_day_hours} standard hours × {formatMoney(manualWorker.daily_rate)} = <b>{formatMoney(manualRate)}</b></div>}
          <label className="mt-4 block font-semibold">Reason / remarks<textarea required value={manual.remarks} onChange={(event) => setManual({ ...manual, remarks: event.target.value })} className="mt-1 block w-full rounded border p-2" /></label>
          <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setManualWorker(null)} className="px-4 py-2 font-bold text-slate-600">Cancel</button><button disabled={saving === `${manualWorker.employee_id}-DAY`} className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-40">Save manual attendance</button></div>
        </form>
      </div>}
    </section>
  );
}
