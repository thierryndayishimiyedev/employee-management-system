import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Pickaxe, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const demoAccounts = [
  { role: 'Owner', name: 'owner@miningops.rw', password: 'owner123' },
  { role: 'Mine Manager', name: 'manager@miningops.rw', password: 'manager123' },
  { role: 'Accountant', name: 'accountant@miningops.rw', password: 'acct123' },
]

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return (
      <Navigate
        to={user?.role_name === 'OWNER' ? '/owner/dashboard' : '/dashboard'}
        replace
      />
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await login(name, password)
      toast.success('Welcome back')
      const roleName =
        response?.data?.data?.user?.role_name ||
        response?.data?.data?.user?.roles?.role_name ||
        response?.data?.data?.user?.role ||
        user?.role_name
      const destination = roleName === 'OWNER' ? '/owner/dashboard' : '/dashboard'
      navigate(destination)
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || 'Login failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const quickFill = (account) => {
    setName(account.name)
    setPassword(account.password)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-300 text-slate-900">
            <Pickaxe className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">MineOps</div>
            <div className="text-xs uppercase tracking-widest text-white/70">Operations Suite</div>
          </div>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Run every mine site from a single command center.
          </h1>
          <p className="text-white/70 leading-relaxed">
            Track employees, attendance, loans, canteen, production and payroll across all mining sites in real time with role-based access.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/15">
            {[
              { v: '5', l: 'Active Mines' },
              { v: '60+', l: 'Employees' },
              { v: '100%', l: 'Automated Payroll' },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-display text-2xl font-semibold text-amber-300">{s.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/60">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/60 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure access · Role-based permissions
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300 text-slate-900">
              <Pickaxe className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">MineOps</span>
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Sign in</h2>
            <p className="text-sm text-slate-500">Enter your credentials to access the operations dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">name</label>
              <input
                id="name"
                type="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="you@miningops.rw"
                className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-3xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="border-t pt-6 space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Demo accounts</p>
            <div className="grid gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.name}
                  type="button"
                  onClick={() => quickFill(account)}
                  className="text-left rounded-3xl border border-slate-200 bg-white p-3 hover:border-cyan-500 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{account.role}</div>
                      <div className="text-xs text-slate-500 font-mono">{account.name}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-cyan-500">Use →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 text-center text-sm text-slate-500">
            <p>Are you an Owner? <a href="/owner/login" className="font-semibold text-cyan-500 hover:text-cyan-400">Use the Owner portal</a></p>
          </div>
        </div>
      </div>
    </div>
  )
}
