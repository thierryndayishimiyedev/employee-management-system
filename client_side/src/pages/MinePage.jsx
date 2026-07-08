import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Building2,
  MapPin,
  Users,
  Mountain,
  Wallet,
  Plus,
  X,
  UserCog,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../context/authStore'
import AppSidebar from './AppSidebar'

// ---- Mock data (swap for a real API later) ----
// NOTE: in a real backend, manager accounts (username/password) should be
// created via a server endpoint — never stored long-term in frontend state.
// Here we keep them in memory only so the owner can view/copy them once.
const initialMines = [
  {
    id: 'mine-1',
    name: 'Kigali North Site',
    location: 'Musanze, Rwanda',
    established: '2018-04-12',
    staffCount: 22,
    productionKg: 980,
    payroll: 4200000,
    manager: { name: 'Eric Mugisha', username: 'eric.mugisha', password: null },
    accountantName: 'Alice Uwase',
  },
  {
    id: 'mine-2',
    name: 'Rubavu Extraction Site',
    location: 'Rubavu, Rwanda',
    established: '2020-09-01',
    staffCount: 18,
    productionKg: 760,
    payroll: 3350000,
    manager: null,
    accountantName: 'Jean Bosco',
  },
  {
    id: 'mine-3',
    name: 'Huye Highland Site',
    location: 'Huye, Rwanda',
    established: '2021-02-20',
    staffCount: 16,
    productionKg: 740,
    payroll: 3100000,
    manager: { name: 'Diane Ingabire', username: 'diane.ingabire', password: null },
    accountantName: null,
  },
]

function formatRWF(amount) {
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
  const [mines, setMines] = useState(initialMines)
  const [showAddMine, setShowAddMine] = useState(false)
  const [managerMineId, setManagerMineId] = useState(null)

  // Optional role guard — only redirects if your auth user actually has a role field
  if (user?.role && user.role !== 'director') {
    return <Navigate to="/dashboard" />
  }

  const handleAddMine = (mine) => {
    setMines((prev) => [
      ...prev,
      {
        id: `mine-${Date.now()}`,
        staffCount: 0,
        productionKg: 0,
        payroll: 0,
        manager: null,
        accountantName: null,
        ...mine,
      },
    ])
    setShowAddMine(false)
  }

  const handleAssignManager = (mineId, manager) => {
    setMines((prev) =>
      prev.map((m) => (m.id === mineId ? { ...m, manager } : m))
    )
  }

  const managerMine = mines.find((m) => m.id === managerMineId) || null

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Mine Sites</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {mines.length} active site{mines.length === 1 ? '' : 's'} across the company
              </h1>
            </div>
            <button
              onClick={() => setShowAddMine(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
            >
              <Plus size={16} />
              Add new mine
            </button>
          </header>

          {/* Mine cards */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {mines.map((m) => (
              <div
                key={m.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs uppercase tracking-widest text-white/60">
                      Est. {m.established?.slice(0, 4)}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{m.name}</h3>
                  <div className="mt-1 flex items-center gap-1 text-sm text-white/70">
                    <MapPin className="h-3.5 w-3.5" />
                    {m.location}
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <Users className="mx-auto h-4 w-4 text-amber-600" />
                      <div className="mt-1 font-semibold text-slate-800">{m.staffCount}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Staff</div>
                    </div>
                    <div>
                      <Mountain className="mx-auto h-4 w-4 text-amber-600" />
                      <div className="mt-1 font-semibold text-slate-800">{m.productionKg}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">kg / 30d</div>
                    </div>
                    <div>
                      <Wallet className="mx-auto h-4 w-4 text-amber-600" />
                      <div className="mt-1 text-xs font-semibold text-slate-800">
                        {formatRWF(m.payroll).replace('RWF', '')}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">Payroll</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mine Manager</span>
                      <span className={`font-medium ${m.manager?.name ? 'text-slate-800' : 'text-slate-300'}`}>
                        {m.manager?.name || 'Unassigned'}
                      </span>
                    </div>
                    {m.manager?.username && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Login username</span>
                        <span className="font-mono text-xs text-slate-500">{m.manager.username}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Accountant</span>
                      <span className={`font-medium ${m.accountantName ? 'text-slate-800' : 'text-slate-300'}`}>
                        {m.accountantName || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setManagerMineId(m.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50/40 hover:text-amber-700"
                  >
                    <UserCog size={16} />
                    {m.manager ? 'Change manager' : 'Assign manager'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showAddMine && (
        <AddMineModal onClose={() => setShowAddMine(false)} onSubmit={handleAddMine} />
      )}

      {managerMine && (
        <AssignManagerModal
          mine={managerMine}
          onClose={() => setManagerMineId(null)}
          onSubmit={(manager) => handleAssignManager(managerMine.id, manager)}
        />
      )}
    </div>
  )
}

function ModalShell({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
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

function AddMineModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [established, setEstablished] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !location.trim()) return
    onSubmit({
      name: name.trim(),
      location: location.trim(),
      established: established || new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <ModalShell title="Add new mine" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Mine name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nyagatare Site"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Nyagatare, Rwanda"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Established date
          </label>
          <input
            type="date"
            value={established}
            onChange={(e) => setEstablished(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
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
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Add mine
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function AssignManagerModal({ mine, onClose, onSubmit }) {
  const [step, setStep] = useState('form') // 'form' | 'created'
  const [name, setName] = useState(mine.manager?.name || '')
  const [username, setUsername] = useState(mine.manager?.username || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedManager, setSavedManager] = useState(null)

  const handleGenerate = () => {
    const pwd = generatePassword()
    setPassword(pwd)
    setConfirmPassword(pwd)
    setShowPassword(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !username.trim()) {
      setError('Name and username/email are required.')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const manager = { name: name.trim(), username: username.trim(), password }
    onSubmit(manager)
    setSavedManager(manager)
    setStep('created')
  }

  const handleCopy = async () => {
    if (!savedManager) return
    const text = `Username: ${savedManager.username}\nPassword: ${savedManager.password}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API unavailable — ignore silently, owner can still read it on screen
    }
  }

  if (step === 'created' && savedManager) {
    return (
      <ModalShell title="Manager account created" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Share these credentials with <span className="font-medium text-slate-700">{savedManager.name}</span> so
            they can log in as manager of <span className="font-medium text-slate-700">{mine.name}</span>.
          </p>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Username</span>
              <span className="font-mono font-medium text-slate-800">{savedManager.username}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Password</span>
              <span className="font-mono font-medium text-slate-800">{savedManager.password}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            This password is only shown once here. Make sure to copy or share it now.
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
              onClick={onClose}
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
    <ModalShell title={`Assign manager — ${mine.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Full name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jean-Paul Nkurunziza"
            autoFocus
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Login username or email
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. jp.nkurunziza"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            required
          />
        </div>

        <div>
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Confirm password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            required
          />
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
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Create manager login
          </button>
        </div>
      </form>
    </ModalShell>
  )
}