import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import RegisterCompanyModal from '../components/RegisterCompanyModal'
import RegisterOwnerModal from '../components/registerOwnerModal'
import {
  Users,
  Building2,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  CalendarCheck,
} from 'lucide-react'

const miningCompanies = [
  {
    id: 'c1',
    name: 'ABC Mining',
    province: 'South Province',
    owner: 'John Kabera',
    status: 'Active',
    employees: 78,
    createdAt: '2026-05-10',
  },
  {
    id: 'c2',
    name: 'Kivu Mining',
    province: 'West Province',
    owner: 'Amina Niyonzima',
    status: 'Active',
    employees: 64,
    createdAt: '2026-04-28',
  },
  {
    id: 'c3',
    name: 'East Mining',
    province: 'North Province',
    owner: 'Eric Mugisha',
    status: 'Inactive',
    employees: 98,
    createdAt: '2026-03-18',
  },
  {
    id: 'c4',
    name: 'Nyungwe Mining',
    province: 'East Province',
    owner: 'Claire Uwase',
    status: 'Active',
    employees: 52,
    createdAt: '2026-06-03',
  },
]

const companiesGrowth = [
  { label: 'Jan', value: 2 },
  { label: 'Feb', value: 4 },
  { label: 'Mar', value: 6 },
  { label: 'Apr', value: 7 },
  { label: 'May', value: 8 },
  { label: 'Jun', value: 9 },
]

const recentActivities = [
  { id: 'a1', event: 'Company Registered', company: 'Nyungwe Mining', date: 'Jun 3, 2026', user: 'Admin' },
  { id: 'a2', event: 'Owner Created', company: 'East Mining', date: 'May 28, 2026', user: 'Admin' },
  { id: 'a3', event: 'Company Updated', company: 'ABC Mining', date: 'May 10, 2026', user: 'Admin' },
  { id: 'a4', event: 'Owner Password Reset', company: 'Kivu Mining', date: 'Apr 14, 2026', user: 'Admin' },
]

const systemHealth = [
  { id: 's1', name: 'Backend', status: 'Online' },
  { id: 's2', name: 'Database', status: 'Online' },
  { id: 's3', name: 'API', status: 'Online' },
  { id: 's4', name: 'Storage', status: 'Online' },
]

const actions = [
  { to: '/companies', label: 'Register Company', icon: Building2 },
  { to: '/owners', label: 'Create Owner', icon: Users },
  { to: '/companies', label: 'View Companies', icon: TrendingUp },
  { to: '/roles', label: 'View Roles', icon: CalendarCheck },
]

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function StatCard({ label, value, delta, icon: Icon, tone = 'default' }) {
  const toneStyles = {
    amber: 'bg-amber-500/20 text-amber-400',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-orange-500/20 text-orange-400',
    default: 'bg-blue-500/20 text-blue-400',
  }

  return (
    <article className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 flex flex-col gap-4 shadow-xl hover:border-slate-600/50 transition">
      <div className={`w-11 h-11 rounded-lg ${toneStyles[tone] || toneStyles.default} flex items-center justify-center`}>
        <Icon size={20} />
      </div>
      <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">{label}</p>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
      <p className="text-slate-300 text-sm">{delta}</p>
    </article>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // All hooks live inside the component body — this is what fixes the
  // "Invalid hook call" error. They were previously declared at module
  // scope (outside any component), which React does not allow.
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)

  const today = formatDate(new Date())

  useEffect(() => {
    let isMounted = true

    async function fetchDashboard() {
      try {
        setLoading(true)
        const res = await api.get('/super-admin/dashboard')
        if (isMounted) {
          setDashboard(res.data?.data || res.data)
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  if (!user) {
    return null
  }

  const dashboardCompanies = dashboard?.recent_companies?.map((company) => ({
    id: company.company_id,
    name: company.company_name,
    province: company.province,
    owner: company.owner,
    status: company.status,
    employees: company.employees,
    createdAt: company.created_at ? formatDate(new Date(company.created_at)) : 'Unknown',
  })) || miningCompanies
  const dashboardGrowth = dashboard?.companies_growth?.length ? dashboard.companies_growth : companiesGrowth
  const dashboardActivities = dashboard?.recent_activities?.map((activity) => ({
    id: activity.id,
    event: activity.event,
    company: activity.company,
    date: activity.date ? formatDate(new Date(activity.date)) : 'Unknown',
    user: activity.user,
  })) || recentActivities
  const dashboardHealth = dashboard?.system_health?.length ? dashboard.system_health : systemHealth

  const companiesCount = dashboard?.total_companies ?? dashboardCompanies.length
  const ownersCount = dashboard?.total_owners ?? dashboardCompanies.length
  const employeesCount = dashboard?.total_employees ?? dashboardCompanies.reduce((sum, company) => sum + company.employees, 0)
  const systemOnline = dashboardHealth.filter((item) => item.status === 'Online').length
  const maxTrend = Math.max(...dashboardGrowth.map((item) => item.value), 1)

  const handleRegisterSuccess = (createdCompany) => {
    setShowRegisterModal(false)
    setSelectedCompany(createdCompany)
    setShowOwnerModal(true)
  }

  const handleOwnerSuccess = () => {
    setShowOwnerModal(false)
    setSelectedCompany(null)
    // Dashboard data should refresh here if real API data is available.
  }

  const handleActionClick = (action) => {
    if (action.label === 'Register Company') {
      setShowRegisterModal(true)
    } else {
      navigate(action.to)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">Super Admin Portal</h1>
            <p className="text-slate-400 text-base md:text-lg mt-2">Developer control center for all mining companies</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/6 border border-slate-700/30 text-sm">
              {loading ? 'Updating...' : `Updated: ${today}`}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-full border border-slate-700/50 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-400 hover:text-amber-300"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Mining Companies"
            value={String(companiesCount)}
            delta={`${ownersCount} owners registered`}
            icon={Building2}
            tone="amber"
          />
          <StatCard
            label="Owners"
            value={String(ownersCount)}
            delta={`${employeesCount} employees managed`}
            icon={Users}
            tone="success"
          />
          <StatCard
            label="Employees"
            value={String(employeesCount)}
            delta={`${companiesCount} companies live`}
            icon={TrendingUp}
          />
          <StatCard
            label="System Online"
            value={`${systemOnline}/4`}
            delta="All services operational"
            icon={AlertCircle}
            tone="default"
          />
        </div>

        {/* Main Grid - Chart and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Chart Card */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-lg font-semibold text-white">Companies Growth</p>
              <p className="text-slate-400 text-sm mt-1">Monthly mining company registrations.</p>
            </div>
            
            {/* Trend Chart */}
            <div className="flex items-end gap-3 h-56 pb-3">
              {dashboardGrowth.map((point) => (
                <div
                  key={point.label}
                  className="flex-1 min-w-6 rounded-lg bg-gradient-to-t from-blue-500 to-cyan-400 relative group hover:opacity-80 transition"
                  style={{ height: `${Math.max((point.value / maxTrend) * 100, 8)}%` }}
                >
                  <span className="absolute -top-7 left-1/2 transform -translate-x-1/2 text-xs text-slate-300 font-medium group-hover:text-white transition">
                    {point.value}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Labels */}
            <div className="grid grid-cols-7 gap-3 mt-8">
              {dashboardGrowth.map((point) => (
                <span key={point.label} className="text-center text-xs text-slate-400">
                  {point.label}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {actions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleActionClick(action)}
                      className="w-full flex justify-between items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-slate-700/30 text-slate-100 hover:bg-cyan-500/10 hover:border-cyan-500/50 transition group"
                    >
                      <span className="flex items-center gap-3 text-sm font-medium">
                        <Icon size={16} className="group-hover:text-cyan-400 transition" />
                        {action.label}
                      </span>
                      <ArrowUpRight size={16} className="group-hover:text-cyan-400 transition" />
                    </button>
                  )
                })}
              </div>
            </div>
            
            <p className="text-slate-400 text-sm border-t border-slate-700/30 pt-4 mt-auto">
              This portal manages companies, owner access, and system health for your mining ecosystem.
            </p>
          </div>
        </div>

        {/* Main Grid - Table and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Recent Companies Table */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <p className="text-lg font-semibold text-white mb-2">Recent Companies</p>
            <p className="text-slate-400 text-sm mb-6">Latest companies registered through the developer portal.</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/30">
                    <th className="text-left py-3 px-3 font-semibold text-slate-300">Company</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-300">Province</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-300">Owner</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-300">Status</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-300">Created</th>
                    <th className="text-left py-3 px-3 font-semibold text-slate-300">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/20">
                  {dashboardCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3 text-slate-100">{company.name}</td>
                      <td className="py-3 px-3 text-slate-300">{company.province}</td>
                      <td className="py-3 px-3 text-slate-300">{company.owner}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          company.status.toLowerCase() === 'active'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-slate-700/40 text-slate-300'
                        }`}>
                          {company.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{company.createdAt}</td>
                      <td className="py-3 px-3">
                        <Link to="/companies" className="text-cyan-400 hover:text-cyan-300 font-medium text-xs transition">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activities & System Health */}
          <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col gap-6">
            
            {/* Recent Activity */}
            <div>
              <p className="text-lg font-semibold text-white mb-2">Recent Activity</p>
              <p className="text-slate-400 text-sm mb-4">Super Admin actions recorded by the portal.</p>
              
              <ul className="space-y-3">
                {dashboardActivities.map((activity) => (
                  <li key={activity.id} className="pb-3 border-b border-slate-700/20 last:border-b-0">
                    <div className="text-sm font-medium text-slate-100">{activity.event}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {activity.company} · {activity.user} · {activity.date}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* System Health */}
            <div className="border-t border-slate-700/30 pt-6">
              <div className="grid grid-cols-2 gap-3">
                {dashboardHealth.map((service) => (
                  <div key={service.id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/20 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{service.name}</div>
                      <div className="text-xs text-slate-400 mt-1">{service.status}</div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

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
    </div>
  )
}  
