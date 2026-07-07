import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  Plus,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import { DashboardHeader, DashboardShell, QuickActionGrid, SectionCard, StatGrid } from '../components/DashboardKit'
import RegisterCompanyModal from '../components/RegisterCompanyModal'
import RegisterOwnerModal from '../components/registerOwnerModal'

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

  const quickActions = actions.map((action) => ({
    ...action,
    onClick: () => handleActionClick(action),
  }))

  return (
    <DashboardShell>
      <DashboardHeader
        eyebrow="Super Admin dashboard"
        title="System control center"
        description="Manage mining companies and owner access. Company operations stay with Owner, Manager, and Accountant roles."
        loading={loading}
        onRefresh={loadDashboard}
        action={
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Logout
          </button>
        }
      />

          {error && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

      <StatGrid stats={stats} />

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

            <SectionCard eyebrow="Quick actions" title="Super Admin workflows">
              <QuickActionGrid actions={quickActions} />
            </SectionCard>
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
                        {activity.company || '-'} - {activity.user || 'System'} - {formatDate(activity.date)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

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
    </DashboardShell>
  )
}
