import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Building2, MapPin, Users, Mountain, Wallet, Plus, X, UserCog } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppSidebar from './Appsidebar'

// ---- Mock data (swap for a real API later) ----
const initialMines = [
  {
    id: 'mine-1',
    name: 'Kigali North Site',
    location: 'Musanze, Rwanda',
    established: '2018-04-12',
    staffCount: 22,
    productionKg: 980,
    payroll: 4200000,
    managerName: 'Eric Mugisha',
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
    managerName: null,
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
    managerName: 'Diane Ingabire',
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
        managerName: null,
        accountantName: null,
        ...mine,
      },
    ])
    setShowAddMine(false)
  }

  const handleAssignManager = (mineId, managerName) => {
    setMines((prev) =>
      prev.map((m) => (m.id === mineId ? { ...m, managerName } : m))
    )
    setManagerMineId(null)
  }

  const managerMine = mines.find((m) => m.id === managerMineId) || null

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex">
      <AppSidebar />
      <div className="mx-auto max-w-7xl space-y-6 flex-1">
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
                    <span className={`font-medium ${m.managerName ? 'text-slate-800' : 'text-slate-300'}`}>
                      {m.managerName || 'Unassigned'}
                    </span>
                  </div>
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
                  {m.managerName ? 'Change manager' : 'Assign manager'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddMine && (
        <AddMineModal onClose={() => setShowAddMine(false)} onSubmit={handleAddMine} />
      )}

      {managerMine && (
        <AssignManagerModal
          mine={managerMine}
          onClose={() => setManagerMineId(null)}
          onSubmit={(name) => handleAssignManager(managerMine.id, name)}
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
  const [managerName, setManagerName] = useState(mine.managerName || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!managerName.trim()) return
    onSubmit(managerName.trim())
  }

  return (
    <ModalShell title={`Assign manager — ${mine.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Manager name
          </label>
          <input
            type="text"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="e.g. Jean-Paul Nkurunziza"
            autoFocus
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            required
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
            Save manager
          </button>
        </div>
      </form>
    </ModalShell>
  )
}