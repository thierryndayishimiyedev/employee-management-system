import { useMemo, useState } from 'react'
import { Download, FileText, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import AppSidebar from './Appsidebar'

const reports = [
  { type: 'attendance', title: 'Attendance', roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'] },
  { type: 'production', title: 'Production', roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'] },
  { type: 'reports', title: 'Daily Reports', roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'] },
  { type: 'payroll', title: 'Payroll', roles: ['SUPER_ADMIN', 'OWNER', 'ACCOUNTANT'] },
  { type: 'payments', title: 'Payments', roles: ['SUPER_ADMIN', 'OWNER'] },
  { type: 'advances', title: 'Advances', roles: ['SUPER_ADMIN', 'OWNER', 'ACCOUNTANT'] },
  { type: 'employees', title: 'Employees', roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'] },
  { type: 'departments', title: 'Departments', roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'] },
  { type: 'positions', title: 'Positions', roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'] },
]

export default function DownloadCenterPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [downloading, setDownloading] = useState('')

  const visibleReports = useMemo(() => {
    const term = search.toLowerCase()
    return reports
      .filter((item) => item.roles.includes(user?.role_name))
      .filter((item) => item.title.toLowerCase().includes(term))
  }, [search, user?.role_name])

  const downloadReport = async (type) => {
    setDownloading(type)
    try {
      const params = period === 'custom'
        ? { period, start_date: startDate, end_date: endDate }
        : { period }
      const response = await api.get(`/downloads/${type}/pdf`, {
        params,
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}-report.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Download failed')
    } finally {
      setDownloading('')
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reports</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Download Center</h1>
            <p className="mt-1 text-sm text-slate-500">Download company-scoped PDF reports generated from live database records.</p>
          </header>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_160px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reports..."
                  className="w-full rounded-md border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-400"
                />
              </label>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <input
                type="date"
                value={startDate}
                disabled={period !== 'custom'}
                onChange={(event) => setStartDate(event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50"
              />
              <input
                type="date"
                value={endDate}
                disabled={period !== 'custom'}
                onChange={(event) => setEndDate(event.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none disabled:bg-slate-50"
              />
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {visibleReports.map((report) => (
              <article key={report.type} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                    <FileText size={20} />
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadReport(report.type)}
                    disabled={downloading === report.type}
                    className="rounded-md p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                    title="Download PDF"
                  >
                    <Download size={18} />
                  </button>
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">{report.title}</h2>
                <p className="mt-1 text-sm text-slate-500">Professional PDF export with summary and table data.</p>
              </article>
            ))}
          </section>
        </div>
      </main>
    </div>
  )
}
