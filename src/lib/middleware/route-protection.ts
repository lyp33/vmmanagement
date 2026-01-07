import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin, getCurrentUser, AuthenticatedRequest } from './auth-middleware'

// 路由处理器类型
type RouteHandler = (request: AuthenticatedRequest) => Promise<NextResponse>

// 保护需要认证的路由
export function withAuth(handler: RouteHandler) {
  return async (request: NextRequest) => {
    const authResult = await requireAuth(request)
    if (authResult) return authResult

    return handler(request as AuthenticatedRequest)
  }
}

// 保护需要管理员权限的路由
export function withAdminAuth(handler: RouteHandler) {
  return async (request: NextRequest) => {
    const authResult = await requireAdmin(request)
    if (authResult) return authResult

    return handler(request as AuthenticatedRequest)
  }
}

// 保护需要特定角色的路由
export function withRoleAuth(requiredRole: 'ADMIN' | 'USER', handler: RouteHandler) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 管理员可以访问所有内容
    if (user.role === 'ADMIN') {
      ;(request as AuthenticatedRequest).user = user
      return handler(request as AuthenticatedRequest)
    }

    // 检查角色权限
    if (user.role !== requiredRole) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    ;(request as AuthenticatedRequest).user = user
    return handler(request as AuthenticatedRequest)
  }
}