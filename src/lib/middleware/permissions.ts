import { NextRequest, NextResponse } from 'next/server'
import { AuthenticatedRequest } from './auth-middleware'
import { validateResourceAccess, getUserAccessibleProjectIds } from './project-access'

// 权限检查结果
export interface PermissionResult {
  hasAccess: boolean
  user: {
    id: string
    email: string
    name: string
    role: 'ADMIN' | 'USER'
  } | null
  accessibleProjectIds: string[]
}

// 综合权限检查
export async function checkPermissions(
  request: NextRequest,
  options: {
    requireAuth?: boolean
    requireAdmin?: boolean
    resourceType?: 'vm' | 'project' | 'audit'
    resourceId?: string
  } = {}
): Promise<PermissionResult> {
  const { requireAuth = true, requireAdmin = false, resourceType, resourceId } = options

  // 基础认证检查
  if (requireAuth) {
    const authResult = await validateResourceAccess(request, 'project')
    if (authResult) {
      return {
        hasAccess: false,
        user: null,
        accessibleProjectIds: []
      }
    }
  }

  const user = (request as AuthenticatedRequest).user
  if (!user) {
    return {
      hasAccess: false,
      user: null,
      accessibleProjectIds: []
    }
  }

  // 管理员权限检查
  if (requireAdmin && user.role !== 'ADMIN') {
    return {
      hasAccess: false,
      user,
      accessibleProjectIds: []
    }
  }

  // 资源访问权限检查
  if (resourceType) {
    const resourceResult = await validateResourceAccess(request, resourceType, resourceId)
    if (resourceResult) {
      return {
        hasAccess: false,
        user,
        accessibleProjectIds: []
      }
    }
  }

  // 获取用户可访问的项目ID
  const accessibleProjectIds = await getUserAccessibleProjectIds(user.id, user.role === 'ADMIN')

  return {
    hasAccess: true,
    user,
    accessibleProjectIds
  }
}

// 创建权限检查装饰器
export function withPermissions(
  options: {
    requireAuth?: boolean
    requireAdmin?: boolean
    resourceType?: 'vm' | 'project' | 'audit'
    resourceId?: string
  } = {}
) {
  return function (handler: (request: AuthenticatedRequest, permissions: PermissionResult) => Promise<NextResponse>) {
    return async (request: NextRequest) => {
      const permissions = await checkPermissions(request, options)
      
      if (!permissions.hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: permissions.user ? 403 : 401 }
        )
      }

      return handler(request as AuthenticatedRequest, permissions)
    }
  }
}

// 客户端权限检查Hook
export function usePermissions() {
  // 这个会在客户端组件中使用
  return {
    checkProjectAccess: async (projectId: string) => {
      try {
        const response = await fetch(`/api/permissions/project/${projectId}`)
        return response.ok
      } catch {
        return false
      }
    },
    
    checkVMAccess: async (vmId: string) => {
      try {
        const response = await fetch(`/api/permissions/vm/${vmId}`)
        return response.ok
      } catch {
        return false
      }
    },
    
    checkAdminAccess: async () => {
      try {
        const response = await fetch('/api/permissions/admin')
        return response.ok
      } catch {
        return false
      }
    }
  }
}