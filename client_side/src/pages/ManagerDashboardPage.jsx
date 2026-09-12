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
import { CombinedOperationsChart, DashboardHeader, DashboardShell, DistributionChart, LiveTrendChart, MetricList, QuickActionGrid, SectionCard, StatGrid } from '../components/DashboardKit'
import PeriodOperationsCards from '../components/PeriodOperationsCards'

const quickActions = [
  { to: '/reports', label: 'Review reports', icon: ClipboardList },
  { to: '/payroll', label: 'Review payroll', icon: ClipboardList },
  { to: '/advances', label: 'Review advances', icon: ClipboardList },
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
      value: dashboard?.counts?.workers ?? employees.length,
      icon: Users,
      tone: 'amber',
      detail: 'Employees available for daily operations',
    },
    {
      label: 'Attendance today',
      value: dashboard?.counts?.attendance_today ?? attendanceToday.length,
      icon: CalendarCheck,
      tone: 'emerald',
      detail: 'Attendance records captured today',
    },
    {
      label: 'Production records',
      value: production.length,
      icon: Mountain,
      tone: 'cyan',
      detail: `${Number(totalProduction || 0).toLocaleString()} kg recorded`,
    },
    {
      label: 'Open workflows',
      value: dashboard?.counts?.pending_approvals ?? 0,
      icon: ClipboardList,
      tone: 'slate',
      detail: `${dashboard?.counts?.reports_waiting ?? 0} reports awaiting your review`,
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
          <PeriodOperationsCards periods={dashboard?.periods} title="Manager unit — payroll, costs, and payment readiness" />

          <section className="grid gap-4 xl:grid-cols-3">
            <CombinedOperationsChart title="Attendance and shift hours" description="Bars show present and absent workers; the line shows recorded hours." data={dashboard?.charts?.attendance} bars={[{ key: 'present', label: 'Present', color: '#2563eb' }, { key: 'absent', label: 'Absent', color: '#ef4444' }]} line={{ key: 'hours', label: 'Hours worked', color: '#f59e0b' }} />
            <CombinedOperationsChart title="Payroll commitments" description="Bars show gross payroll, advances, and expenses; the line shows net payroll." data={dashboard?.charts?.payroll_commitments} bars={[{ key: 'gross_payroll', label: 'Gross payroll', color: '#2563eb' }, { key: 'advances', label: 'Advances', color: '#f59e0b' }, { key: 'expenses', label: 'Expenses', color: '#ef4444' }]} line={{ key: 'net_payroll', label: 'Net payroll', color: '#16a34a' }} valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <CombinedOperationsChart title="Operational cash movement" description="Bars show food and worker consumptions; the line shows completed payments." data={dashboard?.charts?.payment_cashflow} bars={[{ key: 'food_supplies', label: 'Food supplies', color: '#f59e0b' }, { key: 'worker_consumptions', label: 'Worker consumptions', color: '#7c3aed' }]} line={{ key: 'completed_payments', label: 'Completed payments', color: '#16a34a' }} valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <LiveTrendChart title="Attendance trend" description="Present workers recorded by date." data={dashboard?.charts?.attendance} dataKey="present" color="#16834a" type="bar" />
            <LiveTrendChart title="Production trend" description="Extraction quantity recorded by date." data={dashboard?.charts?.production} color="#2563eb" type="line" />
            <LiveTrendChart title="Payroll trend" description="Net payroll generated for this management unit by date." data={dashboard?.charts?.payroll} color="#2563eb" type="line" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <LiveTrendChart title="Flexible work trend" description="Actual agreed pay recorded for flexible work by date." data={dashboard?.charts?.flexible_work} color="#7c3aed" type="bar" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <LiveTrendChart title="Expense trend" description="Materials, equipment, and expenses recorded by date." data={dashboard?.charts?.expenses} color="#f59e0b" type="bar" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <LiveTrendChart title="Advance trend" description="Advance requests created by date." data={dashboard?.charts?.advances} color="#16a34a" type="line" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <DistributionChart title="Workflow status" description="Records awaiting approval, ready for payment, paid, and failed." data={dashboard?.charts?.workflow_distribution} />
            <DistributionChart title="Cost distribution" description="Recorded operational amounts by category for your management unit." data={dashboard?.charts?.cost_distribution} valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
          </section>

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
                  { label: 'Workers present', value: dashboard?.counts?.present_today ?? 0 },
                  { label: 'Workers absent', value: dashboard?.counts?.absent_today ?? 0 },
                  { label: 'Hours / overtime', value: `${dashboard?.operations?.attendance_hours ?? 0} / ${dashboard?.operations?.overtime_hours ?? 0}` },
                  { label: 'Minerals extracted', value: dashboard?.operations?.production_quantity ?? 0 },
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
