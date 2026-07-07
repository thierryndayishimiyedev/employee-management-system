import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  TrendingUp,
  CalendarCheck,
  Mountain,
  Wallet,
  BadgeDollarSign,
  CreditCard,
  FileText,
  UserCog,
  Shield,
  Pickaxe,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { useAuth } from '../context/authStore'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN'] },
  { to: '/companies', label: 'Companies', icon: Building2, roles: ['SUPER_ADMIN'] },
  { to: '/owners', label: 'Owners', icon: UserCog, roles: ['SUPER_ADMIN'] },
  { to: '/admins', label: 'Admins', icon: Shield, roles: ['SUPER_ADMIN'] },
  { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['OWNER'] },
  { to: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['MANAGER'] },
  { to: '/accountant/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ACCOUNTANT'] },
  { to: '/mines', label: 'Mines', icon: Building2, roles: ['OWNER'] },
  { to: '/departments', label: 'Departments', icon: Building2, roles: ['OWNER'] },
  { to: '/positions', label: 'Positions', icon: TrendingUp, roles: ['OWNER'] },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
  { to: '/production', label: 'Production', icon: Mountain, roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
  { to: '/workers', label: 'Workers', icon: Users, roles: ['OWNER', 'MANAGER'] },
  { to: '/payroll', label: 'Payroll', icon: Wallet, roles: ['OWNER', 'ACCOUNTANT'] },
  { to: '/advances', label: 'Advances', icon: BadgeDollarSign, roles: ['OWNER', 'ACCOUNTANT'] },
  { to: '/payments', label: 'Payments', icon: CreditCard, roles: ['OWNER'] },
  { to: '/reports', label: 'Reports', icon: FileText, roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
  { to: '/managers', label: 'Managers', icon: UserCog, roles: ['OWNER'] },
  { to: '/accountants', label: 'Accountants', icon: Users, roles: ['OWNER'] },
  { to: '/roles', label: 'Roles', icon: Shield, roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
]

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  if (!user) return null

  const ownerName = user.employees
    ? `${user.employees.first_name} ${user.employees.last_name}`
    : user.username

  const initials = ownerName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleLogout = () => {
    logout()
    navigate(user.role_name === 'OWNER' ? '/owner/login' : '/login')
  }

  const visibleNav = nav.filter((item) => item.roles.includes(user.role_name))

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
        collapsed ? 'w-[76px]' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600">
          <Pickaxe className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight text-slate-900">MineWise</span>
            <span className="text-[10px] uppercase tracking-widest text-slate-400">Operations Suite</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
        )}
        <ul className="space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon
            const active =
              location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
      >
        {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        {!collapsed && <span>Collapse</span>}
      </button>

      {/* Footer / user */}
      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{ownerName}</div>
              <div className="truncate text-xs capitalize text-slate-400">
                {user.role_name?.toLowerCase().replace('_', ' ')}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="mt-2 flex w-full items-center justify-center rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}
