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
import { useLanguage } from '../context/LanguageContext'
import { CombinedOperationsChart, DashboardHeader, DashboardShell, DistributionChart, LiveTrendChart, MetricList, QuickActionGrid, SectionCard, StatGrid } from '../components/DashboardKit'
import PeriodOperationsCards from '../components/PeriodOperationsCards'

export default function AccountantDashboardPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
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
    : user?.username || t('dashboard.accountant')
  const quickActions = [{ to: '/attendance', label: t('dashboard.recordAttendance'), icon: CalendarCheck }, { to: '/workers', label: t('dashboard.registerWorker'), icon: Users }, { to: '/production', label: t('dashboard.recordProduction'), icon: Mountain }, { to: '/reports', label: t('dashboard.createDailyReport'), icon: FileText }, { to: '/payroll', label: t('dashboard.generatePayroll'), icon: Wallet }, { to: '/expenses', label: t('dashboard.recordExpense'), icon: BadgeDollarSign }]

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
      label: t('dashboard.todayAttendance'),
      value: attendanceToday.length,
      icon: CalendarCheck,
      tone: 'emerald',
      detail: t('dashboard.attendanceCaptured'),
    },
    {
      label: t('dashboard.todayProduction'),
      value: production.length,
      icon: Mountain,
      tone: 'cyan',
      detail: t('dashboard.productionAvailable'),
    },
    {
      label: t('dashboard.pendingPayrolls'),
      value: dashboard?.counts?.pending_approvals ?? pendingPayrolls,
      icon: Wallet,
      tone: 'amber',
      detail: t('dashboard.payrollAwaiting'),
    },
    {
      label: t('dashboard.pendingAdvances'),
      value: Number(dashboard?.financial?.advances_pending || pendingAdvances),
      icon: BadgeDollarSign,
      tone: 'cyan',
      detail: t('dashboard.advanceOpen'),
    },
    {
      label: t('dashboard.expensesAwaitingReview'),
      value: Number(dashboard?.financial?.expenses_pending || 0),
      icon: BadgeDollarSign,
      tone: 'amber',
      detail: t('dashboard.expensesRecorded'),
    },
    {
      label: t('dashboard.submittedReports'),
      value: submittedReports,
      icon: FileText,
      tone: 'slate',
      detail: t('dashboard.drafts', { count: reports.length - submittedReports }),
    },
    {
      label: t('dashboard.workersSummary'),
      value: employees.length,
      icon: Users,
      tone: 'slate',
      detail: t('dashboard.workersAvailable'),
    },
  ]

  if (!user) return null

  return (
    <DashboardShell>
      <DashboardHeader
        eyebrow={t('dashboard.accountant')}
        title={t('dashboard.welcome', { name: accountantName.split(' ')[0] })}
        description={t('dashboard.accountantDescription')}
        loading={loading}
        onRefresh={loadDashboard}
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          {t('dashboard.loadingAccountant')}
        </div>
      ) : (
        <>
          <StatGrid stats={stats} />
          <PeriodOperationsCards periods={dashboard?.periods} title={t('dashboard.yourManagerUnit')} />

          <section className="grid gap-4 xl:grid-cols-3">
            <CombinedOperationsChart title={t('dashboard.attendanceShiftHours')} description={t('dashboard.attendanceShiftHoursDescription')} data={dashboard?.charts?.attendance} bars={[{ key: 'present', label: t('status.present'), color: '#2563eb' }, { key: 'absent', label: t('status.absent'), color: '#ef4444' }]} line={{ key: 'hours', label: t('dashboard.hoursWorked'), color: '#f59e0b' }} />
            <CombinedOperationsChart title={t('dashboard.payrollCommitments')} description={t('dashboard.payrollCommitmentsDescription')} data={dashboard?.charts?.payroll_commitments} bars={[{ key: 'gross_payroll', label: t('payroll.gross'), color: '#2563eb' }, { key: 'advances', label: t('navigation.advances'), color: '#f59e0b' }, { key: 'expenses', label: t('navigation.expenses'), color: '#ef4444' }]} line={{ key: 'net_payroll', label: t('payroll.net'), color: '#16a34a' }} valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <CombinedOperationsChart title={t('dashboard.cashMovement')} description={t('dashboard.cashMovementDescription')} data={dashboard?.charts?.payment_cashflow} bars={[{ key: 'food_supplies', label: t('dashboard.foodSupplies'), color: '#f59e0b' }, { key: 'worker_consumptions', label: t('dashboard.workerConsumptions'), color: '#7c3aed' }]} line={{ key: 'completed_payments', label: t('dashboard.completedPayments'), color: '#16a34a' }} valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <LiveTrendChart title={t('dashboard.attendanceTrend')} description={t('dashboard.attendanceTrendDescription')} data={dashboard?.charts?.attendance} dataKey="present" color="#16834a" type="bar" />
            <LiveTrendChart title={t('dashboard.expenseTrend')} description={t('dashboard.expenseTrendDescription')} data={dashboard?.charts?.expenses} color="#2563eb" type="line" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <LiveTrendChart title={t('dashboard.payrollTrend')} description={t('dashboard.payrollTrendDescription')} data={dashboard?.charts?.payroll} color="#16a34a" type="line" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <LiveTrendChart title={t('dashboard.flexibleTrend')} description={t('dashboard.flexibleTrendDescription')} data={dashboard?.charts?.flexible_work} color="#7c3aed" type="bar" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <LiveTrendChart title={t('dashboard.advanceTrend')} description={t('dashboard.advanceTrendDescription')} data={dashboard?.charts?.advances} color="#f59e0b" type="bar" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <LiveTrendChart title={t('dashboard.paymentTrend')} description={t('dashboard.paymentTrendDescription')} data={dashboard?.charts?.payments} color="#2563eb" type="line" valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
            <DistributionChart title={t('dashboard.workflowStatus')} description={t('dashboard.workflowStatusDescription')} data={dashboard?.charts?.workflow_distribution} />
            <DistributionChart title={t('dashboard.costDistribution')} description={t('dashboard.costDistributionDescription')} data={dashboard?.charts?.cost_distribution} valueFormatter={(value) => `${Number(value || 0).toLocaleString()} RWF`} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <SectionCard eyebrow={t('dashboard.dailyWorkflows')} title={t('dashboard.accountantFocus')} className="lg:col-span-2">
              <QuickActionGrid actions={quickActions} />
            </SectionCard>

            <SectionCard
              eyebrow={t('dashboard.financeStatus')}
              title={t('dashboard.dailyClose')}
              action={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            >
              <MetricList
                metrics={[
                  { label: t('dashboard.attendanceToday'), value: attendanceToday.length },
                  { label: t('dashboard.mineralsExtracted'), value: dashboard?.operations?.production_quantity ?? 0 },
                  { label: t('dashboard.payrollRecords'), value: payrolls.length },
                  { label: t('dashboard.materialsRecorded'), value: dashboard?.operations?.material_purchases ?? 0 },
                  { label: t('dashboard.expensesPaid'), value: `${Number(dashboard?.financial?.expenses_paid || 0).toLocaleString()} RWF` },
                  { label: t('dashboard.reportsReview'), value: dashboard?.counts?.reports_waiting ?? 0 },
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
