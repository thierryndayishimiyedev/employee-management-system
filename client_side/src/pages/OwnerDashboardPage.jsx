import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  CalendarCheck,
  Users,
  Wallet,
  Mountain,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Bell,
  ClipboardList,
  Gauge,
} from 'lucide-react'
import { useAuth } from '../context/authStore'
import api from '../api/api'
import AppSidebar from './Appsidebar'
// ---- Palette reference (Tailwind) ----
// Primary   amber-500 / amber-600
// Secondary slate-500 / slate-700
// Success   emerald-500
// Warning   orange-500
// Danger    red-500
// Info      cyan-500

const toneStyles = {
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', ring: 'ring-slate-200' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', ring: 'ring-orange-100' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', ring: 'ring-cyan-100' },
}

const actions = [
  { to: '/departments', label: 'Manage departments', icon: Building2 },
  { to: '/positions', label: 'Create positions', icon: TrendingUp },
  { to: '/attendance', label: 'Record attendance', icon: CalendarCheck },
  { to: '/production', label: 'Log production', icon: Mountain },
]

const productionTrend = [
  { day: 'Mon', kg: 320 },
  { day: 'Tue', kg: 365 },
  { day: 'Wed', kg: 310 },
  { day: 'Thu', kg: 410 },
  { day: 'Fri', kg: 388 },
  { day: 'Sat', kg: 340 },
  { day: 'Sun', kg: 347 },
]

export default function OwnerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadDashboard = async () => {
      try {
        const response = await api.get('/dashboard/owner')
        if (mounted) {
          setDashboard(response?.data?.data || response?.data || null)
        }
      } catch (error) {
        console.error('Failed to load owner dashboard data:', error)
        if (error?.response?.status === 403) {
          // Not an owner or lacks permissions
          setForbidden(true)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  // compute owner name safely (hooks must be called before any early returns)
  const ownerName = user?.employees ? `${user.employees.first_name} ${user.employees.last_name}` : (user?.username || '')

  const stats = useMemo(() => [
    {
      label: 'Active employees',
      value: dashboard?.total_employees ?? 0,
      icon: Users,
      tone: 'amber',
      detail: `${dashboard?.today_attendance ?? 0} checked in today`,
    },
    {
      label: 'Attendance today',
      value: `${dashboard?.today_attendance ?? 0}`,
      icon: CalendarCheck,
      tone: 'emerald',
      detail: 'Records captured for the current day',
    },
    {
      label: 'Production this month',
      value: `${Number(dashboard?.total_production || 0).toLocaleString()} kg`,
      icon: Mountain,
      tone: 'slate',
      detail: 'Based on production records in the system',
    },
    {
      label: 'Payroll due',
      value: `${Number(dashboard?.total_payroll || 0).toLocaleString()} RWF`,
      icon: Wallet,
      tone: 'orange',
      detail: `${dashboard?.pending_advances ?? 0} advance requests pending`,
    },
  ], [dashboard])

  const overviewCards = useMemo(() => [
    {
      title: 'Company health',
      value: dashboard?.total_employees ? 'Healthy' : 'Needs setup',
      details: `${dashboard?.total_employees ?? 0} employees tracked`,
      tone: 'emerald',
    },
    {
      title: 'Pending approvals',
      value: dashboard?.pending_advances ?? 0,
      details: 'Advance requests awaiting review',
      tone: 'amber',
    },
    {
      title: 'Attendance coverage',
      value: `${dashboard?.today_attendance ?? 0}`,
      details: 'Attendance records received today',
      tone: 'cyan',
    },
  ], [dashboard])

  const activity = useMemo(() => [
    {
      text: `${dashboard?.total_payroll ? 'Payroll value is currently' : 'Payroll data is being'} ${dashboard?.total_payroll ? `${Number(dashboard.total_payroll).toLocaleString()} RWF` : 'collected'}.`,
      tone: 'emerald',
    },
    {
      text: `${dashboard?.total_production ? `${Number(dashboard.total_production).toLocaleString()} kg` : 'No production'} recorded in the system.`,
      tone: 'amber',
    },
    {
      text: `${dashboard?.pending_advances ?? 0} advance request${(dashboard?.pending_advances ?? 0) === 1 ? '' : 's'} awaiting review.`,
      tone: 'cyan',
    },
    {
      text: `${dashboard?.today_attendance ?? 0} attendance records captured today.`,
      tone: 'orange',
    },
  ], [dashboard])

  // If user not available, don't render the dashboard UI
  if (!user) return null

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900">Access denied</h2>
          <p className="mt-2 text-sm text-slate-500">You don't have permission to view the owner dashboard.</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                // clear stored auth and redirect to login
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                navigate('/login')
              }}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
            >
              Go to login
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                // reload app
                window.location.href = '/'
              }}
              className="rounded-md bg-amber-600 px-3 py-1 text-sm font-semibold text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Hero */}
          <header className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
                  Owner dashboard
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Welcome back, {ownerName.split(' ')[0]}
                </h1>
                <p className="max-w-2xl text-slate-500">
                  Your company performance and team operations are all in one place. Use quick actions below to manage
                  departments, positions, attendance, and production.
                </p>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Company tier</p>
                <p className="text-2xl font-semibold text-amber-600">Gold</p>
                <p className="text-sm text-slate-400">Powered by MineWise ERP</p>
              </div>
            </div>
          </header>

          {/* Stat cards */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon
              const tone = toneStyles[item.tone]
              return (
                <article
                  key={item.label}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                      <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
                    </div>
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone.bg} ${tone.icon} ring-4 ${tone.ring}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-500">{item.detail}</p>
                </article>
              )
            })}
          </section>

          {/* Analytics + priority */}
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Operational pulse</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Production trend - last 7 days</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                  Updated today
                </span>
              </div>

              <div className="mt-6 h-64 -ml-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex h-full items-end gap-3">
                  {productionTrend.map((point) => (
                    <div key={point.day} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-40 w-full items-end justify-center rounded-lg bg-gradient-to-t from-amber-500 to-amber-300/70 p-1">
                        <div
                          className="w-full rounded-md bg-amber-600"
                          style={{ height: `${Math.max((point.kg / 450) * 100, 8)}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-slate-600">{point.day}</div>
                        <div className="text-[11px] text-slate-400">{point.kg}kg</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {overviewCards.map((card) => {
                  const tone = toneStyles[card.tone]
                  return (
                    <div key={card.title} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</p>
                      <p className={`mt-2 text-2xl font-bold ${tone.icon}`}>{card.value}</p>
                      <p className="mt-1 text-xs text-slate-500">{card.details}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-amber-600" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's priority</p>
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-900">Keep production on track</h3>
              <p className="mt-3 text-sm text-slate-500">
                Review team attendance and confirm payroll details before the next pay cycle.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <span className="text-sm text-slate-600">Employees tracked</span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                    {dashboard?.total_employees ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <span className="text-sm text-slate-600">Advance payouts</span>
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
                    {dashboard?.pending_advances ?? 0} requests
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <span className="text-sm text-slate-600">Production total</span>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-100">
                    {Number(dashboard?.total_production || 0).toLocaleString()} kg
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Quick actions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick actions</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Jump into your most used workflows</h2>
              </div>
              <Link
                to="/owner/dashboard"
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-100 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-100"
              >
                Refresh dashboard
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="group rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-left transition hover:border-amber-300 hover:bg-amber-50/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-slate-200">
                        <Icon size={20} />
                      </div>
                      <ArrowUpRight
                        size={16}
                        className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-amber-600"
                      />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-700">{action.label}</p>
                  </Link>
                )
              })}
            </div>
          </section>

          {/* Activity + progress */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Company activity</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Recent updates</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-4 ring-amber-100">
                  <Bell size={18} />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {activity.map((item) => {
                  const tone = toneStyles[item.tone]
                  return (
                    <div
                      key={item.text}
                      className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600"
                    >
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone.icon.replace('text-', 'bg-')}`} />
                      {item.text}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Production summary</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Target progress</h2>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-100">
                  <AlertCircle size={12} />
                  On track
                </span>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { label: '30 kg/day average', pct: 78 },
                  { label: '8 production tasks open', pct: 45 },
                  { label: '2 mines under review', pct: 60 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                      <span className="flex items-center gap-2">
                        <ClipboardList size={14} className="text-slate-400" />
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-700">{item.pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
