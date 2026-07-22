import { createContext, useContext, useEffect, useState } from 'react'
import apiClient from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ktw_token'))
  const [role, setRole] = useState(() => localStorage.getItem('ktw_role'))
  const [phoneNumber, setPhoneNumber] = useState(() => localStorage.getItem('ktw_phone'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  const login = async (phoneNumberInput, password) => {
    const { data } = await apiClient.post('/auth/login', { phoneNumber: phoneNumberInput, password })
    applySession(data)
    return data
  }

  const register = async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload)
    applySession(data)
    return data
  }

  const applySession = (data) => {
    localStorage.setItem('ktw_token', data.accessToken)
    localStorage.setItem('ktw_role', data.role)
    localStorage.setItem('ktw_phone', data.phoneNumber)
    setToken(data.accessToken)
    setRole(data.role)
    setPhoneNumber(data.phoneNumber)
  }

  const logout = () => {
    localStorage.removeItem('ktw_token')
    localStorage.removeItem('ktw_role')
    localStorage.removeItem('ktw_phone')
    setToken(null)
    setRole(null)
    setPhoneNumber(null)
  }

  const value = {
    token,
    role,
    phoneNumber,
    isAuthenticated: !!token,
    isAdmin: role === 'Admin',
    loading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
