"use client"

import { useAuth } from '@/hooks/use-auth'
import { ReactNode, useEffect, useState } from 'react'

interface ProjectGuardProps {
  children: ReactNode
  projectId?: string
  vmId?: string
  requireAdmin?: boolean
  fallback?: ReactNode
}

export function ProjectGuard({ 
  children, 
  projectId, 
  vmId,
  requireAdmin = false,
  fallback = <div>Access denied</div> 
}: ProjectGuardProps) {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    async function checkAccess() {
      if (!isAuthenticated || isLoading) return

      // Admin总是有访问权限
      if (isAdmin) {
        setHasAccess(true)
        return
      }

      // 如果需要Admin权限但User不是Admin
      if (requireAdmin && !isAdmin) {
        setHasAccess(false)
        return
      }

      // 检查Project访问权限
      if (projectId) {
        try {
          const response = await fetch(`/api/permissions/project/${projectId}`)
          setHasAccess(response.ok)
        } catch {
          setHasAccess(false)
        }
        return
      }

      // 检查VM访问权限
      if (vmId) {
        try {
          const response = await fetch(`/api/permissions/vm/${vmId}`)
          setHasAccess(response.ok)
        } catch {
          setHasAccess(false)
        }
        return
      }

      // 如果No指定特定资源，默认允许访问
      setHasAccess(true)
    }

    checkAccess()
  }, [isAuthenticated, isLoading, isAdmin, projectId, vmId, requireAdmin])

  if (isLoading || hasAccess === null) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <div>Please log in to continue</div>
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}