import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import AppSidebar from '../pages/Appsidebar'

const toneStyles = {
  amber: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100', dot: 'bg-emerald-500' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100', dot: 'bg-emerald-500' },
  cyan: { bg: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100', dot: 'bg-blue-500' },
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
    <article data-dashboard-card className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.icon} ring-4 ${tone.ring}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">{item.detail}</p>
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

export function LiveTrendChart({ title, description, data = [], dataKey = 'value', labelKey = 'date', color = '#16834a', type = 'area', valueFormatter = (value) => Number(value || 0).toLocaleString(), unavailable }) {
  const chartData = Array.isArray(data) ? data : []
  const trend = compareTrend(chartData, dataKey)

  return (
    <SectionCard eyebrow="Live database trend" title={title} className="overflow-hidden" action={<TrendBadge trend={trend} />}>
      <p className="mt-2 text-sm text-slate-500">{description} {trend.label}</p>
      {unavailable ? (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800">{unavailable}</div>
      ) : chartData.length === 0 ? (
        <div className="mt-5 flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center text-sm text-slate-500">
          No recorded data is available for this trend yet.
        </div>
      ) : (
        <div className="mt-5 h-60 min-w-0" role="img" aria-label={`${title} chart based on recorded data`}>
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey={labelKey} tickFormatter={labelKey === 'date' ? shortDate : undefined} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={valueFormatter} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip labelFormatter={(label) => `Date: ${label}`} formatter={(value) => [valueFormatter(value), title]} contentStyle={tooltipStyle} />
                <Bar dataKey={dataKey} fill={color} radius={[7, 7, 0, 0]} maxBarSize={42} />
              </BarChart>
            ) : type === 'line' ? (
              <LineChart data={chartData} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey={labelKey} tickFormatter={labelKey === 'date' ? shortDate : undefined} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={valueFormatter} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip labelFormatter={(label) => `Date: ${label}`} formatter={(value) => [valueFormatter(value), title]} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                <defs><linearGradient id={`gradient-${dataKey}-${title.replace(/\s+/g, '')}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey={labelKey} tickFormatter={labelKey === 'date' ? shortDate : undefined} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={valueFormatter} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
                <Tooltip labelFormatter={(label) => `Date: ${label}`} formatter={(value) => [valueFormatter(value), title]} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} fill={`url(#gradient-${dataKey}-${title.replace(/\s+/g, '')})`} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  )
}

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#7c3aed', '#0891b2']

export function DistributionChart({ title, description, data = [], valueFormatter = (value) => Number(value || 0).toLocaleString() }) {
  const chartData = (Array.isArray(data) ? data : []).filter((item) => Number(item.value || 0) > 0)
  const total = chartData.reduce((sum, item) => sum + Number(item.value || 0), 0)
  return (
    <SectionCard eyebrow="Live database distribution" title={title} className="overflow-hidden">
      <p className="mt-2 text-sm text-slate-500">{description} Each slice is calculated from currently visible records only.</p>
      {chartData.length === 0 ? <div className="mt-5 flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center text-sm text-slate-500">No recorded data is available for this distribution yet.</div> : <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center"><div className="h-56 min-w-0" role="img" aria-label={`${title} pie chart based on recorded data`}><ResponsiveContainer width="100%" height="100%"><PieChart><Tooltip formatter={(value) => [valueFormatter(value), 'Value']} contentStyle={tooltipStyle} /><Pie data={chartData} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="78%" paddingAngle={3}>{chartData.map((item, index) => <Cell key={`${item.name}-${index}`} fill={chartColors[index % chartColors.length]} />)}</Pie></PieChart></ResponsiveContainer></div><div className="space-y-2">{chartData.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"><span className="flex min-w-0 items-center gap-2 font-medium text-slate-700"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.name}</span><strong className="shrink-0 text-slate-900">{valueFormatter(item.value)} <em className="not-italic text-slate-400">({total ? Math.round((Number(item.value) / total) * 100) : 0}%)</em></strong></div>)}</div></div>}
    </SectionCard>
  )
}

// Same combined bar + line presentation used by Attendance. The bar series
// show individual recorded categories; the line provides the primary outcome
// or comparison. Nothing is calculated in the browser beyond presentation.
export function CombinedOperationsChart({ title, description, data = [], bars = [], line, valueFormatter = (value) => Number(value || 0).toLocaleString(), lineFormatter = valueFormatter }) {
  const chartData = Array.isArray(data) ? data : []
  const trend = compareTrend(chartData, line?.key)
  if (!line?.key) return null
  return <SectionCard eyebrow="Live database comparison" title={title} className="overflow-hidden" action={<TrendBadge trend={trend} />}><p className="mt-2 text-sm text-slate-500">{description} {trend.label}</p>{chartData.length === 0 ? <div className="mt-5 flex min-h-64 items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-5 text-center text-sm text-slate-500">No recorded data is available for this comparison yet.</div> : <div className="mt-5 h-72 min-w-0" role="img" aria-label={`${title} live bar and line chart`}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: 4, left: -14, bottom: 0 }}><CartesianGrid vertical={false} stroke="#dbeafe" strokeDasharray="3 3" /><XAxis dataKey="date" tickFormatter={shortDate} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} /><YAxis yAxisId="bars" tickFormatter={valueFormatter} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={48} /><YAxis yAxisId="line" orientation="right" tickFormatter={lineFormatter} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={48} /><Tooltip labelFormatter={(label) => `Date: ${label}`} formatter={(value, name) => [name === line.label ? lineFormatter(value) : valueFormatter(value), name]} contentStyle={tooltipStyle} /><Legend wrapperStyle={{ paddingTop: 14, fontSize: 12 }} />{bars.map((bar) => <Bar key={bar.key} yAxisId="bars" dataKey={bar.key} name={bar.label} fill={bar.color} radius={[6, 6, 0, 0]} maxBarSize={28} />)}<Line yAxisId="line" type="monotone" dataKey={line.key} name={line.label} stroke={line.color || '#2563eb'} strokeWidth={3} dot={{ r: 3, fill: line.color || '#2563eb' }} activeDot={{ r: 5 }} /></ComposedChart></ResponsiveContainer></div>}</SectionCard>
}

function compareTrend(data, key) {
  if (!data || data.length < 2) return { direction: 'stable', label: 'First recorded point—comparison appears after another recorded day.' }
  const latest = Number(data[data.length - 1]?.[key] || 0)
  const previous = Number(data[data.length - 2]?.[key] || 0)
  if (previous === 0 && latest > 0) return { direction: 'up', label: 'Growing from the previous recorded date.' }
  if (previous === 0 && latest === 0) return { direction: 'stable', label: 'No change from the previous recorded date.' }
  const percent = Math.round(Math.abs(((latest - previous) / previous) * 100))
  if (latest > previous) return { direction: 'up', label: `Up ${percent}% from the previous recorded date.` }
  if (latest < previous) return { direction: 'down', label: `Down ${percent}% from the previous recorded date.` }
  return { direction: 'stable', label: 'No change from the previous recorded date.' }
}

function TrendBadge({ trend }) {
  const styles = trend.direction === 'up' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : trend.direction === 'down' ? 'bg-red-50 text-red-700 ring-red-100' : 'bg-blue-50 text-blue-700 ring-blue-100'
  const Icon = trend.direction === 'up' ? ArrowUpRight : trend.direction === 'down' ? ArrowDownRight : Minus
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${styles}`}><Icon size={14} />{trend.direction === 'up' ? 'Growing' : trend.direction === 'down' ? 'Down' : 'Stable'}</span>
}

const shortDate = (value) => {
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const tooltipStyle = { borderRadius: 12, border: '1px solid #dbe5df', boxShadow: '0 12px 28px rgba(15, 23, 42, .12)' }
