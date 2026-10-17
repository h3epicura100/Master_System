import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, adminOnly = false, system = null, page = null }) {
  const { currentUser, isAdmin, canAccessSystem, canAccessPage } = useAuth()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }

  if (system && !canAccessSystem(system)) {
    return <Navigate to="/dashboard" replace />
  }

  if (system && page && !canAccessPage(system, page)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
