import { Link } from 'react-router-dom'
import { Building2, CalendarCheck, Users, Wallet, Mountain, TrendingUp, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const stats = [
  { label: 'Active employees', value: '56', icon: Users, tone: 'amber', detail: '4 new this month' },
  { label: 'Attendance rate', value: '92%', icon: CalendarCheck, tone: 'success', detail: 'Today’s snapshot' },
  { label: 'Production this month', value: '2,480 kg', icon: Mountain, tone: 'default', detail: 'Compared to last month' },
  { label: 'Payroll due', value: '18 staff', icon: Wallet, tone: 'warning', detail: 'Next payout cycle' },
]

const actions = [
  { to: '/departments', label: 'Manage departments', icon: Building2 },
  { to: '/positions', label: 'Create positions', icon: TrendingUp },
  { to: '/attendance', label: 'Record attendance', icon: CalendarCheck },
  { to: '/production', label: 'Log production', icon: Mountain },
]

const overviewCards = [
  { title: 'Mine health', value: 'Good', details: 'All equipment active' },
  { title: 'Pending approvals', value: '3', details: 'Leave and advance requests' },
  { title: 'Notifications', value: '12', details: 'Recent updates available' },
]

export default function OwnerDashboardPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  const ownerName = user.employees ? `${user.employees.first_name} ${user.employees.last_name}` : user.username

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-slate-700/50 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/30">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.24em] text-amber-300/90">Owner dashboard</p>
              <h1 className="text-4xl font-bold tracking-tight text-white">Welcome back, {ownerName.split(' ')[0]}</h1>
              <p className="max-w-2xl text-slate-400">Your company performance and team operations are all in one owner portal. Use quick actions to manage departments, positions, attendance, and production.</p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 border border-slate-700/50 p-5">
              <p className="text-sm text-slate-400">Company tier</p>
              <p className="mt-2 text-3xl font-semibold text-white">Gold</p>
              <p className="mt-1 text-sm text-slate-400">Powered by MineOps</p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.label} className="rounded-3xl border border-slate-700/50 bg-slate-900/90 p-6 shadow-xl shadow-slate-950/20">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
                    <p className="mt-4 text-3xl font-semibold text-white">{item.value}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-amber-300">
                    <Icon size={22} />
                  </div>
                </div>
                <p className="mt-5 text-sm text-slate-500">{item.detail}</p>
              </article>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-slate-700/50 bg-slate-900/90 p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Operational pulse</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Monthly performance</h2>
              </div>
              <span className="rounded-full bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200">Updated today</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {overviewCards.map((card) => (
                <div key={card.title} className="rounded-3xl border border-slate-700/50 bg-slate-950/80 p-5">
                  <p className="text-sm text-slate-400">{card.title}</p>
                  <p className="mt-4 text-3xl font-semibold text-white">{card.value}</p>
                  <p className="mt-3 text-sm text-slate-500">{card.details}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/90 p-6 shadow-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Today’s priority</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Keep production on track</h3>
            <p className="mt-4 text-slate-400">Review team attendance and confirm payroll details before the next pay cycle.</p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between rounded-3xl border border-slate-700/50 bg-slate-950/80 p-4">
                <span className="text-sm text-slate-300">Pending staff approvals</span>
                <span className="text-sm font-semibold text-white">7</span>
              </div>
              <div className="flex items-center justify-between rounded-3xl border border-slate-700/50 bg-slate-950/80 p-4">
                <span className="text-sm text-slate-300">Advance payouts</span>
                <span className="text-sm font-semibold text-white">2 requests</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-700/50 bg-slate-900/90 p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Quick actions</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Jump into your most used workflows</h2>
            </div>
            <Link to="/owner/dashboard" className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20">
              Refresh dashboard
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  className="rounded-3xl border border-slate-700/50 bg-slate-950/80 p-5 text-left transition hover:border-cyan-500/60 hover:bg-slate-900/95"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                    <Icon size={20} />
                  </div>
                  <p className="mt-5 text-sm uppercase tracking-[0.24em] text-slate-400">{action.label}</p>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/90 p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Company activity</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Recent updates</h2>
              </div>
              <AlertCircle className="h-6 w-6 text-amber-300" />
            </div>
            <div className="mt-6 space-y-4">
              {[
                'Payroll summary completed for June.',
                'Production logged for Site A and Site B.',
                'New department approval pending.',
                'Attendance review required for 4 employees.',
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-slate-700/50 bg-slate-950/80 p-4 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/50 bg-slate-900/90 p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Production summary</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Target progress</h2>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-300">On track</span>
            </div>
            <div className="mt-7 grid gap-3">
              {['30 kg/day average', '8 production tasks open', '2 mines under review'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-3xl border border-slate-700/50 bg-slate-950/80 p-4 text-sm text-slate-300">
                  <div className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
