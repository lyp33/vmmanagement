import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    name: string
    role: 'ADMIN' | 'USER'
  }
}

// 检查用户是否已认证
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // 将用户信息添加到请求中
  ;(request as AuthenticatedRequest).user = {
    id: token.id as string,
    email: token.email as string,
    name: token.name as string,
    role: token.role as 'ADMIN' | 'USER'
  }

  return null // 继续处理请求
}

// 检查用户是否为管理员
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const authResult = await requireAuth(request)
  if (authResult) return authResult

  const user = (request as AuthenticatedRequest).user
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  return null // 继续处理请求
}

// 检查用户角色
export async function checkUserRole(request: NextRequest, requiredRole: 'ADMIN' | 'USER'): Promise<NextResponse | null> {
  const authResult = await requireAuth(request)
  if (authResult) return authResult

  const user = (request as AuthenticatedRequest).user
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // 管理员可以访问所有内容
  if (user.role === 'ADMIN') {
    return null
  }

  // 检查是否满足所需角色
  if (requiredRole === 'ADMIN') {
    if ((user.role as string) !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
  }

  // 如果需要USER角色，任何已认证用户都可以访问

  return null // 继续处理请求
}

// 获取当前用户信息
export async function getCurrentUser(request: NextRequest): Promise<{
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'USER'
} | null> {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  if (!token) return null

  return {
    id: token.id as string,
    email: token.email as string,
    name: token.name as string,
    role: token.role as 'ADMIN' | 'USER'
  }
}