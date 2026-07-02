import { createContext, useContext, useMemo, useState } from 'react'
import api from '../api/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (username, password, portal = 'admin') => {
    const endpoint = portal === 'owner' ? '/owner-auth/login' : '/auth/login'
    const { data } = await api.post(endpoint, { username, password })

    if (!data.success) {
      throw new Error(data.message || 'Login failed')
    }

    const session =
      portal === 'owner'
        ? {
            ...data.data.user,
            role: data.data.user.roles?.role_name || 'OWNER',
          }
        : {
            ...data.admin,
            role: 'ADMIN',
          }

    localStorage.setItem('token', portal === 'owner' ? data.data.token : data.token)
    localStorage.setItem('user', JSON.stringify(session))
    setUser(session)

    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      isOwner: user?.role === 'OWNER',
      login,
      logout,
    }),
    [user],
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
