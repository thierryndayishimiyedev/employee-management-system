import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/api'
import { useAuth } from './authStore'

const OwnerManagerScope = createContext({ managerId: '', managers: [], setManagerId: () => {}, loadingManagers: false })

export function OwnerManagerScopeProvider({ children }) {
  const { user } = useAuth()
  const [managerId, setManagerIdState] = useState(() => localStorage.getItem('owner_manager_scope') || '')
  const [managers, setManagers] = useState([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  useEffect(() => {
    if (user?.role_name !== 'OWNER') { setManagers([]); setManagerIdState(''); return }
    setLoadingManagers(true)
    api.get('/managers').then((response) => {
      const rows = response.data?.data || []
      setManagers(rows.map((row) => ({ user_id: row.user_id, name: `${row.employees?.first_name || ''} ${row.employees?.last_name || ''}`.trim() || row.username })))
    }).catch(() => setManagers([])).finally(() => setLoadingManagers(false))
  }, [user?.role_name])
  const setManagerId = (value) => { const next = value || ''; setManagerIdState(next); localStorage.setItem('owner_manager_scope', next) }
  return <OwnerManagerScope.Provider value={{ managerId, managers, setManagerId, loadingManagers }}>{children}</OwnerManagerScope.Provider>
}
export const useOwnerManagerScope = () => useContext(OwnerManagerScope)
