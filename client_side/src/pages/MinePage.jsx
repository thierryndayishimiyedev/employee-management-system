import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import {    
  Building2,
  Users,
  Wallet,
  Mountain,
  Plus,
  X,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../context/authStore'
import AppSidebar from './AppSidebar'
import * as api from '../lib/api'

function formatRWF(amount) {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(amount)
}

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let out = ''
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export default function MinesPage() {
  const { user } = useAuth()
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showAddManager, setShowAddManager] = useState(false)

  const fetchOverviews = useCallback(() => {
    setLoading(true)
    setLoadError('')
    return api
      .getManagerOverviews()
      .then((data) => setManagers(Array.isArray(data) ? data : data?.data || []))
      .catch((err) => setLoadError(err.message || 'Failed to load managers'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchOverviews()
  }, [fetchOverviews])

  // Optional role guard — only redirects if your auth user actually has a role field
  if (user?.role && user.role !== 'director') {
    return <Navigate to="/dashboard" />
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Managers</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {loading ? 'Loading…' : `${managers.length} active manager${managers.length === 1 ? '' : 's'}`}
              </h1>
            </div>
            <button
              onClick={() => setShowAddManager(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
            >
              <Plus size={16} />
              Add new manager
            </button>
          </header>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-12 text-slate-400 shadow-sm">
              <Loader2 size={18} className="animate-spin" />
              Loading managers…
            </div>
          )}

          {/* Error state */}
          {!loading && loadError && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-700">
              <AlertCircle size={18} className="shrink-0" />
              <div>
                <p className="font-semibold">Couldn't load managers</p>
                <p className="mt-0.5 text-red-600/80">{loadError}</p>
              </div>
              <button
                onClick={fetchOverviews}
                className="ml-auto rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !loadError && managers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
              No managers yet. Add one to get started.
            </div>
          )}

          {/* Manager cards */}
          {!loading && !loadError && managers.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {managers.map((m) => (
                <div
                  key={m.user_id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs uppercase tracking-widest text-white/60">Manager</span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{m.name}</h3>
                    <div className="mt-1 text-sm text-white/70">@{m.username}</div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <Users className="mx-auto h-4 w-4 text-amber-600" />
                        <div className="mt-1 font-semibold text-slate-800">{m.staff_count}</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Company staff</div>
                      </div>
                      <div>
                        <Mountain className="mx-auto h-4 w-4 text-slate-300" />
                        <div className="mt-1 font-semibold text-slate-300">—</div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">No production data</div>
                      </div>
                      <div>
                        <Wallet className="mx-auto h-4 w-4 text-amber-600" />
                        <div className="mt-1 text-xs font-semibold text-slate-800">
                          {formatRWF(m.payroll_total).replace('RWF', '')}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">Company payroll</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showAddManager && (
        <AssignManagerModal
          onClose={() => setShowAddManager(false)}
          onCreated={() => {
            setShowAddManager(false)
            fetchOverviews()
          }}
        />
      )}
    </div>
  )
}

function ModalShell({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const emptyManagerForm = {
  first_name: '',
  last_name: '',
  employee_code: '',
  gender: '',
  date_of_birth: '',
  national_id: '',
  phone: '',
  email: '',
  address: '',
  hire_date: '',
  monthly_salary: '',
  daily_rate: '',
  position_id: '',
  username: '',
  password: '',
  confirmPassword: '',
}

function AssignManagerModal({ onClose, onCreated }) {
  const [step, setStep] = useState('form') // 'form' | 'created'
  const [form, setForm] = useState(emptyManagerForm)
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createdInfo, setCreatedInfo] = useState(null)

  const [positions, setPositions] = useState([])
  const [positionsLoading, setPositionsLoading] = useState(true)
  const [positionsError, setPositionsError] = useState('')

  useEffect(() => {
    let cancelled = false
    setPositionsLoading(true)
    api
      .getPositions()
      .then((data) => {
        if (!cancelled) setPositions(Array.isArray(data) ? data : data?.data || [])
      })
      .catch((err) => {
        if (!cancelled) setPositionsError(err.message || 'Failed to load positions')
      })
      .finally(() => {
        if (!cancelled) setPositionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleGenerate = () => {
    const pwd = generatePassword()
    setForm((prev) => ({ ...prev, password: pwd, confirmPassword: pwd }))
    setShowPassword(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.')
      return
    }
    if (!form.employee_code.trim()) {
      setError('Employee code is required.')
      return
    }
    if (!form.position_id) {
      setError('Please select a position.')
      return
    }
    if (!form.username.trim()) {
      setError('Login username is required.')
      return
    }
    if (!form.password || form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const payload = {
      position_id: form.position_id,
      employee_code: form.employee_code.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      gender: form.gender || undefined,
      date_of_birth: form.date_of_birth || undefined,
      national_id: form.national_id.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      hire_date: form.hire_date || undefined,
      monthly_salary: form.monthly_salary ? Number(form.monthly_salary) : undefined,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : undefined,
      username: form.username.trim(),
      password: form.password,
    }

    setSubmitting(true)
    try {
      await api.createManager(payload)
      setCreatedInfo({ username: form.username.trim(), password: form.password })
      setStep('created')
    } catch (err) {
      setError(err.message || 'Failed to create manager account.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!createdInfo) return
    const text = `Username: ${createdInfo.username}\nPassword: ${createdInfo.password}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API unavailable — ignore silently
    }
  }

  if (step === 'created' && createdInfo) {
    return (
      <ModalShell title="Manager account created" onClose={onCreated}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            The manager account was created in your database. Share these login credentials with the manager.
          </p>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Username</span>
              <span className="font-mono font-medium text-slate-800">{createdInfo.username}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Password</span>
              <span className="font-mono font-medium text-slate-800">{createdInfo.password}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            The password is only shown once here — your backend stores a bcrypt hash, not the plain text.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy credentials'}
            </button>
            <button
              type="button"
              onClick={onCreated}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Done
            </button>
          </div>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell title="Add new manager" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              First name
            </label>
            <input
              type="text"
              value={form.first_name}
              onChange={updateField('first_name')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Last name
            </label>
            <input
              type="text"
              value={form.last_name}
              onChange={updateField('last_name')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Employee code
            </label>
            <input
              type="text"
              value={form.employee_code}
              onChange={updateField('employee_code')}
              placeholder="e.g. EMP-0231"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Position
            </label>
            {positionsLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                Loading positions…
              </div>
            ) : positionsError ? (
              <p className="text-xs text-red-600">{positionsError}</p>
            ) : (
              <select
                value={form.position_id}
                onChange={updateField('position_id')}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                required
              >
                <option value="">Select a position</option>
                {positions.map((p) => (
                  <option key={p.position_id} value={p.position_id}>
                    {p.position_name || p.title || p.position_id}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMoreDetails((s) => !s)}
          className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
        >
          <ChevronDown size={14} className={`transition ${showMoreDetails ? 'rotate-180' : ''}`} />
          {showMoreDetails ? 'Hide' : 'Add'} optional employee details
        </button>

        {showMoreDetails && (
          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={updateField('gender')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                >
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={updateField('date_of_birth')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  National ID
                </label>
                <input
                  type="text"
                  value={form.national_id}
                  onChange={updateField('national_id')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={updateField('phone')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={updateField('email')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={updateField('address')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Hire date
                </label>
                <input
                  type="date"
                  value={form.hire_date}
                  onChange={updateField('hire_date')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Monthly salary
                </label>
                <input
                  type="number"
                  value={form.monthly_salary}
                  onChange={updateField('monthly_salary')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Daily rate
                </label>
                <input
                  type="number"
                  value={form.daily_rate}
                  onChange={updateField('daily_rate')}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Login username or email
            </label>
            <input
              type="text"
              value={form.username}
              onChange={updateField('username')}
              placeholder="e.g. jp.nkurunziza"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>

          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
              >
                <RefreshCw size={12} />
                Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={updateField('password')}
                placeholder="At least 6 characters"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Confirm password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={updateField('confirmPassword')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              required
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
            {submitting ? 'Creating…' : 'Create manager login'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}