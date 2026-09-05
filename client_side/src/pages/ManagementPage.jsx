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
import { useOwnerManagerScope } from '../context/OwnerManagerScope'
import OwnerManagerSelector from '../components/OwnerManagerSelector'

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
    subtitle: 'Register workers with only the operational and benefit details required.',
    icon: Users,
    endpoint: '/workers',
    idKey: 'employee_id',
    createLabel: 'Register Worker',
    related: ['companies', 'positions', 'managers'],
    empty: {
      company_id: '',
      manager_user_id: '',
      position_id: '',
      first_name: '',
      last_name: '',
      gender: '',
      national_id: '',
      phone: '',
      address: '',
      hire_date: today,
      daily_rate: '',
      payment_type: 'FIXED_DAILY',
      ejo_heza: false,
      mutuelle_de_sante: false,
    },
    form: [
      ['company_id', 'Company', 'company', true],
      ['manager_user_id', 'Manager', 'manager', false],
      ['position_id', 'Position', 'position', true],
      ['first_name', 'First name', 'text', true],
      ['last_name', 'Last name', 'text', true],
      ['gender', 'Gender', 'gender', true],
      ['national_id', 'National ID', 'text', true],
      ['phone', 'MTN phone number (078… or 079…)', 'text', true],
      ['address', 'Address', 'text', true],
      ['hire_date', 'Hire date', 'date', true],
      ['payment_type', 'Payment type', 'paymenttype', true],
      ['daily_rate', 'Fixed daily payment (RWF)', 'number', false],
      ['ejo_heza', 'Ejo Heza', 'yesno', true],
      ['mutuelle_de_sante', 'Mutuelle de Santé', 'yesno', true],
    ],
    columns: [
      ['Name', (item) => employeeName(item)],
      ['Code', (item) => item.employee_code || '-'],
      ['Position', (item) => item.positions?.position_name || '-'],
      ['Phone', (item) => item.phone || '-'],
      ['Ejo Heza', (item) => item.ejo_heza ? 'Yes' : 'No'],
      ['Mutuelle', (item) => item.mutuelle_de_sante ? 'Yes' : 'No'],
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
      ['Payment', (item) => statusBadge(item.payment_status || 'UNPAID')],
      ['Paid', (item) => formatDate(item.payment_date)],
      ['Balance', (item) => `${Number(item.remaining_balance || 0).toLocaleString()} RWF`],
      ['Deducted', (item) => `${Number(item.amount_deducted || 0).toLocaleString()} RWF`],
      ['Requested', (item) => formatDate(item.request_date || item.created_at)],
      ['Reason', (item) => item.reason || '-'],
    ],
    actions: [
      {
        label: 'Manager Approve',
        icon: CheckCircle2,
        roles: ['MANAGER'],
        show: (item) => ['PENDING_MANAGER', 'CHANGES_REQUESTED'].includes(item.status),
        run: (item) => api.put(`/advance-approvals/${item.advance_id}/approve`),
      },
      {
        label: 'Request Changes',
        icon: XCircle,
        roles: ['MANAGER'],
        show: (item) => item.status === 'PENDING_MANAGER',
        confirm: 'Return this advance request to the accountant?',
        run: (item) => api.put(`/advance-approvals/${item.advance_id}/reject`, { reason: 'Changes requested' }),
      },
      {
        label: 'Final Approve',
        icon: CheckCircle2,
        roles: ['OWNER'],
        show: (item) => item.status === 'PENDING_OWNER',
        run: (item) => api.put(`/advance-approvals/${item.advance_id}/approve`),
      },
      {
        label: 'Request Changes',
        icon: XCircle,
        roles: ['OWNER'],
        show: (item) => item.status === 'PENDING_OWNER',
        confirm: 'Return this advance request to the accountant?',
        run: (item) => api.put(`/advance-approvals/${item.advance_id}/reject`, { reason: 'Changes requested' }),
      },
      {
        label: 'Pay Advance',
        icon: CreditCard,
        roles: ['OWNER'],
        show: (item) => item.status === 'OWNER_APPROVED' && item.payment_status !== 'PAID',
        confirm: 'Process this INTERNAL/TEST advance payment?',
        run: (item) => api.post(`/advance-approvals/${item.advance_id}/pay`),
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
    subtitle: 'Create activity-based reports and move them through manager and owner approval.',
    icon: FileText,
    endpoint: '/reports',
    idKey: 'report_id',
    createLabel: 'Generate Report from Activities',
    createRoles: ['ACCOUNTANT'],
    editShow: (item) => ['DRAFT', 'CHANGES_REQUESTED'].includes(item.status || 'DRAFT'),
    empty: {
      company_id: '',
      report_date: today,
      report_type: 'DAILY',
      title: '',
      report_content: '',
    },
    form: [
      ['company_id', 'Company', 'company', true],
      ['report_type', 'Report period', 'reporttype', true],
      ['report_date', 'Date inside the report period', 'date', true],
      ['title', 'Report title (optional correction)', 'text', false, 'editOnly'],
      ['report_content', 'Correction note', 'textarea', false, 'editOnly'],
    ],
    related: ['companies'],
    columns: [
      ['Period', (item) => item.report_type && item.period_start && item.period_end ? `${item.report_type}: ${item.period_start} to ${item.period_end}` : reportSummary(item).report_period ? `${reportSummary(item).report_period.type}: ${reportSummary(item).report_period.start} to ${reportSummary(item).report_period.end}` : item.report_date],
      ['Accountant', (item) => employeeName(item)],
      ['Attendance', (item) => `${item.attendance_summary?.present || 0} present / ${item.attendance_summary?.hours || 0} hrs`],
      ['Production result', (item) => `${Number(item.production_summary?.net_result || 0).toLocaleString()} RWF`],
      ['Status', (item) => statusBadge(item.status || 'DRAFT')],
      ['Manager review', (item) => formatDate(item.manager_reviewed_at)],
      ['Owner review', (item) => formatDate(item.owner_reviewed_at)],
    ],
    actions: [
      {
        label: 'View full report table',
        icon: FileText,
        roles: ['ACCOUNTANT', 'MANAGER', 'OWNER'],
        detail: true,
      },
      {
        label: 'Manager Approve',
        icon: CheckCircle2,
        roles: ['MANAGER'],
        show: (item) => item.status === 'PENDING_MANAGER',
        run: (item) => api.put(`/reports/${item.report_id}/review`, { decision: 'approve' }),
      },
      {
        label: 'Refresh and send report',
        icon: FileText,
        roles: ['ACCOUNTANT'],
        show: (item) => ['DRAFT', 'CHANGES_REQUESTED'].includes(item.status || 'DRAFT'),
        run: (item) => api.put(`/reports/${item.report_id}/send`),
      },
      {
        label: 'Request Changes',
        icon: XCircle,
        roles: ['MANAGER'],
        show: (item) => item.status === 'PENDING_MANAGER',
        confirm: 'Request corrections from the accountant?',
        run: (item) => api.put(`/reports/${item.report_id}/review`, { decision: 'reject', comments: 'Changes requested' }),
      },
      {
        label: 'Final Approve',
        icon: CheckCircle2,
        roles: ['OWNER'],
        show: (item) => item.status === 'PENDING_OWNER',
        run: (item) => api.put(`/reports/${item.report_id}/review`, { decision: 'approve' }),
      },
      {
        label: 'Request Changes',
        icon: XCircle,
        roles: ['OWNER'],
        show: (item) => item.status === 'PENDING_OWNER',
        confirm: 'Return this report to the accountant for correction?',
        run: (item) => api.put(`/reports/${item.report_id}/review`, { decision: 'reject', comments: 'Changes requested' }),
      },
    ],
  },
  payrolls: {
    title: 'Payroll',
    subtitle: 'Generate attendance-based payroll, then submit it for manager and owner approval.',
    icon: BadgeDollarSign,
    endpoint: '/payroll',
    idKey: 'payroll_id',
    createLabel: 'Calculate Biweekly Payroll',
    createRoles: ['ACCOUNTANT'],
    related: ['employees'],
    empty: {
      employee_id: '',
      payroll_frequency: 'BIWEEKLY',
      payroll_period_start: '',
      payroll_period_end: '',
      payroll_month: currentMonth,
      payroll_year: currentYear,
    },
    form: [
      ['employee_id', 'Employee', 'employee', true],
      ['payroll_frequency', 'Frequency', 'frequency', true],
      ['payroll_period_start', 'Period start', 'date', true],
      ['payroll_period_end', 'Period end (14th day)', 'date', true],
      ['payroll_month', 'Month (monthly only)', 'number', true],
      ['payroll_year', 'Year (monthly only)', 'number', true],
    ],
    createEndpoint: '/payroll/generate',
    noEdit: true,
    columns: [
      ['Employee', (item) => employeeName(item)],
      ['Period', (item) => item.payroll_frequency === 'BIWEEKLY'
        ? `${item.payroll_period_start} to ${item.payroll_period_end}`
        : `${item.payroll_month}/${item.payroll_year}`],
      ['Days', (item) => <span className="font-semibold text-blue-700">{item.days_worked ?? 0} worked</span>],
      ['Daily rate', (item) => <span className="font-semibold text-blue-700">{Number(item.employees?.daily_rate || 0).toLocaleString()} RWF</span>],
      ['Worked value', (item) => <span className="rounded bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">+{Number(item.basic_salary || 0).toLocaleString()} RWF</span>],
      ['Advance', (item) => <span className="rounded bg-red-50 px-2 py-1 font-semibold text-red-700">−{Number(item.advance_deduction || 0).toLocaleString()} RWF</span>],
      ['Worker items', (item) => <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700">−{Number(item.consumption_deduction || 0).toLocaleString()} RWF</span>],
      ['Net Salary', (item) => <span className="rounded bg-cyan-50 px-2 py-1 font-bold text-cyan-800">={Number(item.net_salary || 0).toLocaleString()} RWF</span>],
      ['Approval', (item) => statusBadge(item.approval_status || 'GENERATED')],
      ['Payment', (item) => statusBadge(item.payment_status || 'GENERATED')],
    ],
    actions: [
      {
        label: 'Approve',
        icon: CheckCircle2,
        roles: ['MANAGER'],
        show: (item) => ['GENERATED', 'CHANGES_REQUESTED'].includes(item.approval_status || 'GENERATED'),
        run: (item) => api.put(`/payroll-approvals/${item.payroll_id}/approve`),
      },
      {
        label: 'Reject',
        icon: XCircle,
        roles: ['MANAGER'],
        show: (item) => ['GENERATED', 'CHANGES_REQUESTED'].includes(item.approval_status || 'GENERATED'),
        confirm: 'Reject this generated payroll?',
        run: (item) => api.put(`/payroll-approvals/${item.payroll_id}/reject`),
      },
      {
        label: 'Final Approve',
        icon: CheckCircle2,
        roles: ['OWNER'],
        show: (item) => item.approval_status === 'MANAGER_APPROVED',
        run: (item) => api.put(`/payroll-approvals/${item.payroll_id}/approve`),
      },
      {
        label: 'Request Changes',
        icon: XCircle,
        roles: ['OWNER'],
        show: (item) => item.approval_status === 'MANAGER_APPROVED',
        confirm: 'Return this payroll to the accountant for correction?',
        run: (item) => api.put(`/payroll-approvals/${item.payroll_id}/reject`),
      },
      {
        label: 'Pay',
        icon: CreditCard,
        roles: ['OWNER'],
        show: (item) => item.approval_status === 'OWNER_APPROVED' && item.payment_status === 'APPROVED',
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
    createLabel: label === 'accountant' ? 'Create Accountant Account' : 'Create Manager Account',
    related: ['companies', 'positions', 'managers'],
    empty: {
      company_id: '',
      manager_user_id: '',
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
      ['manager_user_id', label === 'accountant' ? 'Assigned manager (one accountant only)' : 'Manager', 'manager', label === 'accountant'],
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
  const { managerId, managers } = useOwnerManagerScope()
  const [items, setItems] = useState([])
  const [related, setRelated] = useState({ companies: [], positions: [], employees: [], managers: [] })

  const allowedCompanyIds = useMemo(() => {
    const ids = Array.isArray(user?.company_ids) ? [...user.company_ids] : []
    if (user?.company_id && !ids.includes(user.company_id)) {
      ids.push(user.company_id)
    }
    return ids.map(String)
  }, [user?.company_id, user?.company_ids])

  const isAllowedCompany = useCallback((company) => {
    if (!company || user?.role_name === 'SUPER_ADMIN') return true
    return !allowedCompanyIds.length || allowedCompanyIds.includes(String(company.company_id))
  }, [allowedCompanyIds, user?.role_name])
  const [form, setForm] = useState(config.empty || {})
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [advanceEligibility, setAdvanceEligibility] = useState(null)
  const [search, setSearch] = useState('')
  const [reportDetail, setReportDetail] = useState(null)
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
        if (key === 'managers') requests.push(api.get('/managers'))
      })

      const responses = await Promise.all(requests)
      setItems(asArray(responses[0]))

      const nextRelated = { companies: [], positions: [], employees: [], managers: [] }
      relatedKeys.forEach((key, index) => {
        const list = asArray(responses[index + 1])
        nextRelated[key] = key === 'companies'
          ? list.filter(isAllowedCompany)
          : list
      })
      setRelated(nextRelated)
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to load ${config.title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }, [config.endpoint, config.related, config.title, isAllowedCompany])

  useEffect(() => {
    setForm(config.empty || {})
    setEditing(null)
    loadData()
  }, [config.empty, loadData, resource])

  useEffect(() => {
    if (!user || user.role_name === 'SUPER_ADMIN') return
    const formFields = config.form || []
    if (!formFields.some(([field]) => field === 'company_id')) return
    const allowedCompanies = related.companies
    if (allowedCompanies.length === 1 && !editing && !form.company_id) {
      setForm((current) => ({ ...current, company_id: String(allowedCompanies[0].company_id) }))
    }
  }, [user, config.form, related.companies, editing, form.company_id, resource])

  useEffect(() => {
    if (config.endpoint !== '/advances' || !form.employee_id || editing) {
      setAdvanceEligibility(null)
      return
    }
    let active = true
    api.get(`/advances/eligibility/${form.employee_id}`)
      .then((response) => { if (active) setAdvanceEligibility(response.data?.data || null) })
      .catch((error) => {
        if (active) setAdvanceEligibility({ error: error.response?.data?.message || 'Unable to calculate advance eligibility.' })
      })
    return () => { active = false }
  }, [config.endpoint, editing, form.employee_id])

  const managerScopedItems = useMemo(() => {
    if (user?.role_name !== 'OWNER' || !managerId) return items
    return items.filter((item) => (item.manager_user_id || item.employees?.manager_user_id) === managerId)
  }, [items, managerId, user?.role_name])

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase()
    return managerScopedItems.filter((item) => JSON.stringify(item).toLowerCase().includes(term))
  }, [managerScopedItems, search])

  const managerScopeName = managerId ? managers.find((manager) => manager.user_id === managerId)?.name || 'Selected manager' : 'All managers'
  const scopedAmount = useMemo(() => managerScopedItems.reduce((total, item) => total + Number(item.net_salary ?? item.amount ?? item.total_amount ?? 0), 0), [managerScopedItems])

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
    // Company scope comes from the JWT for operational roles.  Do not send a
    // selectable company ID from Manager/Accountant worker onboarding.
    if (['MANAGER', 'ACCOUNTANT'].includes(user?.role_name) && config.endpoint === '/workers') {
      delete next.company_id
    }
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
    if (action.detail) {
      setReportDetail(item)
      return
    }
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
            <OwnerManagerSelector compact />
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

        {user?.role_name === 'OWNER' && ['workers', 'payrolls', 'advances', 'payments', 'reports', 'accountants'].includes(resource) && (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm">
            <p className="text-slate-700"><span className="font-semibold">Manager scope:</span> {managerScopeName}</p>
            <p className="text-slate-700"><span className="font-semibold">Records:</span> {managerScopedItems.length}{['payrolls', 'advances', 'payments'].includes(resource) ? ` · Total: ${Number(scopedAmount).toLocaleString()} RWF` : ''}</p>
          </section>
        )}

        {resource === 'payments' && user?.role_name === 'OWNER' && <PaymentBatches managerId={managerId} onPaid={loadData} />}

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
                  if (!editing && mode === 'editOnly') return null
                  if (field === 'company_id' && config.endpoint === '/workers' && ['MANAGER', 'ACCOUNTANT'].includes(user?.role_name)) return null
                  if (config.endpoint === '/payroll' && form.payroll_frequency === 'BIWEEKLY' && ['payroll_month', 'payroll_year'].includes(field)) return null
                  if (config.endpoint === '/payroll' && form.payroll_frequency !== 'BIWEEKLY' && ['payroll_period_start', 'payroll_period_end'].includes(field)) return null
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

              {config.endpoint === '/workers' && !editing && (
                <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  Worker code is generated automatically from the assigned manager and position, for example <strong>GRA-MIN-001</strong>.
                </p>
              )}

              {config.endpoint === '/advances' && form.employee_id && !editing && (
                <div className="mt-4 rounded-md border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
                  {advanceEligibility?.error ? (
                    <p>{advanceEligibility.error}</p>
                  ) : !advanceEligibility ? (
                    <p>Calculating attendance-based advance eligibility…</p>
                  ) : (
                    <>
                      <p className="font-semibold">Attendance-based advance balance</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-cyan-900">
                        <span>Worked days: {advanceEligibility.worked_days}</span>
                        <span>Earned: {Number(advanceEligibility.earned_amount || 0).toLocaleString()} RWF</span>
                        <span>Allowed (50%): {Number(advanceEligibility.allowed_advance || 0).toLocaleString()} RWF</span>
                        <span>Still available: {Number(advanceEligibility.remaining_allowed_advance || 0).toLocaleString()} RWF</span>
                        {advanceEligibility.paid_through_date && <span className="col-span-2">Previous payroll paid through: {advanceEligibility.paid_through_date}</span>}
                      </div>
                      {advanceEligibility.advance_already_requested
                        ? <p className="mt-2 font-medium text-amber-800">An advance is already requested for this payroll cycle. The worker must finish and receive the 12-workday payroll, then work six new days.</p>
                        : !advanceEligibility.eligible && <p className="mt-2 font-medium">Available after six new recorded worked days (Monday to Saturday) following the last paid payroll.</p>}
                    </>
                  )}
                </div>
              )}

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
                            {canCreateResource && !config.noEdit && (!config.editShow || config.editShow(item)) && (
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
        {reportDetail && <ReportSnapshotModal report={reportDetail} onClose={() => setReportDetail(null)} />}
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
  if (type === 'paymenttype') return <label className="block md:col-span-2 lg:col-span-1"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span><select value={value || 'FIXED_DAILY'} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"><option value="FIXED_DAILY">Permanent worker — fixed daily rate</option><option value="FLEXIBLE_DAILY">Flexible worker — rate entered for each worked day</option></select></label>
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
  if (type === 'manager') return <SelectField label={label} value={value} onChange={onChange} required={required} options={related.managers} idKey="user_id" labelKey={(item) => `${item.employees?.first_name || ''} ${item.employees?.last_name || ''}`.trim() || item.username} />
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

  if (type === 'yesno') {
    return (
      <SelectBase label={label} value={value ? 'YES' : 'NO'} onChange={(selected) => onChange(selected === 'YES')} required={required}>
        <option value="YES">Yes</option>
        <option value="NO">No</option>
      </SelectBase>
    )
  }

  if (type === 'frequency') {
    return (
      <SelectBase label={label} value={value} onChange={onChange} required={required}>
        <option value="BIWEEKLY">Biweekly (14 days)</option>
        <option value="MONTHLY">Monthly</option>
      </SelectBase>
    )
  }

  if (type === 'reporttype') {
    return (
      <SelectBase label={label} value={value} onChange={onChange} required={required}>
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly (Monday to Sunday)</option>
        <option value="MONTHLY">Monthly (calendar month)</option>
        <option value="YEARLY">Yearly (calendar year)</option>
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

function reportSummary(item) {
  if (!item?.daily_summary) return {}
  if (typeof item.daily_summary === 'object') return item.daily_summary
  try { return JSON.parse(item.daily_summary) } catch { return {} }
}

function ReportSnapshotModal({ report, onClose }) {
  const summary = reportSummary(report)
  const attendance = report.attendance_summary || {}
  const production = report.production_summary || {}
  const advances = report.advances_summary || {}
  const payroll = summary.payroll_summary || {}
  const consumptions = summary.worker_consumptions || {}
  const food = summary.food_supplies || {}
  const expenses = summary.expenses || {}
  const activity = summary.activity_rows || {}
  const amount = (value) => `${Number(value || 0).toLocaleString()} RWF`
  const period = report.report_type && report.period_start && report.period_end ? `${report.report_type}: ${report.period_start} to ${report.period_end}` : summary.report_period ? `${summary.report_period.type}: ${summary.report_period.start} to ${summary.report_period.end}` : report.report_date
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-2xl"><div className="sticky top-0 flex items-start justify-between border-b bg-white p-6"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Automatic Operations Report</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{period}</h2><p className="mt-1 text-sm text-slate-500">Status: {report.status || 'DRAFT'} · detailed rows captured from this period</p></div><button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div><div className="grid gap-4 p-6 md:grid-cols-2"><SummarySection title="Attendance" rows={[['Workers', attendance.total_workers],['Present', attendance.present],['Absent', attendance.absent],['Hours worked', attendance.hours],['Overtime', attendance.overtime]]}/><SummarySection title="Production" rows={[['Production records', production.records],['Production expenses', amount(production.expenses)]]}/><SummarySection title="Advances" rows={[['Requests', advances.count],['Total requested', amount(advances.total)],['Paid advances', amount(advances.paid)]]}/><SummarySection title="Payroll" rows={[['Payroll records', payroll.count],['Net payroll', amount(payroll.net_salary)],['Advance deductions', amount(payroll.advance_deduction)],['Worker item deductions', amount(payroll.consumption_deduction)]]}/><SummarySection title="Worker items" rows={[['Items recorded', amount(consumptions.total)],['Already deducted', amount(consumptions.deducted)],['Outstanding balance', amount(consumptions.outstanding)] ]}/><SummarySection title="Expenses and materials" rows={[['Records', expenses.count],['Recorded value', amount(expenses.total)],['Paid value', amount(expenses.paid)] ]}/><SummarySection title="Food supplies" rows={[['Supply records', food.count],['Supply value', amount(food.total)],['Paid supplies', food.paid]]}/></div><div className="space-y-5 border-t p-6"><ActivityTable title="Attendance register" headers={['Date','Worker','Check in','Check out','Hours','Status']} rows={(activity.attendance || []).map((r) => [r.attendance_date, `${r.employees?.employee_code || ''} ${employeeName(r)}`, r.check_in || '-', r.check_out || '-', r.hours_worked || 0, r.attendance_status || '-'])}/><ActivityTable title="Production register" headers={['Date','Worker','Mineral','Quantity','Hours','Details']} rows={(activity.production || []).map((r) => [r.production_date, `${r.employees?.employee_code || ''} ${employeeName(r)}`, r.mineral_type || '-', `${r.quantity || 0} ${r.unit || ''}`, r.working_hours || 0, r.activity_details || r.remarks || '-'])}/><ActivityTable title="Advances register" headers={['Date','Worker','Requested','Paid','Balance','Status']} rows={(activity.advances || []).map((r) => [r.request_date, `${r.employees?.employee_code || ''} ${employeeName(r)}`, amount(r.amount), amount(r.amount_paid), amount(r.remaining_balance), `${r.status || '-'} / ${r.payment_status || '-'}`])}/><ActivityTable title="Payroll register" headers={['Period','Worker','Days','Gross','Advance','Items','Net','Status']} rows={(activity.payroll || []).map((r) => [`${r.payroll_period_start || '-'} to ${r.payroll_period_end || '-'}`, `${r.employees?.employee_code || ''} ${employeeName(r)}`, r.days_worked || 0, amount(r.basic_salary), amount(r.advance_deduction), amount(r.consumption_deduction), amount(r.net_salary), `${r.approval_status || '-'} / ${r.payment_status || '-'}`])}/><ActivityTable title="Expenses and material purchases" headers={['Date','Category','Item','Quantity','Total','Buyer','MTN number','Status']} rows={(activity.expenses || []).map((r) => [r.expense_date, r.expense_category, r.item_name, `${r.quantity} ${r.unit}`, amount(r.total_amount), r.buyer_name, r.buyer_phone, `${r.approval_status} / ${r.payment_status}`])}/><ActivityTable title="Worker items" headers={['Date','Worker','Item','Quantity','Total','Shopkeeper','Status']} rows={(activity.worker_consumptions || []).map((r) => [r.consumption_date, `${r.employees?.employee_code || ''} ${employeeName(r)}`, r.item_name, r.quantity, amount(r.total_amount), r.shopkeepers?.shopkeeper_name || '-', `${r.approval_status || '-'} / ${r.shopkeeper_payment_status || '-'}`])}/></div><div className="border-t p-6 text-right"><button onClick={onClose} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Close</button></div></div></div>
}

function SummarySection({ title, rows }) {
  return <section className="rounded-lg border border-slate-200"><h3 className="border-b bg-slate-50 px-4 py-3 font-semibold text-slate-800">{title}</h3><dl className="divide-y divide-slate-100">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value ?? 0}</dd></div>)}</dl></section>
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
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

function ActivityTable({ title, headers, rows }) {
  return <section className="overflow-hidden rounded-lg border border-slate-200"><h3 className="border-b bg-emerald-50 px-4 py-3 font-semibold text-slate-800">{title}</h3>{rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-100 text-left text-xs uppercase text-slate-600"><tr>{headers.map((header) => <th className="border-r border-slate-200 px-3 py-2 last:border-r-0" key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr className="border-t" key={index}>{row.map((value, cell) => <td className="border-r border-slate-100 px-3 py-2 align-top last:border-r-0" key={cell}>{value ?? '-'}</td>)}</tr>)}</tbody></table></div> : <p className="p-4 text-sm text-slate-500">No records in this period.</p>}</section>
}

function PaymentBatches({ managerId, onPaid }) {
  const [summary, setSummary] = useState({ payroll: [], advances: [], food: [], consumptions: [] })
  const [readiness, setReadiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [payroll, advances, food, consumptions, paymentReadiness] = await Promise.all([
        api.get('/payroll'), api.get('/advances'), api.get('/food-supplies'), api.get('/worker-consumptions'), api.get('/payments/readiness')
      ])
      setSummary({ payroll: asArray(payroll), advances: asArray(advances), food: asArray(food), consumptions: asArray(consumptions) })
      setReadiness(paymentReadiness.data?.data || null)
    } catch (error) { toast.error(error.response?.data?.message || 'Could not calculate the payment queue.') } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])
  const scoped = (rows) => managerId ? rows.filter((row) => (row.manager_user_id || row.employees?.manager_user_id) === managerId) : rows
  const queues = [
    { key: 'payroll', label: 'Approved payroll', rows: scoped(summary.payroll).filter((row) => row.approval_status === 'OWNER_APPROVED' && row.payment_status === 'APPROVED'), endpoint: '/payments/pay-all', amount: (row) => row.net_salary },
    { key: 'advances', label: 'Approved advances', rows: scoped(summary.advances).filter((row) => row.status === 'OWNER_APPROVED' && row.payment_status !== 'PAID'), endpoint: '/advance-approvals/pay-all', amount: (row) => row.remaining_balance ?? row.amount },
    { key: 'food', label: 'Approved food supplies', rows: scoped(summary.food).filter((row) => row.status === 'OWNER_APPROVED' && row.payment_status !== 'PAID'), endpoint: '/food-supplies/pay-all', amount: (row) => row.total_amount },
    { key: 'consumptions', label: 'Approved shopkeeper payments', rows: scoped(summary.consumptions).filter((row) => row.approval_status === 'OWNER_APPROVED' && row.shopkeeper_payment_status !== 'PAID'), endpoint: '/worker-consumptions/pay-all', amount: (row) => row.total_amount },
  ]
  const pay = async (queue) => {
    const total = queue.rows.reduce((sum, row) => sum + Number(queue.amount(row) || 0), 0)
    if (!queue.rows.length) return
    if (!window.confirm(`Pay ${queue.rows.length} ${queue.label.toLowerCase()} totaling ${total.toLocaleString()} RWF?`)) return
    setPaying(queue.key)
    try { const result = await api.post(queue.endpoint, managerId ? { manager_user_id: managerId } : {}); const data = result.data?.data || {}; toast.success(`${queue.label}: ${data.paid ?? data.employees ?? 0} paid.`); await load(); onPaid?.() } catch (error) { toast.error(error.response?.data?.message || 'Bulk payment failed.') } finally { setPaying('') }
  }

  return <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Owner payment center</p><h2 className="mt-1 text-xl font-bold text-slate-900">Ready-to-pay totals</h2><p className="mt-1 text-sm text-slate-600">Only owner-approved records are included. Shopkeeper payments use each shopkeeper’s saved phone number.</p></div>{readiness && <div className={`mt-4 rounded-lg border p-3 text-sm ${readiness.live_payments_enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><strong>Payment provider: {readiness.provider}</strong> — {readiness.message}</div>}{loading ? <p className="mt-4 text-sm text-slate-500">Calculating payable totals…</p> : <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{queues.map((queue) => { const total = queue.rows.reduce((sum, row) => sum + Number(queue.amount(row) || 0), 0); return <article key={queue.key} className="rounded-lg border border-white bg-white p-4 shadow-sm"><p className="text-sm font-semibold text-slate-700">{queue.label}</p><p className="mt-2 text-2xl font-bold text-blue-700">{total.toLocaleString()} RWF</p><p className="mt-1 text-xs text-slate-500">{queue.rows.length} record{queue.rows.length === 1 ? '' : 's'} ready</p><button disabled={!queue.rows.length || Boolean(paying)} onClick={() => pay(queue)} className="mt-4 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{paying === queue.key ? 'Paying…' : `Pay all ${queue.label.toLowerCase()}`}</button></article> })}</div>}</section>
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
