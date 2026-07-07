import { ArrowUpRight, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppSidebar from '../pages/Appsidebar'

const toneStyles = {
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100', dot: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100', dot: 'bg-emerald-500' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', ring: 'ring-cyan-100', dot: 'bg-cyan-500' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-500' },
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600', ring: 'ring-orange-100', dot: 'bg-orange-500' },
  red: { bg: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100', dot: 'bg-red-500' },
}

export function DashboardShell({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">{children}</div>
      </main>
    </div>
  )
}

export function DashboardHeader({
  eyebrow,
  title,
  description,
  loading = false,
  onRefresh,
  action,
  side,
}) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
          <p className="max-w-2xl text-slate-500">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {side}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          )}
          {action}
        </div>
      </div>
    </header>
  )
}

export function StatGrid({ stats, columns = 'xl:grid-cols-4' }) {
  return (
    <section className={`grid gap-4 md:grid-cols-2 ${columns}`}>
      {stats.map((item) => <StatCard key={item.label} item={item} />)}
    </section>
  )
}

export function StatCard({ item }) {
  const Icon = item.icon
  const tone = toneStyles[item.tone] || toneStyles.amber

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.icon} ring-4 ${tone.ring}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{item.detail}</p>
    </article>
  )
}

export function SectionCard({ eyebrow, title, children, action, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{eyebrow}</p>}
          {title && <h2 className="mt-2 text-xl font-semibold text-slate-900">{title}</h2>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function QuickActionGrid({ actions }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon
        const content = (
          <>
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-slate-200">
                <Icon size={20} />
              </div>
              <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-amber-600" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">{action.label}</p>
            {action.detail && <p className="mt-1 text-xs text-slate-500">{action.detail}</p>}
          </>
        )

        if (action.onClick) {
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="group rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-left transition hover:border-amber-300 hover:bg-amber-50/40"
            >
              {content}
            </button>
          )
        }

        return (
          <Link
            key={action.to || action.label}
            to={action.to}
            className="group rounded-xl border border-slate-200 bg-slate-50/60 p-5 text-left transition hover:border-amber-300 hover:bg-amber-50/40"
          >
            {content}
          </Link>
        )
      })}
    </div>
  )
}

export function MetricList({ metrics }) {
  return (
    <div className="mt-6 space-y-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <span className="text-sm text-slate-600">{metric.label}</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
            {metric.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ActivityList({ items }) {
  return (
    <div className="mt-5 space-y-3">
      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No recent activity yet.</p>
      ) : (
        items.map((item) => {
          const tone = toneStyles[item.tone || 'amber']
          return (
            <div key={item.id || item.text || item.event} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
              <span>{item.text || item.event}</span>
            </div>
          )
        })
      )}
    </div>
  )
}
