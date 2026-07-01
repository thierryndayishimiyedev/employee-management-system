import { createContext, useContext, useMemo, useState } from 'react'
import api from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('admin')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })

    if (!data.success) {
      throw new Error(data.message || 'Login failed')
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('admin', JSON.stringify(data.admin))
    setAdmin(data.admin)

    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('admin')
    setAdmin(null)
  }

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: Boolean(admin),
      login,
      logout,
    }),
    [admin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
