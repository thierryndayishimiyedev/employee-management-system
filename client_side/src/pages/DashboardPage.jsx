import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Users,
  CalendarCheck,
  Wallet,
  Building2,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react'

const clients = [
  { id: 'c1', name: 'ABC Mining', owner: 'John Kabera', managers: 4, employees: 78 },
  { id: 'c2', name: 'Kivu Mining', owner: 'Amina Niyonzima', managers: 3, employees: 64 },
  { id: 'c3', name: 'East Mining', owner: 'Eric Mugisha', managers: 5, employees: 98 },
]

const accessTrend = [
  { label: '06-15', value: 48 },
  { label: '06-16', value: 62 },
  { label: '06-17', value: 55 },
  { label: '06-18', value: 73 },
  { label: '06-19', value: 64 },
  { label: '06-20', value: 81 },
  { label: '06-21', value: 92 },
]

const billing = [
  { clientId: 'c1', netAmount: 1240000 },
  { clientId: 'c2', netAmount: 980000 },
  { clientId: 'c3', netAmount: 1125000 },
]

const pendingInvites = [
  { id: 'r1', type: 'Owner invite', clientId: 'c1' },
  { id: 'r2', type: 'Manager access', clientId: 'c3' },
]

const supportTickets = [
  { id: 't1', clientId: 'c1', status: 'open', description: 'Admin portal login issue' },
  { id: 't2', clientId: 'c2', status: 'open', description: 'Data sync delay' },
]

const actions = [
  { to: '/clients', label: 'Create client portal', icon: Building2 },
  { to: '/owners', label: 'Invite owner', icon: Users },
  { to: '/managers', label: 'Configure managers', icon: TrendingUp },
  { to: '/employees', label: 'Manage employees', icon: CalendarCheck },
]

function formatRWF(value) {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(value)
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
  const today = '2026-06-21'

  if (!admin) {
    return null
  }

  const ownerCount = clients.length
  const managerCount = clients.reduce((sum, client) => sum + client.managers, 0)
  const employeeCount = clients.reduce((sum, client) => sum + client.employees, 0)
  const totalBilling = billing.reduce((sum, item) => sum + item.netAmount, 0)
  const pendingCount = pendingInvites.length
  const supportCount = supportTickets.length
  const maxTrend = Math.max(...accessTrend.map((item) => item.value), 1)

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-header">
          <div>
            <h1>Super Admin Portal</h1>
            <p className="dashboard-subtitle">Developer control center for your client mining systems</p>
          </div>
          <div className="dashboard-actions">
            <span className="pill">Updated: {today}</span>
          </div>
        </section>

        <section className="stats-grid">
          <StatCard
            label="Client portals"
            value={String(clients.length)}
            delta={`${ownerCount} owner accounts`}
            icon={Building2}
            tone="amber"
          />
          <StatCard
            label="Owner accounts"
            value={String(ownerCount)}
            delta={`${managerCount} managers overall`}
            icon={Users}
            tone="success"
          />
          <StatCard
            label="Manager accounts"
            value={String(managerCount)}
            delta={`${employeeCount} employees total`}
            icon={TrendingUp}
          />
          <StatCard
            label="Billing run"
            value={formatRWF(totalBilling)}
            delta={`${supportCount} active tickets`}
            icon={Wallet}
            tone="warning"
          />
        </section>

        <section className="dashboard-grid">
          <div className="panel panel-lg chart-card">
            <div>
              <p className="panel-title">Client access trend</p>
              <p className="panel-description">Weekly portal activity across all clients</p>
            </div>
            <div className="trend-chart">
              {accessTrend.map((point) => (
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
              {accessTrend.map((point) => (
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

            <div className="alert-box">
              <AlertCircle size={18} />
              <div>
                <strong>{pendingCount}</strong> pending access approvals
              </div>
            </div>

            <div className="panel-description" style={{ margin: 0 }}>
              Open support tickets
              <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', color: '#fff' }}>{supportCount}</div>
            </div>
          </div>
        </section>

        <section className="panel">
          <p className="panel-title">Client portal hierarchy</p>
          <p className="panel-description">Your clients, owners, managers, and employee counts.</p>
          <div className="mines-grid">
            {clients.map((client) => (
              <Link key={client.id} to="/clients" className="mine-card">
                <div className="meta">
                  <Building2 size={18} />
                  <TrendingUp size={18} />
                </div>
                <div className="mine-title">{client.name}</div>
                <div className="mine-location">Owner: {client.owner}</div>
                <div className="mine-stats">
                  <span><strong>{client.managers}</strong> managers</span>
                  <span><strong>{client.employees}</strong> employees</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
