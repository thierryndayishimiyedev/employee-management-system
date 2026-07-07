import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import AppSidebar from './Appsidebar'
import RegisterCompanyModal from '../components/RegisterCompanyModal'
import RegisterOwnerModal from '../components/registerOwnerModal'

const toneStyles = {
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', ring: 'ring-cyan-100' },
  slate: { bg: 'bg-slate-100', icon: 'text-slate-600', ring: 'ring-slate-200' },
}

const actions = [
  { label: 'Register company', icon: Building2, type: 'company' },
  { label: 'Create owner', icon: UserCog, to: '/owners' },
  { label: 'View companies', icon: ShieldCheck, to: '/companies' },
  { label: 'View owners', icon: Users, to: '/owners' },
]

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function normalizeStatus(status) {
  return String(status || 'ACTIVE').toUpperCase()
}

function StatCard({ label, value, detail, icon: Icon, tone = 'amber' }) {
  const toneClass = toneStyles[tone] || toneStyles.amber

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass.bg} ${toneClass.icon} ring-4 ${toneClass.ring}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
    </article>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const response = await api.get('/super-admin/dashboard')
      setDashboard(response.data?.data || response.data || null)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError(err.response?.data?.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const companies = useMemo(() => {
    return (dashboard?.recent_companies || []).map((company) => ({
      id: company.company_id,
      name: company.company_name || '-',
      province: company.province || '-',
      owner: company.owner || 'Not Assigned',
      status: normalizeStatus(company.status),
      employees: company.employees ?? 0,
      createdAt: formatDate(company.created_at),
    }))
  }, [dashboard])

  const growth = dashboard?.companies_growth?.length ? dashboard.companies_growth : []
  const activities = dashboard?.recent_activities?.length ? dashboard.recent_activities : []
  const maxTrend = Math.max(...growth.map((item) => Number(item.value) || 0), 1)

  const totalCompanies = dashboard?.total_companies ?? 0
  const activeCompanies = dashboard?.active_companies ?? companies.filter((company) => company.status === 'ACTIVE').length
  const totalOwners = dashboard?.total_owners ?? 0
  const totalEmployees = dashboard?.total_employees ?? 0

  const stats = [
    {
      label: 'Total companies',
      value: totalCompanies,
      detail: `${activeCompanies} active companies`,
      icon: Building2,
      tone: 'amber',
    },
    {
      label: 'Active companies',
      value: activeCompanies,
      detail: 'Companies currently enabled in the system',
      icon: CheckCircle2,
      tone: 'emerald',
    },
    {
      label: 'Total owners',
      value: totalOwners,
      detail: 'Owner accounts created by Super Admin',
      icon: UserCog,
      tone: 'cyan',
    },
    {
      label: 'Total employees',
      value: totalEmployees,
      detail: 'Employees across all companies',
      icon: Users,
      tone: 'slate',
    },
  ]

  const handleRegisterSuccess = (createdCompany) => {
    setShowRegisterModal(false)
    setSelectedCompany(createdCompany)
    setShowOwnerModal(Boolean(createdCompany?.company_id))
    loadDashboard()
  }

  const handleOwnerSuccess = () => {
    setShowOwnerModal(false)
    setSelectedCompany(null)
    loadDashboard()
  }

  const handleActionClick = (action) => {
    if (action.type === 'company') {
      setShowRegisterModal(true)
      return
    }
    navigate(action.to)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
                  Super Admin dashboard
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  System control center
                </h1>
                <p className="max-w-2xl text-slate-500">
                  Manage mining companies and owner access. Attendance, production, reports, payroll, and payments stay with the company roles.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={loadDashboard}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <StatCard key={item.label} {...item} />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Company growth</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Monthly registrations</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                  Real API data
                </span>
              </div>

              <div className="mt-6 h-64 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                {growth.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No growth data available.</div>
                ) : (
                  <div className="flex h-full items-end gap-3">
                    {growth.map((point) => (
                      <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-40 w-full items-end justify-center rounded-lg bg-gradient-to-t from-amber-500 to-amber-300/70 p-1">
                          <div
                            className="w-full rounded-md bg-amber-600"
                            style={{ height: `${Math.max((Number(point.value) / maxTrend) * 100, 8)}%` }}
                          />
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-semibold text-slate-600">{point.label}</div>
                          <div className="text-[11px] text-slate-400">{point.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick actions</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Super Admin workflows</h2>
              <div className="mt-6 grid gap-3">
                {actions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleActionClick(action)}
                      className="group rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-slate-200">
                            <Icon size={18} />
                          </span>
                          {action.label}
                        </span>
                        <ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-amber-600" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recently registered</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Companies</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  <Plus size={16} />
                  Register company
                </button>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <p className="p-6 text-sm text-slate-500">Loading dashboard data...</p>
                ) : companies.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No companies registered yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Company</th>
                        <th className="px-4 py-3 font-semibold">Province</th>
                        <th className="px-4 py-3 font-semibold">Owner</th>
                        <th className="px-4 py-3 font-semibold">Employees</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Created</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companies.map((company) => (
                        <tr key={company.id} className="transition hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-medium text-slate-800">{company.name}</td>
                          <td className="px-4 py-3 text-slate-600">{company.province}</td>
                          <td className="px-4 py-3 text-slate-600">{company.owner}</td>
                          <td className="px-4 py-3 text-slate-600">{company.employees}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                              company.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                                : 'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}>
                              {company.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">{company.createdAt}</td>
                          <td className="px-4 py-3 text-right">
                            <Link to="/companies" className="font-semibold text-cyan-700 transition hover:text-cyan-600">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Activity</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Recent updates</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-4 ring-amber-100">
                  <CalendarCheck size={18} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {activities.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500">No recent activity yet.</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <p className="text-sm font-semibold text-slate-800">{activity.event}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {activity.company || '-'} · {activity.user || 'System'} · {formatDate(activity.date)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <RegisterCompanyModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegisterSuccess}
      />

      <RegisterOwnerModal
        isOpen={showOwnerModal}
        onClose={() => setShowOwnerModal(false)}
        company={selectedCompany}
        onSuccess={handleOwnerSuccess}
      />
    </div>
  )
}
