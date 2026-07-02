import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Pickaxe, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function OwnerLoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/owner/dashboard" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      await login(username, password, 'owner')
      toast.success('Welcome back, Owner!')
      navigate('/owner/dashboard')
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-300 text-slate-950">
            <Pickaxe className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">MineOps Owner</div>
            <div className="text-xs uppercase tracking-widest text-white/70">Owner portal access</div>
          </div>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Access your company operations, production and payroll in one place.
          </h1>
          <p className="text-white/70 leading-relaxed">
            Sign in with the credentials created by your administrator. Manage your mine, teams, attendance and payroll from a modern owner dashboard.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/15">
            {[{ v: '1', l: 'Owner portal' }, { v: '5+', l: 'Quick actions' }, { v: '100%', l: 'Secure access' }].map((item) => (
              <div key={item.l}>
                <div className="font-display text-2xl font-semibold text-amber-300">{item.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/60">{item.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs text-white/70 flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" /> Your login is secured with role-based access.
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-300 text-slate-950">
              <Pickaxe className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">Owner Portal</span>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Owner Sign in</h2>
              <p className="text-sm text-slate-500">Sign in with the username and password created for you by the developer.</p>
            </div>
            <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Owner-only portal</p>
              <p className="mt-1">Access company operations, departments, positions, attendance and payroll.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">Username</label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="owner.username"
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
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Need help?</p>
            <div className="space-y-2 text-sm text-slate-600">
              <p>If you don’t have credentials yet, ask your company administrator to create your owner account.</p>
              <p className="text-slate-500">Use the developer page only if you manage companies and owners.</p>
            </div>
          </div>

          <div className="pt-4 text-center text-sm text-slate-500">
            <p>Developer portal? <Link to="/login" className="font-semibold text-cyan-500 hover:text-cyan-400">Go to admin login</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}
