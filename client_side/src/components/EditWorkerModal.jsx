import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import { updateWorker } from '../api/worker.api'

export default function EditWorkerModal({ isOpen, worker, onClose, onSuccess }) {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (worker) {
      setForm({
        first_name: worker.first_name || '',
        last_name: worker.last_name || '',
        gender: worker.gender || 'MALE',
        date_of_birth: worker.date_of_birth || '',
        national_id: worker.national_id || '',
        phone: worker.phone || '',
        email: worker.email || '',
        address: worker.address || '',
        hire_date: worker.hire_date || '',
        monthly_salary: worker.monthly_salary || '',
        daily_rate: worker.daily_rate || '',
        position_id: worker.position_id || '',
      })
    }
  }, [worker])

  if (!isOpen || !form) return null

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateWorker(worker.employee_id, form)
      toast.success('Worker updated successfully')
      onSuccess()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update worker')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700/50 p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Edit Worker</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" name="first_name" value={form.first_name} onChange={handleChange} required />
          <Field label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} required />
          <div>
            <label className="block text-sm text-slate-300 mb-1">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <Field label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
          <Field label="National ID" name="national_id" value={form.national_id} onChange={handleChange} />
          <Field label="Phone" name="phone" value={form.phone} onChange={handleChange} required />
          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
          <Field label="Address" name="address" value={form.address} onChange={handleChange} />
          <Field label="Hire Date" name="hire_date" type="date" value={form.hire_date} onChange={handleChange} />
          <Field label="Monthly Salary" name="monthly_salary" type="number" value={form.monthly_salary} onChange={handleChange} />
          <Field label="Daily Rate" name="daily_rate" type="number" value={form.daily_rate} onChange={handleChange} />
          <Field label="Position ID" name="position_id" value={form.position_id} onChange={handleChange} />

          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-500"
      />
    </div>
  )
}