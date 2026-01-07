import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

// VM更新请求验证schema
const updateVMSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  vmAccount: z.string().min(1, 'VM account is required').optional(),
  vmInternalIP: z.string().min(1, 'VM internal IP is required').optional(),
  vmDomain: z.string().min(1, 'VM domain is required').optional(),
  currentExpiryDate: z.string().datetime('Invalid expiry date format').optional(),
  projectId: z.string().min(1, 'Project ID is required').optional(),
  lastExpiryDate: z.string().datetime().optional()
})



// 检查用户是否有权限访问VM
async function checkVMAccess(vmId: string, userId: string, isAdmin: boolean) {
  const vm = await prisma.vMRecord.findUnique({
    where: { id: vmId },
    include: { project: true }
  })

  if (!vm) {
    return { hasAccess: false, vm: null, error: 'VM not found' }
  }

  if (isAdmin) {
    return { hasAccess: true, vm, error: null }
  }

  // 检查普通用户是否有权限访问该VM所属的项目
  const hasAccess = await prisma.projectAssignment.findFirst({
    where: { userId, projectId: vm.projectId }
  })

  if (!hasAccess) {
    return { hasAccess: false, vm: null, error: 'Access denied to this VM' }
  }

  return { hasAccess: true, vm, error: null }
}

// GET /api/vms/[id] - 获取单个VM详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { id } = await params
    const vmId = id
    const { hasAccess, vm, error } = await checkVMAccess(vmId, user.id, user.role === 'ADMIN')

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'VM not found' ? 404 : 403 }
      )
    }

    // 获取完整的VM信息，包括关联数据
    const fullVM = await prisma.vMRecord.findUnique({
      where: { id: vmId },
      include: {
        project: {
          select: { id: true, name: true, description: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        },
        notificationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    return NextResponse.json(fullVM)

  } catch (error) {
    console.error('Error fetching VM:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/vms/[id] - 更新VM记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { id } = await params
    const vmId = id
    const body = await request.json()
    const validatedData = updateVMSchema.parse(body)

    // 检查VM访问权限
    const { hasAccess, vm: existingVM, error } = await checkVMAccess(vmId, user.id, user.role === 'ADMIN')

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'VM not found' ? 404 : 403 }
      )
    }

    // 如果要更新项目，检查新项目是否存在以及用户是否有权限
    if (validatedData.projectId && validatedData.projectId !== existingVM!.projectId) {
      const newProject = await prisma.project.findUnique({
        where: { id: validatedData.projectId }
      })
      if (!newProject) {
        return NextResponse.json({ error: 'New project not found' }, { status: 404 })
      }

      // 检查用户是否有权限访问新项目
      if (user.role !== 'ADMIN') {
        const hasNewProjectAccess = await prisma.projectAssignment.findFirst({
          where: { userId: user.id, projectId: validatedData.projectId }
        })
        if (!hasNewProjectAccess) {
          return NextResponse.json({ error: 'Access denied to the new project' }, { status: 403 })
        }
      }
    }

    // 验证到期时间必须是未来时间
    if (validatedData.currentExpiryDate) {
      const expiryDate = new Date(validatedData.currentExpiryDate)
      if (expiryDate <= new Date()) {
        return NextResponse.json({ error: 'Expiry date must be in the future' }, { status: 400 })
      }
    }

    // 准备更新数据
    const updateData: any = {}
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.vmAccount) updateData.vmAccount = validatedData.vmAccount
    if (validatedData.vmInternalIP) updateData.vmInternalIP = validatedData.vmInternalIP
    if (validatedData.vmDomain) updateData.vmDomain = validatedData.vmDomain
    if (validatedData.currentExpiryDate) updateData.currentExpiryDate = new Date(validatedData.currentExpiryDate)
    if (validatedData.projectId) updateData.projectId = validatedData.projectId
    if (validatedData.lastExpiryDate) updateData.lastExpiryDate = new Date(validatedData.lastExpiryDate)

    // 更新VM记录
    const updatedVM = await prisma.vMRecord.update({
      where: { id: vmId },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // 记录审计日志
    await AuditService.logVMUpdate(
      vmId,
      existingVM,
      validatedData,
      user.id,
      user.email
    )

    return NextResponse.json(updatedVM)

  } catch (error) {
    console.error('Error updating VM:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/vms/[id] - 删除VM记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { id } = await params
    const vmId = id

    // 检查VM访问权限
    const { hasAccess, vm: existingVM, error } = await checkVMAccess(vmId, user.id, user.role === 'ADMIN')

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'VM not found' ? 404 : 403 }
      )
    }

    // 删除VM记录（级联删除相关的通知日志）
    await prisma.vMRecord.delete({
      where: { id: vmId }
    })

    // 记录审计日志
    await AuditService.logVMDeletion(
      vmId,
      existingVM,
      user.id,
      user.email
    )

    return NextResponse.json({ message: 'VM deleted successfully' })

  } catch (error) {
    console.error('Error deleting VM:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}