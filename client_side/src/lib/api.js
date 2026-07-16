import client from '../api/api'

function unwrap(response) {
  return response.data?.data ?? response.data
}

function toManagerOverview(manager) {
  const employee = manager.employees || {}
  const name = `${employee.first_name || ''} ${employee.last_name || ''}`.trim()

  return {
    user_id: manager.user_id,
    name: name || manager.username,
    username: manager.username,
    staff_count: 0,
    payroll_total: Number(employee.monthly_salary) || 0,
  }
}

export async function getPositions() {
  return unwrap(await client.get('/positions'))
}

export async function getManagers() {
  return unwrap(await client.get('/managers'))
}

export async function getManagerOverviews() {
  const managers = await getManagers()
  return (Array.isArray(managers) ? managers : []).map(toManagerOverview)
}

export async function getManagerById(id) {
  return unwrap(await client.get(`/managers/${id}`))
}

export async function createManager(payload) {
  return unwrap(await client.post('/managers', payload))
}

export async function updateManager(id, payload) {
  return unwrap(await client.put(`/managers/${id}`, payload))
}

export async function deactivateManager(id) {
  return unwrap(await client.delete(`/managers/${id}`))
}
