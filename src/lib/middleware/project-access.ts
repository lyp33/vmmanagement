import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './auth-middleware'
import { storage } from '@/lib/storage'

// 检查用户是否有访问特定项目的权限
export async function checkProjectAccess(
  request: NextRequest, 
  projectId: string
): Promise<NextResponse | null> {
  const user = await getCurrentUser(request)
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // 管理员可以访问所有项目
  if (user.role === 'ADMIN') {
    return null
  }

  // 检查普通用户是否被分配到该项目
  const userProjects = await storage.findUserProjects(user.id)
  const hasAccess = userProjects.some(project => project.id === projectId)

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Access denied to this project' },
      { status: 403 }
    )
  }

  return null
}

// 检查用户是否有访问特定VM的权限
export async function checkVMAccess(
  request: NextRequest, 
  vmId: string
): Promise<NextResponse | null> {
  const user = await getCurrentUser(request)
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // 管理员可以访问所有VM
  if (user.role === 'ADMIN') {
    return null
  }

  // 获取用户可访问的VM列表
  const userVMs = await storage.findVMsByUserPermissions(user.id, false)
  const hasAccess = userVMs.some(vm => vm.id === vmId)

  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Access denied to this VM' },
      { status: 403 }
    )
  }

  return null
}

// 过滤用户可访问的数据
export async function filterDataByUserPermissions<T extends { projectId?: string }>(
  request: NextRequest,
  data: T[]
): Promise<T[]> {
  const user = await getCurrentUser(request)
  
  if (!user) {
    return []
  }

  // 管理员可以看到所有数据
  if (user.role === 'ADMIN') {
    return data
  }

  // 获取用户的项目权限
  const userProjects = await storage.findUserProjects(user.id)
  const userProjectIds = userProjects.map(p => p.id)

  // 只返回用户有权限的项目数据
  return data.filter(item => 
    item.projectId && userProjectIds.includes(item.projectId)
  )
}

// 获取用户可访问的项目ID列表
export async function getUserAccessibleProjectIds(userId: string, isAdmin: boolean): Promise<string[]> {
  if (isAdmin) {
    const allProjects = await storage.findAllProjects()
    return allProjects.map(p => p.id)
  }

  const userProjects = await storage.findUserProjects(userId)
  return userProjects.map(p => p.id)
}

// 验证用户对资源的操作权限
export async function validateResourceAccess(
  request: NextRequest,
  resourceType: 'vm' | 'project' | 'audit',
  resourceId?: string
): Promise<NextResponse | null> {
  const user = await getCurrentUser(request)
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // 管理员对所有资源都有访问权限
  if (user.role === 'ADMIN') {
    return null
  }

  switch (resourceType) {
    case 'audit':
      // 只有管理员可以访问审计日志
      return NextResponse.json(
        { error: 'Admin access required for audit logs' },
        { status: 403 }
      )

    case 'project':
      if (resourceId) {
        return await checkProjectAccess(request, resourceId)
      }
      break

    case 'vm':
      if (resourceId) {
        return await checkVMAccess(request, resourceId)
      }
      break

    default:
      return NextResponse.json(
        { error: 'Invalid resource type' },
        { status: 400 }
      )
  }

  return null
}