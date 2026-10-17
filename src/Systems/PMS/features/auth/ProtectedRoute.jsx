import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute({ children, pageKey }) {
  const { currentUser, loading, hasAccess } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pms-bg">
        <div className="text-sm font-medium text-pms-muted animate-pulse">Loading H3MS...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (pageKey && !hasAccess(pageKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
