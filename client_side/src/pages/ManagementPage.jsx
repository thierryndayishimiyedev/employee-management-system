import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  UserCog,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import AppSidebar from './Appsidebar'

const today = new Date().toISOString().split('T')[0]
const currentMonth = new Date().getMonth() + 1
const currentYear = new Date().getFullYear()

const resourceConfig = {
  companies: {
    title: 'Companies',
    subtitle: 'Register and maintain mining companies.',
    icon: Building2,
    endpoint: '/companies',
    idKey: 'company_id',
    createLabel: 'Register Company',
    form: [
      ['company_name', 'Company name', 'text', true],
      ['mining_license_number', 'Mining license', 'text', true],
      ['tin_number', 'TIN number', 'text', true],
      ['phone', 'Phone', 'text', true],
      ['email', 'Email', 'email', true],
      ['province', 'Province', 'text', true],
      ['district', 'District', 'text', true],
      ['sector', 'Sector', 'text', true],
      ['village', 'Village', 'text', true],
      ['registration_date', 'Registration date', 'date', true],
      ['address', 'Address', 'textarea', true],
    ],
    empty: {
      company_name: '',
      mining_license_number: '',
      tin_number: '',
      phone: '',
      email: '',
      province: '',
      district: '',
      sector: '',
      village: '',
      address: '',
      registration_date: today,
    },
    columns: [
      ['Company', (item) => item.company_name],
      ['License', (item) => item.mining_license_number || '-'],
      ['TIN', (item) => item.tin_number || '-'],
      ['Phone', (item) => item.phone || '-'],
      ['Location', (item) => [item.district, item.province].filter(Boolean).join(', ') || '-'],
    ],
  },
  admins: {
    title: 'Admins',
    subtitle: 'Create and maintain Super Admin accounts.',
    icon: Shield,
    endpoint: '/admins',
    idKey: 'admin_id',
    createLabel: 'Create Admin',
    empty: {
      username: '',
      password: '',
      full_name: '',
      phone: '',
      email: '',
    },
    form: [
      ['full_name', 'Full name', 'text', true],
      ['username', 'Username', 'text', true],
      ['password', 'Password', 'password', true, 'createOnly'],
      ['phone', 'Phone', 'text', true],
      ['email', 'Email', 'email', true],
    ],
    columns: [
      ['Name', (item) => item.full_name || '-'],
      ['Username', (item) => item.username || '-'],
      ['Phone', (item) => item.phone || '-'],
      ['Email', (item) => item.email || '-'],
      ['Created', (item) => formatDate(item.created_at)],
    ],
  },
  owners: {
    title: 'Owners',
    subtitle: 'Create, update, and deactivate company owner accounts.',
    icon: UserCog,
    endpoint: '/owners',
    idKey: 'user_id',
    createLabel: 'Create Owner',
    related: ['companies'],
    empty: {
      company_id: '',
      first_name: '',
      last_name: '',
      gender: '',
      date_of_birth: '',
      national_id: '',
      phone: '',
      email: '',
      address: '',
      hire_date: today,
      monthly_salary: '',
      department_name: 'Administration',
      position_name: 'Owner',
      profile_photo: '',
      username: '',
      password: '',
    },
    form: [
      ['company_id', 'Company', 'company', true],
      ['first_name', 'First name', 'text', true],
      ['last_name', 'Last name', 'text', true],
      ['gender', 'Gender', 'gender', true],
      ['date_of_birth', 'Date of birth', 'date', true],
      ['national_id', 'National ID', 'text', true],
      ['phone', 'Phone', 'text', true],
      ['email', 'Email', 'email', true],
      ['address', 'Address', 'text', true],
      ['hire_date', 'Hire date', 'date', true],
      ['monthly_salary', 'Monthly salary', 'number', true],
      ['department_name', 'Department', 'text', true],
      ['position_name', 'Position', 'text', true],
      ['profile_photo', 'Profile photo URL', 'text', false],
      ['username', 'Username', 'text', true],
      ['password', 'Password', 'password', true, 'createOnly'],
    ],
    columns: [
      ['Name', (item) => employeeName(item)],
      ['Username', (item) => item.username || '-'],
      ['Company', (item) => item.employees?.company_id || '-'],
      ['Phone', (item) => item.employees?.phone || '-'],
      ['Status', (item) => (item.is_active === false ? 'Inactive' : 'Active')],
    ],
  },
  managers: staffConfig('Managers', '/managers', 'manager', UserCog),
  accountants: staffConfig('Accountants', '/accountants', 'accountant', Users),
  workers: {
    title: 'Workers',
    subtitle: 'Register, update, and deactivate employee records.',
    icon: Users,
    endpoint: '/workers',
    idKey: 'employee_id',
    createLabel: 'Register Worker',
    related: ['companies', 'positions'],
    empty: {
      company_id: '',
      position_id: '',
      employee_code: '',
      first_name: '',
      last_name: '',
      gender: '',
      date_of_birth: '',
      national_id: '',
      phone: '',
      email: '',
      address: '',
      hire_date: today,
      monthly_salary: '',
      daily_rate: '',
      profile_photo: '',
      username: '',
      password: '',
      role_name: 'WORKER',
    },
    form: [
      ['company_id', 'Company', 'company', true],
      ['position_id', 'Position', 'position', true],
      ['employee_code', 'Employee code', 'text', true],
      ['first_name', 'First name', 'text', true],
      ['last_name', 'Last name', 'text', true],
      ['gender', 'Gender', 'gender', true],
      ['date_of_birth', 'Date of birth', 'date', true],
      ['national_id', 'National ID', 'text', true],
      ['phone', 'Phone', 'text', true],
      ['email', 'Email', 'email', true],
      ['address', 'Address', 'text', true],
      ['hire_date', 'Hire date', 'date', true],
      ['monthly_salary', 'Monthly salary', 'number', true],
      ['daily_rate', 'Daily rate', 'number', true],
      ['profile_photo', 'Profile photo URL', 'text', false],
      ['username', 'Username', 'text', true, 'createOnly'],
      ['password', 'Password', 'password', true, 'createOnly'],
      ['role_name', 'Role name', 'text', true, 'createOnly'],
    ],
    columns: [
      ['Name', (item) => employeeName(item)],
      ['Code', (item) => item.employee_code || '-'],
      ['Position', (item) => item.positions?.position_name || '-'],
      ['Department', (item) => item.departments?.department_name || '-'],
      ['Phone', (item) => item.phone || '-'],
      ['Status', (item) => item.status || 'ACTIVE'],
    ],
  },
  roles: {
    title: 'Roles',
    subtitle: 'View system roles configured in the backend.',
    icon: Shield,
    endpoint: '/roles',
    idKey: 'role_id',
    readonly: true,
    columns: [
      ['Role', (item) => item.role_name],
      ['Description', (item) => item.description || '-'],
      ['Created', (item) => formatDate(item.created_at)],
    ],
  },
  advances: {
    title: 'Salary Advances',
    subtitle: 'Request, review, approve, and remove salary advances.',
    icon: BadgeDollarSign,
    endpoint: '/advances',
    idKey: 'advance_id',
    createLabel: 'Request Advance',
    createRoles: ['ACCOUNTANT'],
    related: ['employees'],
    empty: {
      employee_id: '',
      amount: '',
      reason: '',
    },
    form: [
      ['employee_id', 'Employee', 'employee', true],
      ['amount', 'Amount', 'number', true],
      ['reason', 'Reason', 'textarea', true],
    ],
    columns: [
      ['Employee', (item) => employeeName(item)],
      ['Amount', (item) => `${Number(item.amount || 0).toLocaleString()} RWF`],
      ['Status', (item) => item.status || '-'],
      ['Requested', (item) => formatDate(item.request_date || item.created_at)],
      ['Reason', (item) => item.reason || '-'],
    ],
    actions: [
      {
        label: 'Approve',
        icon: CheckCircle2,
        roles: ['OWNER'],
        show: (item) => item.status !== 'APPROVED',
        run: (item) => api.put(`/advance-approvals/${item.advance_id}/approve`),
      },
    ],
  },
  payments: {
    title: 'Payments',
    subtitle: 'Review payment queue, payment history, and payroll payment reports.',
    icon: CreditCard,
    endpoint: '/payments',
    idKey: 'payment_id',
    readonly: true,
    topActions: [
      {
        label: 'Pay All Employees',
        roles: ['OWNER'],
        confirm: 'Validate and pay every approved payroll employee?',
        run: () => api.post('/payments/pay-all'),
      },
      {
        label: 'Download Report',
        icon: Download,
        roles: ['OWNER'],
        run: downloadPaymentReport,
      },
    ],
    columns: [
      ['Employee', (item) => employeeName(item)],
      ['Amount', (item) => `${Number(item.amount || 0).toLocaleString()} RWF`],
      ['Phone', (item) => item.receiver_phone || item.phone || '-'],
      ['Method', (item) => item.payment_method || '-'],
      ['Status', (item) => statusBadge(item.payment_status || '-')],
      ['Reference', (item) => item.reference_id || item.transaction_reference || '-'],
      ['Failure', (item) => item.failure_reason || '-'],
    ],
  },
  reports: {
    title: 'Reports',
    subtitle: 'Create reports, mark as read, submit, and approve editing.',
    icon: FileText,
    endpoint: '/reports',
    idKey: 'report_id',
    createLabel: 'Create Report',
    createRoles: ['ACCOUNTANT'],
    empty: {
      company_id: '',
      report_date: today,
      title: '',
      report_content: '',
    },
    form: [
      ['company_id', 'Company', 'company', true],
      ['report_date', 'Report date', 'date', true],
      ['title', 'Title', 'text', true],
      ['report_content', 'Content', 'textarea', true],
    ],
    related: ['companies'],
    columns: [
      ['Title', (item) => item.title],
      ['Accountant', (item) => employeeName(item)],
      ['Date', (item) => formatDate(item.report_date)],
      ['Read', (item) => yesNo(item.is_read)],
      ['Submitted', (item) => yesNo(item.is_submitted)],
      ['Edit Approved', (item) => yesNo(item.owner_edit_approved)],
    ],
    actions: [
      {
        label: 'Read',
        icon: CheckCircle2,
        roles: ['OWNER', 'MANAGER'],
        show: (item) => !item.is_read,
        run: (item) => api.put(`/reports/${item.report_id}/read`),
      },
      {
        label: 'Send',
        icon: FileText,
        roles: ['ACCOUNTANT'],
        show: (item) => !item.is_submitted,
        run: (item) => api.put(`/reports/${item.report_id}/send`),
      },
      {
        label: 'Approve Edit',
        icon: Shield,
        roles: ['OWNER'],
        show: (item) => item.is_submitted && !item.owner_edit_approved,
        run: (item) => api.put(`/reports/${item.report_id}/approve-edit`),
      },
    ],
  },
  payrolls: {
    title: 'Payroll',
    subtitle: 'Generate payroll, approve payroll, and remove payroll records.',
    icon: BadgeDollarSign,
    endpoint: '/payroll',
    idKey: 'payroll_id',
    createLabel: 'Generate Payroll',
    createRoles: ['ACCOUNTANT'],
    related: ['employees'],
    empty: {
      employee_id: '',
      payroll_month: currentMonth,
      payroll_year: currentYear,
    },
    form: [
      ['employee_id', 'Employee', 'employee', true],
      ['payroll_month', 'Month', 'number', true],
      ['payroll_year', 'Year', 'number', true],
    ],
    createEndpoint: '/payroll/generate',
    noEdit: true,
    columns: [
      ['Employee', (item) => employeeName(item)],
      ['Period', (item) => `${item.payroll_month}/${item.payroll_year}`],
      ['Days', (item) => item.days_worked ?? 0],
      ['Net Salary', (item) => `${Number(item.net_salary || 0).toLocaleString()} RWF`],
      ['Status', (item) => statusBadge(item.payment_status || 'GENERATED')],
    ],
    actions: [
      {
        label: 'Approve',
        icon: CheckCircle2,
        roles: ['OWNER'],
        show: (item) => ['GENERATED', 'PENDING'].includes(item.payment_status),
        run: (item) => api.put(`/payroll-approvals/${item.payroll_id}/approve`),
      },
      {
        label: 'Reject',
        icon: XCircle,
        roles: ['OWNER'],
        show: (item) => ['GENERATED', 'PENDING'].includes(item.payment_status),
        confirm: 'Reject this generated payroll?',
        run: (item) => api.put(`/payroll-approvals/${item.payroll_id}/reject`),
      },
      {
        label: 'Pay',
        icon: CreditCard,
        roles: ['OWNER'],
        show: (item) => item.payment_status === 'APPROVED',
        confirm: 'Validate and pay this employee payroll?',
        run: (item) => api.post('/payments/pay-all', { payroll_id: item.payroll_id }),
      },
    ],
  },
}

function staffConfig(title, endpoint, label, Icon) {
  return {
    title,
    subtitle: `Create, update, and deactivate ${title.toLowerCase()}.`,
    icon: Icon,
    endpoint,
    idKey: 'user_id',
    createLabel: `Create ${capitalize(label)}`,
    related: ['companies', 'positions'],
    empty: {
      company_id: '',
      position_id: '',
      employee_code: '',
      first_name: '',
      last_name: '',
      gender: '',
      date_of_birth: '',
      national_id: '',
      phone: '',
      email: '',
      address: '',
      hire_date: today,
      monthly_salary: '',
      daily_rate: '',
      profile_photo: '',
      username: '',
      password: '',
    },
    form: [
      ['company_id', 'Company', 'company', true],
      ['position_id', 'Position', 'position', true],
      ['employee_code', 'Employee code', 'text', true],
      ['first_name', 'First name', 'text', true],
      ['last_name', 'Last name', 'text', true],
      ['gender', 'Gender', 'gender', true],
      ['date_of_birth', 'Date of birth', 'date', true],
      ['national_id', 'National ID', 'text', true],
      ['phone', 'Phone', 'text', true],
      ['email', 'Email', 'email', true],
      ['address', 'Address', 'text', true],
      ['hire_date', 'Hire date', 'date', true],
      ['monthly_salary', 'Monthly salary', 'number', true],
      ['daily_rate', 'Daily rate', 'number', true],
      ['profile_photo', 'Profile photo URL', 'text', false],
      ['username', 'Username', 'text', true],
      ['password', 'Password', 'password', true, 'createOnly'],
    ],
    columns: [
      ['Name', (item) => employeeName(item)],
      ['Username', (item) => item.username || '-'],
      ['Role', (item) => item.roles?.role_name || '-'],
      ['Phone', (item) => item.employees?.phone || '-'],
      ['Status', (item) => (item.is_active === false ? 'Inactive' : 'Active')],
    ],
  }
}

export default function ManagementPage({ resource }) {
  const config = resourceConfig[resource]
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [related, setRelated] = useState({ companies: [], positions: [], employees: [] })
  const [form, setForm] = useState(config.empty || {})
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const requests = [api.get(config.endpoint)]
      const relatedKeys = config.related || []
      relatedKeys.forEach((key) => {
        if (key === 'companies') requests.push(api.get('/companies'))
        if (key === 'positions') requests.push(api.get('/positions'))
        if (key === 'employees') requests.push(api.get('/employees'))
      })

      const responses = await Promise.all(requests)
      setItems(asArray(responses[0]))

      const nextRelated = { companies: [], positions: [], employees: [] }
      relatedKeys.forEach((key, index) => {
        nextRelated[key] = asArray(responses[index + 1])
      })
      setRelated(nextRelated)
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to load ${config.title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }, [config.endpoint, config.related, config.title])

  useEffect(() => {
    setForm(config.empty || {})
    setEditing(null)
    loadData()
  }, [config.empty, loadData, resource])

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase()
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(term))
  }, [items, search])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize))
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page])

  useEffect(() => {
    setPage(1)
  }, [search, resource])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const layoutWithSidebar = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'].includes(user?.role_name)
  const Icon = config.icon
  const canCreateResource = !config.readonly && (!config.createRoles || config.createRoles.includes(user?.role_name))

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const beginEdit = (item) => {
    setEditing(item)
    const next = { ...(config.empty || {}) }

    Object.keys(next).forEach((key) => {
      next[key] = item[key] ?? item.employees?.[key] ?? ''
    })

    delete next.password
    setForm(next)
  }

  const resetForm = () => {
    setForm(config.empty || {})
    setEditing(null)
  }

  const payload = () => {
    const next = { ...form }
    ;['monthly_salary', 'daily_rate', 'amount', 'payroll_month', 'payroll_year'].forEach((key) => {
      if (next[key] !== '' && next[key] !== undefined) next[key] = Number(next[key])
    })
    return next
  }

  const saveItem = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.put(`${config.endpoint}/${editing[config.idKey]}`, payload())
        toast.success(`${singular(config.title)} updated`)
      } else {
        await api.post(config.createEndpoint || config.endpoint, payload())
        toast.success(`${singular(config.title)} created`)
      }
      resetForm()
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (item) => {
    if (!window.confirm(`Remove this ${singular(config.title).toLowerCase()}?`)) return
    try {
      await api.delete(`${config.endpoint}/${item[config.idKey]}`)
      toast.success(`${singular(config.title)} removed`)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Remove failed')
    }
  }

  const runAction = async (action, item) => {
    if (action.confirm && !window.confirm(action.confirm)) return
    try {
      const result = await action.run(item)
      toast.success(result?.data?.message || `${action.label} complete`)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || `${action.label} failed`)
    }
  }

  const content = (
    <main className="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
              <Icon size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(config.topActions || [])
              .filter((action) => !action.roles || action.roles.includes(user?.role_name))
              .map((action) => (
              (() => {
                const TopActionIcon = action.icon || CheckCircle2
                return (
              <button
                type="button"
                key={action.label}
                onClick={() => runAction(action)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                <TopActionIcon size={16} />
                {action.label}
              </button>
                )
              })()
            ))}
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </header>

        <section className={`grid gap-4 ${canCreateResource ? 'lg:grid-cols-[420px_1fr]' : ''}`}>
          {canCreateResource && (
            <form onSubmit={saveItem} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {editing ? 'Editing' : 'Create'}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{singular(config.title)} Details</h2>
                </div>
                {editing && (
                  <button type="button" onClick={resetForm} className="rounded-md p-2 text-slate-400 hover:bg-slate-100">
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                {config.form.map(([field, label, type, required, mode]) => {
                  if (editing && mode === 'createOnly') return null
                  return (
                    <Field
                      key={field}
                      label={label}
                      type={type}
                      value={form[field] ?? ''}
                      required={required}
                      related={related}
                      onChange={(value) => setField(field, value)}
                    />
                  )
                })}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                {editing ? <Save size={16} /> : <Plus size={16} />}
                {saving ? 'Saving...' : editing ? 'Save Changes' : config.createLabel}
              </button>
            </form>
          )}

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{config.title} Data</h2>
                <p className="text-sm text-slate-500">{filteredItems.length} records found</p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${config.title.toLowerCase()}...`}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400 md:w-72"
              />
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <p className="p-5 text-sm text-slate-500">Loading...</p>
              ) : filteredItems.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No records available.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      {config.columns.map(([label]) => (
                        <th key={label} className="px-4 py-3 font-semibold">{label}</th>
                      ))}
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedItems.map((item, itemIndex) => (
                      <tr key={rowKey(item, config.idKey, itemIndex)} className="transition hover:bg-slate-50/70">
                        {config.columns.map(([label, render]) => (
                          <td key={label} className="px-4 py-3 text-slate-700">{render(item)}</td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {(config.actions || [])
                              .filter((action) => !action.roles || action.roles.includes(user?.role_name))
                              .filter((action) => !action.show || action.show(item))
                              .map((action) => {
                              const ActionIcon = action.icon
                              return (
                                <button
                                  key={action.label}
                                  type="button"
                                  onClick={() => runAction(action, item)}
                                  title={action.label}
                                  className="rounded-md p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                                >
                                  <ActionIcon size={16} />
                                </button>
                              )
                            })}
                            {canCreateResource && !config.noEdit && (
                              <button
                                type="button"
                                onClick={() => beginEdit(item)}
                                className="rounded-md p-2 text-slate-400 transition hover:bg-cyan-50 hover:text-cyan-700"
                                aria-label="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {canCreateResource && (
                              <button
                                type="button"
                                onClick={() => deleteItem(item)}
                                className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                aria-label="Remove"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && filteredItems.length > pageSize && (
              <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    className="rounded-md border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {layoutWithSidebar && <AppSidebar />}
      {content}
    </div>
  )
}

function Field({ label, type, value, onChange, required, related }) {
  if (type === 'textarea') {
    return (
      <label className="block md:col-span-2 lg:col-span-1">
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
        <textarea
          value={value ?? ''}
          required={required}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
          className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400"
        />
      </label>
    )
  }

  if (type === 'company') return <SelectField label={label} value={value} onChange={onChange} required={required} options={related.companies} idKey="company_id" labelKey="company_name" />
  if (type === 'position') return <SelectField label={label} value={value} onChange={onChange} required={required} options={related.positions} idKey="position_id" labelKey="position_name" />
  if (type === 'employee') return <SelectField label={label} value={value} onChange={onChange} required={required} options={related.employees} idKey="employee_id" labelKey={(item) => `${item.employee_code || ''} ${item.first_name || ''} ${item.last_name || ''}`.trim()} />
  if (type === 'gender') {
    return (
      <SelectBase label={label} value={value} onChange={onChange} required={required}>
        <option value="">Select gender</option>
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
      </SelectBase>
    )
  }

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400"
      />
    </label>
  )
}

function SelectField({ label, value, onChange, required, options, idKey, labelKey }) {
  return (
    <SelectBase label={label} value={value} onChange={onChange} required={required}>
      <option value="">Select {label.toLowerCase()}</option>
      {options.map((item, index) => (
        <option key={`${item[idKey] ?? 'option'}-${index}`} value={item[idKey] ?? ''}>
          {typeof labelKey === 'function' ? labelKey(item) : item[labelKey]}
        </option>
      ))}
    </SelectBase>
  )
}

function SelectBase({ label, value, onChange, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value ?? ''}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-400"
      >
        {children}
      </select>
    </label>
  )
}

function asArray(response) {
  const data = response?.data?.data ?? response?.data ?? response
  return Array.isArray(data) ? data : []
}

function rowKey(item, idKey, index) {
  return `${item?.[idKey] ?? item?.id ?? 'row'}-${index}`
}

function employeeName(item) {
  const employee = item.employees || item.employee || item
  return [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || '-'
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function yesNo(value) {
  return value ? 'Yes' : 'No'
}

async function downloadPaymentReport() {
  const response = await api.get('/payments/report/download', {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'payment-report.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function statusBadge(value) {
  const status = String(value || '-')
  const tone = status.includes('PAID')
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    : status.includes('FAILED')
      ? 'bg-red-50 text-red-700 ring-red-100'
      : status.includes('APPROVED') || status.includes('READY')
        ? 'bg-cyan-50 text-cyan-700 ring-cyan-100'
        : status.includes('PROCESSING')
          ? 'bg-amber-50 text-amber-700 ring-amber-100'
          : 'bg-slate-100 text-slate-700 ring-slate-200'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {status.replaceAll('_', ' ')}
    </span>
  )
}

function singular(value) {
  if (value === 'Companies') return 'Company'
  if (value.endsWith('ies')) return value.slice(0, -3) + 'y'
  if (value.endsWith('s')) return value.slice(0, -1)
  return value
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
