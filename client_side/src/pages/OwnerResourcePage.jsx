import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Briefcase, X, Loader2 } from 'lucide-react'
import axiosInstance from '../api/api'

// Mirrors the same convention as your worker.api.js — adjust the import
// above if your shared axios instance lives at a different path/name.
const getPositions = () => axiosInstance.get('/positions')
const createPosition = (data) => axiosInstance.post('/positions', data)

function formatRWF(amount) {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function PositionsPage() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const loadPositions = async () => {
    setLoading(true)
    try {
      const res = await getPositions()
      setPositions(res.data.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load positions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPositions()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Positions</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? 'Loading…' : `${positions.length} position${positions.length === 1 ? '' : 's'} defined`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Create and manage roles employees can be assigned to.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
          >
            <Plus size={16} />
            Add position
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="p-6 text-sm text-slate-400">Loading positions…</p>
          ) : positions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center text-slate-400">
              <Briefcase size={28} className="text-slate-300" />
              No positions yet. Add one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Position</th>
                    <th className="px-6 py-3 text-left font-semibold">Salary / day</th>
                    <th className="px-6 py-3 text-left font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {positions.map((position) => (
                    <tr key={position.position_id} className="transition hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-medium text-slate-800">{position.position_name}</td>
                      <td className="px-6 py-4 font-mono text-slate-600">{formatRWF(position.daily_rate)}</td>
                      <td className="px-6 py-4 text-slate-500">{position.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreatePositionModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            loadPositions()
          }}
        />
      )}
    </div>
  )
}

function CreatePositionModal({ onClose, onSuccess }) {
  const [positionName, setPositionName] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!positionName.trim()) {
      toast.error('Position name is required.')
      return
    }
    if (!dailyRate || Number(dailyRate) <= 0) {
      toast.error('Enter a valid salary per day.')
      return
    }

    setSubmitting(true)
    try {
      await createPosition({
        position_name: positionName.trim(),
        daily_rate: Number(dailyRate),
        description: description.trim() || undefined,
      })
      toast.success('Position created')
      onSuccess?.()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create position')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add new position</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 text-sm text-slate-500">
          Define a position that employees can be assigned to.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Position name
            </label>
            <input
              type="text"
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
              placeholder="e.g. Site Supervisor"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Salary per day (RWF)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe this role's responsibilities"
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Saving…' : 'Save position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
