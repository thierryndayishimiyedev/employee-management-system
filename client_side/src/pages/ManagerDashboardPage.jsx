import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  ClipboardList,
  Mountain,
  TrendingUp,
  Users,
} from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import { DashboardHeader, DashboardShell, MetricList, QuickActionGrid, SectionCard, StatGrid } from '../components/DashboardKit'

const quickActions = [
  { to: '/reports', label: 'Review reports', icon: ClipboardList },
  { to: '/attendance', label: 'View attendance', icon: CalendarCheck },
  { to: '/production', label: 'View production', icon: Mountain },
  { to: '/workers', label: 'View workers', icon: Users },
]

export default function ManagerDashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [attendanceToday, setAttendanceToday] = useState([])
  const [production, setProduction] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [dashboardResult, attendanceResult, productionResult, employeesResult] = await Promise.allSettled([
        api.get('/dashboard/manager'),
        api.get('/attendance/today'),
        api.get('/production'),
        api.get('/employees'),
      ])

      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value?.data?.data || dashboardResult.value?.data || null)
      }
      if (attendanceResult.status === 'fulfilled') setAttendanceToday(asArray(attendanceResult.value))
      if (productionResult.status === 'fulfilled') setProduction(asArray(productionResult.value))
      if (employeesResult.status === 'fulfilled') setEmployees(asArray(employeesResult.value))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const managerName = user?.employees
    ? `${user.employees.first_name} ${user.employees.last_name}`
    : user?.username || 'Manager'

  const totalProduction = useMemo(
    () => production.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [production]
  )

  const stats = [
    {
      label: 'Workers managed',
      value: dashboard?.total_workers ?? employees.length,
      icon: Users,
      tone: 'amber',
      detail: 'Employees available for daily operations',
    },
    {
      label: 'Attendance today',
      value: attendanceToday.length,
      icon: CalendarCheck,
      tone: 'emerald',
      detail: 'Attendance records captured today',
    },
    {
      label: 'Production records',
      value: dashboard?.production_records ?? production.length,
      icon: Mountain,
      tone: 'cyan',
      detail: `${Number(totalProduction || 0).toLocaleString()} kg recorded`,
    },
    {
      label: 'Open workflows',
      value: '4',
      icon: ClipboardList,
      tone: 'slate',
      detail: 'Reports, attendance, production, and workers',
    },
  ]

  if (!user) return null

  return (
    <DashboardShell>
      <DashboardHeader
        eyebrow="Manager dashboard"
        title={`Welcome back, ${managerName.split(' ')[0]}`}
        description="Review daily reports, attendance, production, and worker operations without changing accountant-owned records."
        loading={loading}
        onRefresh={loadDashboard}
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading manager dashboard...
        </div>
      ) : (
        <>
          <StatGrid stats={stats} />

          <section className="grid gap-4 lg:grid-cols-3">
            <SectionCard eyebrow="Operational focus" title="Daily review center" className="lg:col-span-2">
              <QuickActionGrid actions={quickActions} />
            </SectionCard>

            <SectionCard
              eyebrow="Today"
              title="Shift visibility"
              action={<TrendingUp className="h-5 w-5 text-amber-600" />}
            >
              <MetricList
                metrics={[
                  { label: 'Attendance captured', value: attendanceToday.length },
                  { label: 'Production entries', value: production.length },
                  { label: 'Workers available', value: employees.length },
                ]}
              />
            </SectionCard>
          </section>
        </>
      )}
    </DashboardShell>
  )
}

function asArray(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : []
}
