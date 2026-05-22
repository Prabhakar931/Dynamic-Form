import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { auth as authApi } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('auth_token'))
  const [loading, setLoading] = useState(true)

  const isAuthenticated = !!user

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    authApi.me()
      .then(res => {
        setUser(res.data.user)
      })
      .catch(() => {
        localStorage.removeItem('auth_token')
        setToken(null)
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = useCallback(async (username, password) => {
    const res = await authApi.login(username, password)
    const { token: newToken, user: userData } = res.data
    localStorage.setItem('auth_token', newToken)
    setToken(newToken)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
