import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  CreditCard,
  FileText,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import AppSidebar from './Appsidebar'

const toneStyles = {
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', ring: 'ring-cyan-100' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', ring: 'ring-slate-200' },
}

const quickActions = [
  { to: '/payroll', label: 'Generate payroll', icon: Wallet },
  { to: '/payments', label: 'Pay salaries', icon: CreditCard },
  { to: '/advances', label: 'Salary advances', icon: BadgeDollarSign },
  { to: '/reports', label: 'Prepare reports', icon: FileText },
]

export default function AccountantDashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [payrolls, setPayrolls] = useState([])
  const [payments, setPayments] = useState([])
  const [advances, setAdvances] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [dashboardResult, payrollResult, paymentsResult, advancesResult, reportsResult] = await Promise.allSettled([
        api.get('/dashboard/accountant'),
        api.get('/payroll'),
        api.get('/payments'),
        api.get('/advances'),
        api.get('/reports'),
      ])

      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value?.data?.data || dashboardResult.value?.data || null)
      }
      if (payrollResult.status === 'fulfilled') setPayrolls(asArray(payrollResult.value))
      if (paymentsResult.status === 'fulfilled') setPayments(asArray(paymentsResult.value))
      if (advancesResult.status === 'fulfilled') setAdvances(asArray(advancesResult.value))
      if (reportsResult.status === 'fulfilled') setReports(asArray(reportsResult.value))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const accountantName = user?.employees
    ? `${user.employees.first_name} ${user.employees.last_name}`
    : user?.username || 'Accountant'

  const pendingPayrolls = useMemo(
    () => payrolls.filter((item) => !['APPROVED', 'PAID'].includes(item.payment_status)).length,
    [payrolls]
  )
  const paidAmount = useMemo(
    () => payments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [payments]
  )
  const pendingAdvances = useMemo(
    () => advances.filter((item) => item.status !== 'APPROVED').length,
    [advances]
  )

  const stats = [
    {
      label: 'Pending payrolls',
      value: dashboard?.pending_payrolls ?? pendingPayrolls,
      icon: Wallet,
      tone: 'amber',
      detail: 'Payroll records awaiting approval or payment',
    },
    {
      label: 'Pending advances',
      value: dashboard?.pending_advances ?? pendingAdvances,
      icon: BadgeDollarSign,
      tone: 'cyan',
      detail: 'Advance requests still open',
    },
    {
      label: 'Payments recorded',
      value: payments.length,
      icon: CreditCard,
      tone: 'emerald',
      detail: `${Number(paidAmount || 0).toLocaleString()} RWF paid`,
    },
    {
      label: 'Reports',
      value: reports.length,
      icon: FileText,
      tone: 'slate',
      detail: 'Financial and operating reports in the system',
    },
  ]

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-100">
                  Accountant dashboard
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Welcome back, {accountantName.split(' ')[0]}
                </h1>
                <p className="max-w-2xl text-slate-500">
                  Review payroll, advances, salary payments, and reports from one finance workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={loadDashboard}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </header>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Loading accountant dashboard...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => <StatCard key={item.label} item={item} />)}
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Finance workflows</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Payroll and payment center</h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {quickActions.map((action) => {
                      const Icon = action.icon
                      return (
                        <Link
                          key={action.to}
                          to={action.to}
                          className="group rounded-xl border border-slate-200 bg-slate-50/60 p-5 transition hover:border-amber-300 hover:bg-amber-50/40"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-slate-200">
                              <Icon size={20} />
                            </div>
                            <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-amber-600" />
                          </div>
                          <p className="mt-4 text-sm font-semibold text-slate-700">{action.label}</p>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Finance status</p>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">Ready for payroll cycle</h3>
                  <div className="mt-6 space-y-3">
                    <Metric label="Payroll records" value={payrolls.length} />
                    <Metric label="Payment proofs" value={payments.length} />
                    <Metric label="Reports prepared" value={reports.length} />
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ item }) {
  const Icon = item.icon
  const tone = toneStyles[item.tone]
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
        {value}
      </span>
    </div>
  )
}

function asArray(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : []
}
