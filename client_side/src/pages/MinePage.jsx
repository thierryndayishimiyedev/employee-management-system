import { useEffect, useMemo, useState } from 'react'
import { Building2, Mountain, RefreshCw, Users, Wallet } from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import AppSidebar from './Appsidebar'

function formatRWF(amount) {
  return new Intl.NumberFormat('en-RW', {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0))
}

function employeeName(employee) {
  return [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || 'Unknown employee'
}

export default function MinesPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [employees, setEmployees] = useState([])
  const [production, setProduction] = useState([])
  const [loading, setLoading] = useState(true)

  const companyName = user?.employees?.companies?.company_name || user?.company_name || 'Current company'

  const loadOperations = async () => {
    setLoading(true)

    try {
      const [dashboardRes, employeesRes, productionRes] = await Promise.allSettled([
        api.get('/dashboard/owner'),
        api.get('/employees'),
        api.get('/production'),
      ])

      setDashboard(dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data?.data || null : null)
      setEmployees(employeesRes.status === 'fulfilled' ? employeesRes.value?.data?.data || [] : [])
      setProduction(productionRes.status === 'fulfilled' ? productionRes.value?.data?.data || [] : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOperations()
  }, [])

  const productionByMineral = useMemo(() => {
    const totals = new Map()

    production.forEach((record) => {
      const mineral = record.mineral_type || 'Unspecified'
      totals.set(mineral, (totals.get(mineral) || 0) + Number(record.quantity || 0))
    })

    return Array.from(totals.entries()).map(([mineral, quantity]) => ({
      mineral,
      quantity,
    }))
  }, [production])

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Operations overview</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{companyName}</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  This page uses the existing backend company, employee, payroll, and production data. A separate mine-site
                  CRUD screen will need a dedicated mines table and API.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadOperations}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </header>

          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Loading operations...
            </div>
          ) : (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Employees"
                  value={dashboard?.total_employees ?? employees.length}
                  detail="Workers available for attendance and production"
                  icon={Users}
                />
                <StatCard
                  label="Attendance Today"
                  value={dashboard?.today_attendance ?? 0}
                  detail="Records captured today"
                  icon={Building2}
                />
                <StatCard
                  label="Production"
                  value={`${Number(dashboard?.total_production || 0).toLocaleString()} kg`}
                  detail={`${production.length} production records`}
                  icon={Mountain}
                />
                <StatCard
                  label="Payroll Due"
                  value={formatRWF(dashboard?.total_payroll)}
                  detail={`${dashboard?.pending_advances ?? 0} pending advances`}
                  icon={Wallet}
                />
              </section>

              <section className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-5">
                    <h2 className="text-lg font-semibold text-slate-900">Recent Production</h2>
                    <p className="text-sm text-slate-500">Latest records submitted by employees.</p>
                  </div>
                  <div className="overflow-x-auto">
                    {production.length === 0 ? (
                      <p className="p-5 text-sm text-slate-500">No production records available.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="px-4 py-3">Employee</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Mineral</th>
                            <th className="px-4 py-3">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {production.slice(0, 8).map((record, index) => (
                            <tr key={`${record.production_id || 'production'}-${index}`}>
                              <td className="px-4 py-3 text-slate-700">{employeeName(record.employees)}</td>
                              <td className="px-4 py-3 text-slate-700">{record.production_date || '-'}</td>
                              <td className="px-4 py-3 text-slate-700">{record.mineral_type || '-'}</td>
                              <td className="px-4 py-3 font-semibold text-slate-900">
                                {Number(record.quantity || 0).toLocaleString()} {record.unit || ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-5">
                    <h2 className="text-lg font-semibold text-slate-900">Production By Mineral</h2>
                    <p className="text-sm text-slate-500">Totals grouped from production records.</p>
                  </div>
                  <div className="space-y-3 p-5">
                    {productionByMineral.length === 0 ? (
                      <p className="text-sm text-slate-500">No mineral totals available.</p>
                    ) : (
                      productionByMineral.map((item) => (
                        <div key={item.mineral} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-medium text-slate-700">{item.mineral}</span>
                            <span className="text-sm font-semibold text-amber-700">
                              {item.quantity.toLocaleString()} kg
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </article>
  )
}
