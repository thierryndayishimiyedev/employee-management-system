import { useEffect, useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Mountain,
  Users,
  Wallet,
} from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import { DashboardHeader, DashboardShell, LiveTrendChart, MetricList, QuickActionGrid, SectionCard, StatGrid } from '../components/DashboardKit'

const quickActions = [
  { to: '/attendance', label: 'Record attendance', icon: CalendarCheck },
  { to: '/workers', label: 'Register worker', icon: Users },
  { to: '/production', label: 'Record production', icon: Mountain },
  { to: '/reports', label: 'Create daily report', icon: FileText },
  { to: '/payroll', label: 'Generate payroll', icon: Wallet },
  { to: '/expenses', label: 'Record expense or material', icon: BadgeDollarSign },
]

export default function AccountantDashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [payrolls, setPayrolls] = useState([])
  const [attendanceToday, setAttendanceToday] = useState([])
  const [production, setProduction] = useState([])
  const [employees, setEmployees] = useState([])
  const [advances, setAdvances] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [dashboardResult, payrollResult, attendanceResult, productionResult, employeesResult, advancesResult, reportsResult] = await Promise.allSettled([
        api.get('/dashboard/accountant'),
        api.get('/payroll'),
        api.get('/attendance/today'),
        api.get('/production'),
        api.get('/employees'),
        api.get('/advances'),
        api.get('/reports'),
      ])

      if (dashboardResult.status === 'fulfilled') {
        setDashboard(dashboardResult.value?.data?.data || dashboardResult.value?.data || null)
      }
      if (payrollResult.status === 'fulfilled') setPayrolls(asArray(payrollResult.value))
      if (attendanceResult.status === 'fulfilled') setAttendanceToday(asArray(attendanceResult.value))
      if (productionResult.status === 'fulfilled') setProduction(asArray(productionResult.value))
      if (employeesResult.status === 'fulfilled') setEmployees(asArray(employeesResult.value))
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
  const pendingAdvances = useMemo(
    () => advances.filter((item) => item.status !== 'APPROVED').length,
    [advances]
  )
  const submittedReports = useMemo(
    () => reports.filter((item) => item.is_submitted).length,
    [reports]
  )

  const stats = [
    {
      label: "Today's attendance",
      value: attendanceToday.length,
      icon: CalendarCheck,
      tone: 'emerald',
      detail: 'Attendance records captured today',
    },
    {
      label: "Today's production",
      value: production.length,
      icon: Mountain,
      tone: 'cyan',
      detail: 'Production records available today',
    },
    {
      label: 'Pending payrolls',
      value: dashboard?.counts?.pending_approvals ?? pendingPayrolls,
      icon: Wallet,
      tone: 'amber',
      detail: 'Payroll records awaiting approval or payment',
    },
    {
      label: 'Pending advances',
      value: Number(dashboard?.financial?.advances_pending || pendingAdvances),
      icon: BadgeDollarSign,
      tone: 'cyan',
      detail: 'Advance requests still open',
    },
    {
      label: 'Expense value awaiting review',
      value: Number(dashboard?.financial?.expenses_pending || 0),
      icon: BadgeDollarSign,
      tone: 'amber',
      detail: 'Materials and expenses recorded for your manager',
    },
    {
      label: 'Submitted reports',
      value: submittedReports,
      icon: FileText,
      tone: 'slate',
      detail: `${reports.length - submittedReports} draft reports`,
    },
    {
      label: 'Workers summary',
      value: employees.length,
      icon: Users,
      tone: 'slate',
      detail: 'Workers available for daily records',
    },
  ]

  if (!user) return null

  return (
    <DashboardShell>
      <DashboardHeader
        eyebrow="Accountant dashboard"
        title={`Welcome back, ${accountantName.split(' ')[0]}`}
        description="Record attendance and production, prepare daily reports, request advances, and generate payroll for owner approval."
        loading={loading}
        onRefresh={loadDashboard}
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading accountant dashboard...
        </div>
      ) : (
        <>
          <StatGrid stats={stats} />

          <section className="grid gap-4 xl:grid-cols-2">
            <LiveTrendChart title="Attendance trend" description="Present workers recorded by date for your management unit." data={dashboard?.charts?.attendance} dataKey="present" color="#16834a" type="bar" />
            <LiveTrendChart title="Expense trend" description="Materials and operational expenses recorded by date." data={dashboard?.charts?.expenses} color="#2563eb" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <SectionCard eyebrow="Daily workflows" title="Attendance, production, and reports" className="lg:col-span-2">
              <QuickActionGrid actions={quickActions} />
            </SectionCard>

            <SectionCard
              eyebrow="Finance status"
              title="Ready for daily close"
              action={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            >
              <MetricList
                metrics={[
                  { label: 'Attendance today', value: attendanceToday.length },
                  { label: 'Minerals extracted', value: dashboard?.operations?.production_quantity ?? 0 },
                  { label: 'Payroll records', value: payrolls.length },
                  { label: 'Materials recorded', value: dashboard?.operations?.material_purchases ?? 0 },
                  { label: 'Expenses paid', value: `${Number(dashboard?.financial?.expenses_paid || 0).toLocaleString()} RWF` },
                  { label: 'Reports awaiting review', value: dashboard?.counts?.reports_waiting ?? 0 },
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
