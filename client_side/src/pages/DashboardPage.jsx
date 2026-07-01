import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
  { to: '/audit-logs', label: 'Audit Logs', icon: CalendarCheck },
]

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function StatCard({ label, value, delta, icon: Icon, tone = 'default' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-card-icon">
        <Icon size={20} />
      </div>
      <p className="label">{label}</p>
      <h3 className="value">{value}</h3>
      <p className="delta">{delta}</p>
    </article>
  )
}

export default function DashboardPage() {
  const { admin } = useAuth()
  const today = formatDate(new Date())

  if (!admin) {
    return null
  }

  const companiesCount = miningCompanies.length
  const ownersCount = miningCompanies.length
  const employeesCount = miningCompanies.reduce((sum, company) => sum + company.employees, 0)
  const systemOnline = systemHealth.filter((item) => item.status === 'Online').length
  const maxTrend = Math.max(...companiesGrowth.map((item) => item.value), 1)

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-header">
          <div>
            <h1>Super Admin Portal</h1>
            <p className="dashboard-subtitle">Developer control center for all mining companies</p>
          </div>
          <div className="dashboard-actions">
            <span className="pill">Updated: {today}</span>
          </div>
        </section>

        <section className="stats-grid">
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
        </section>

        <section className="dashboard-grid">
          <div className="panel panel-lg chart-card">
            <div>
              <p className="panel-title">Companies Growth</p>
              <p className="panel-description">Monthly mining company registrations.</p>
            </div>
            <div className="trend-chart">
              {companiesGrowth.map((point) => (
                <div
                  key={point.label}
                  className="trend-bar"
                  style={{ height: `${Math.max((point.value / maxTrend) * 100, 8)}%` }}
                >
                  <span>{point.value}</span>
                </div>
              ))}
            </div>
            <div className="trend-labels">
              {companiesGrowth.map((point) => (
                <span key={point.label}>{point.label}</span>
              ))}
            </div>
          </div>

          <div className="panel panel-sm">
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              {actions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.to} to={action.to} className="action-link">
                    <span>
                      <Icon size={16} />
                      {action.label}
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>
                )
              })}
            </div>

            <div className="panel-description">
              This portal manages companies, owner access, and system health for your mining ecosystem.
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel panel-lg">
            <p className="panel-title">Recent Companies</p>
            <p className="panel-description">Latest companies registered through the developer portal.</p>
            <div className="table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Province</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {miningCompanies.map((company) => (
                    <tr key={company.id}>
                      <td>{company.name}</td>
                      <td>{company.province}</td>
                      <td>{company.owner}</td>
                      <td>
                        <span className={`status-badge ${company.status.toLowerCase()}`}>
                          {company.status}
                        </span>
                      </td>
                      <td>{company.createdAt}</td>
                      <td>
                        <Link to="/companies" className="table-link">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel panel-sm">
            <div>
              <p className="panel-title">Recent Activity</p>
              <p className="panel-description">Super Admin actions recorded by the portal.</p>
            </div>
            <ul className="activity-list">
              {recentActivities.map((activity) => (
                <li key={activity.id} className="activity-row">
                  <div className="activity-title">{activity.event}</div>
                  <div className="activity-meta">
                    {activity.company} · {activity.user} · {activity.date}
                  </div>
                </li>
              ))}
            </ul>
            <div className="system-health-grid">
              {systemHealth.map((service) => (
                <div key={service.id} className="health-card">
                  <div className="health-info">
                    <div className="health-name">{service.name}</div>
                    <div className="health-status">{service.status}</div>
                  </div>
                  <span className={`health-indicator ${service.status.toLowerCase()}`} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
