"use client"

import { useAuth } from '@/hooks/use-auth'
import { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
  fallback?: ReactNode
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  fallback = <div>Loading...</div> 
}: ProtectedRouteProps) {
  const { isLoading, isAuthenticated, isAdmin } = useAuth()

  if (isLoading) {
    return <>{fallback}</>
  }

  if (!isAuthenticated) {
    return <div>Redirecting to login...</div>
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function AdminRoute({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requireAdmin={true} fallback={fallback}>
      {children}
    </ProtectedRoute>
  )
}