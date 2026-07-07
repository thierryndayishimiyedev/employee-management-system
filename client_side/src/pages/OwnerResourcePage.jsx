import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Building2,
  Calendar,
  Database,
  Mountain,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import api from '../api/api'
import { useAuth } from '../context/authStore'
import AppSidebar from './Appsidebar'

const today = new Date().toISOString().split('T')[0]

const emptyForms = {
  departments: {
    department_name: '',
    description: '',
  },
  positions: {
    department_id: '',
    position_name: '',
    description: '',
  },
  production: {
    employee_id: '',
    production_date: today,
    mineral_type: '',
    quantity: '',
    unit: 'kg',
    remarks: '',
  },
}

const resourceConfig = {
  departments: {
    title: 'Departments',
    subtitle: 'Manage company departments used by employees and positions.',
    endpoint: '/departments',
    idKey: 'department_id',
    icon: Building2,
    createLabel: 'Add Department',
    formTitle: 'Department Details',
    columns: [
      { label: 'Department', render: (item) => item.department_name },
      { label: 'Company', render: (item) => item.companies?.company_name || 'Current company' },
      { label: 'Description', render: (item) => item.description || '-' },
    ],
  },
  positions: {
    title: 'Positions',
    subtitle: 'Create and maintain job positions linked to departments.',
    endpoint: '/positions',
    idKey: 'position_id',
    icon: Database,
    createLabel: 'Add Position',
    formTitle: 'Position Details',
    columns: [
      { label: 'Position', render: (item) => item.position_name },
      { label: 'Department', render: (item) => item.departments?.department_name || '-' },
      { label: 'Description', render: (item) => item.description || '-' },
    ],
  },
  production: {
    title: 'Production',
    subtitle: 'Record mineral production by employee and production date.',
    endpoint: '/production',
    idKey: 'production_id',
    icon: Mountain,
    createLabel: 'Log Production',
    formTitle: 'Production Record',
    columns: [
      {
        label: 'Employee',
        render: (item) => [item.employees?.first_name, item.employees?.last_name].filter(Boolean).join(' ') || '-',
      },
      { label: 'Date', render: (item) => item.production_date || '-' },
      { label: 'Mineral', render: (item) => item.mineral_type || '-' },
      { label: 'Quantity', render: (item) => `${Number(item.quantity || 0).toLocaleString()} ${item.unit || ''}` },
      { label: 'Remarks', render: (item) => item.remarks || '-' },
    ],
  },
}

const getResponseData = (response) => response?.data?.data ?? response?.data ?? []

export default function OwnerResourcePage({ resource }) {
  const config = resourceConfig[resource]
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(emptyForms[resource])
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const Icon = config.icon
  const companyId = user?.employees?.company_id || user?.company_id || ''

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const requests = [api.get(config.endpoint)]

      if (resource === 'positions') {
        requests.push(api.get('/departments'))
      }

      if (resource === 'production') {
        requests.push(api.get('/employees'))
      }

      const [resourceResponse, relatedResponse] = await Promise.all(requests)
      setItems(Array.isArray(getResponseData(resourceResponse)) ? getResponseData(resourceResponse) : [])

      if (resource === 'positions') {
        setDepartments(Array.isArray(getResponseData(relatedResponse)) ? getResponseData(relatedResponse) : [])
      }

      if (resource === 'production') {
        setEmployees(Array.isArray(getResponseData(relatedResponse)) ? getResponseData(relatedResponse) : [])
      }
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to load ${config.title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }, [config.endpoint, config.title, resource])

  useEffect(() => {
    setForm(emptyForms[resource])
    setEditing(null)
    loadData()
  }, [loadData, resource])

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase()
    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(term))
  }, [items, search])

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const beginEdit = (item) => {
    setEditing(item)
    if (resource === 'departments') {
      setForm({
        department_name: item.department_name || '',
        description: item.description || '',
      })
    } else if (resource === 'positions') {
      setForm({
        department_id: item.department_id || '',
        position_name: item.position_name || '',
        description: item.description || '',
      })
    } else {
      setForm({
        employee_id: item.employee_id || '',
        production_date: item.production_date || today,
        mineral_type: item.mineral_type || '',
        quantity: item.quantity || '',
        unit: item.unit || 'kg',
        remarks: item.remarks || '',
      })
    }
  }

  const resetForm = () => {
    setForm(emptyForms[resource])
    setEditing(null)
  }

  const buildPayload = () => {
    if (resource === 'departments') {
      return {
        ...form,
        company_id: companyId,
      }
    }

    if (resource === 'production') {
      return {
        ...form,
        quantity: Number(form.quantity),
      }
    }

    return form
  }

  const saveItem = async (event) => {
    event.preventDefault()
    setSaving(true)

    try {
      const payload = buildPayload()

      if (editing) {
        await api.put(`${config.endpoint}/${editing[config.idKey]}`, payload)
        toast.success(`${config.title.slice(0, -1)} updated`)
      } else {
        await api.post(config.endpoint, payload)
        toast.success(`${config.title.slice(0, -1)} created`)
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
    if (!window.confirm(`Delete this ${config.title.slice(0, -1).toLowerCase()}?`)) return

    try {
      await api.delete(`${config.endpoint}/${item[config.idKey]}`)
      toast.success(`${config.title.slice(0, -1)} deleted`)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <Icon size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">{config.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </header>

          <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
            <form onSubmit={saveItem} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {editing ? 'Editing' : 'Create'}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{config.formTitle}</h2>
                </div>
                {editing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Cancel edit"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {resource === 'departments' && (
                  <>
                    <Field
                      label="Department name"
                      value={form.department_name}
                      onChange={(value) => handleChange('department_name', value)}
                      required
                    />
                    <Textarea
                      label="Description"
                      value={form.description}
                      onChange={(value) => handleChange('description', value)}
                    />
                  </>
                )}

                {resource === 'positions' && (
                  <>
                    <Select
                      label="Department"
                      value={form.department_id}
                      onChange={(value) => handleChange('department_id', value)}
                      required
                    >
                      <option value="">Select department</option>
                      {departments.map((department, index) => (
                        <option key={`${department.department_id ?? 'department'}-${index}`} value={department.department_id ?? ''}>
                          {department.department_name}
                        </option>
                      ))}
                    </Select>
                    <Field
                      label="Position name"
                      value={form.position_name}
                      onChange={(value) => handleChange('position_name', value)}
                      required
                    />
                    <Textarea
                      label="Description"
                      value={form.description}
                      onChange={(value) => handleChange('description', value)}
                    />
                  </>
                )}

                {resource === 'production' && (
                  <>
                    <Select
                      label="Employee"
                      value={form.employee_id}
                      onChange={(value) => handleChange('employee_id', value)}
                      required
                    >
                      <option value="">Select employee</option>
                      {employees.map((employee, index) => (
                        <option key={`${employee.employee_id ?? 'employee'}-${index}`} value={employee.employee_id ?? ''}>
                          {employee.employee_code} - {employee.first_name} {employee.last_name}
                        </option>
                      ))}
                    </Select>
                    <Field
                      label="Production date"
                      type="date"
                      value={form.production_date}
                      onChange={(value) => handleChange('production_date', value)}
                      required
                      icon={Calendar}
                    />
                    <Field
                      label="Mineral type"
                      value={form.mineral_type}
                      onChange={(value) => handleChange('mineral_type', value)}
                      required
                    />
                    <div className="grid grid-cols-[1fr_92px] gap-3">
                      <Field
                        label="Quantity"
                        type="number"
                        value={form.quantity}
                        onChange={(value) => handleChange('quantity', value)}
                        required
                      />
                      <Field
                        label="Unit"
                        value={form.unit}
                        onChange={(value) => handleChange('unit', value)}
                        required
                      />
                    </div>
                    <Textarea
                      label="Remarks"
                      value={form.remarks}
                      onChange={(value) => handleChange('remarks', value)}
                    />
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editing ? <Save size={16} /> : <Plus size={16} />}
                {saving ? 'Saving...' : editing ? 'Save Changes' : config.createLabel}
              </button>
            </form>

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
                        {config.columns.map((column) => (
                          <th key={column.label} className="px-4 py-3 font-semibold">
                            {column.label}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item, itemIndex) => (
                        <tr key={`${item?.[config.idKey] ?? 'row'}-${itemIndex}`} className="transition hover:bg-slate-50/70">
                          {config.columns.map((column) => (
                            <td key={column.label} className="px-4 py-3 text-slate-700">
                              {column.render(item)}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => beginEdit(item)}
                                className="rounded-md p-2 text-slate-400 transition hover:bg-cyan-50 hover:text-cyan-700"
                                aria-label="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteItem(item)}
                                className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                aria-label="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, icon: Icon }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <input
          type={type}
          value={value ?? ''}
          required={required}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400 ${
            Icon ? 'pl-9' : ''
          }`}
        />
      </div>
    </label>
  )
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-amber-400"
      />
    </label>
  )
}

function Select({ label, value, onChange, required = false, children }) {
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
