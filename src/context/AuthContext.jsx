import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

const STORAGE_KEY = 'h3_master_session'

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  // Sync to sessionStorage whenever currentUser changes
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser))
        sessionStorage.setItem('username', currentUser.username || '')
        sessionStorage.setItem('name', currentUser.name || currentUser.username || '')
        sessionStorage.setItem('role', currentUser.role === 'admin' ? 'admin' : (currentUser.page_access?.ims?.role || 'user'))
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
        sessionStorage.removeItem('username')
        sessionStorage.removeItem('name')
        sessionStorage.removeItem('role')
      }
    } catch (e) {
      console.error('Session storage sync error:', e)
    }
  }, [currentUser])

  /**
   * Log in user
   */
  const login = async (username, password) => {
    setLoading(true)
    try {
      const result = await authService.login(username, password)
      if (result.success && result.user) {
        setCurrentUser(result.user)
        return { success: true, user: result.user }
      }
      return { success: false, error: result.error || 'Authentication failed' }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Log out user
   */
  const logout = () => {
    setCurrentUser(null)
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem('username')
    sessionStorage.removeItem('name')
    sessionStorage.removeItem('role')
  }

  /**
   * Re-fetch the current user from database to update permissions in live session
   */
  const refreshUser = async () => {
    if (!currentUser?.id) return
    const result = await authService.getUserById(currentUser.id)
    if (result.success && result.user) {
      if (!result.user.is_active) {
        logout()
      } else {
        setCurrentUser(result.user)
      }
    }
  }

  /**
   * Permission Helper: Check if master user is super admin
   */
  const isAdmin = () => {
    return currentUser?.role === 'admin'
  }

  /**
   * Permission Helper: Check if user has access to a system module ('pete' | 'ims' | 'pms')
   */
  const canAccessSystem = (systemKey) => {
    if (!currentUser) return false
    if (isAdmin()) return true
    return currentUser.page_access?.[systemKey]?.access === true
  }

  /**
   * Permission Helper: Check if user has access to a specific page inside a module
   */
  const canAccessPage = (systemKey, pageKey) => {
    if (!currentUser) return false
    if (isAdmin()) return true
    
    const moduleAccess = currentUser.page_access?.[systemKey]
    if (!moduleAccess || !moduleAccess.access) return false
    if (moduleAccess.full_access === true) return true
    
    return Array.isArray(moduleAccess.pages) && moduleAccess.pages.includes(pageKey)
  }

  /**
   * Get user's role for a specific module
   */
  const getModuleRole = (systemKey) => {
    if (!currentUser) return null
    if (isAdmin()) return 'admin'
    return currentUser.page_access?.[systemKey]?.role || 'user'
  }

  const value = {
    currentUser,
    loading,
    login,
    logout,
    refreshUser,
    isAdmin,
    canAccessSystem,
    canAccessPage,
    getModuleRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
