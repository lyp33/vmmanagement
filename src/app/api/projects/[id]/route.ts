import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

// 项目更新请求验证schema
const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Project name too long').optional(),
  description: z.string().optional()
})



// 检查用户是否有权限访问项目
async function checkProjectAccess(projectId: string, userId: string, isAdmin: boolean) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: {
        select: { vms: true }
      }
    }
  })

  if (!project) {
    return { hasAccess: false, project: null, error: 'Project not found' }
  }

  if (isAdmin) {
    return { hasAccess: true, project, error: null }
  }

  // 检查普通用户是否被分配到该项目
  const hasAccess = await prisma.projectAssignment.findFirst({
    where: { userId, projectId }
  })

  if (!hasAccess) {
    return { hasAccess: false, project: null, error: 'Access denied to this project' }
  }

  return { hasAccess: true, project, error: null }
}

// GET /api/projects/[id] - 获取单个项目详情
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
    const projectId = id
    const { hasAccess, project, error } = await checkProjectAccess(projectId, user.id, user.role === 'ADMIN')

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'Project not found' ? 404 : 403 }
      )
    }

    // 获取完整的项目信息
    const fullProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: { vms: true }
        },
        userAssignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        vms: {
          select: {
            id: true,
            email: true,
            vmAccount: true,
            currentExpiryDate: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // 只返回最近的10个VM
        }
      }
    })

    return NextResponse.json(fullProject)

  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
// PUT /api/projects/[id] - 更新项目信息（仅管理员）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { id } = await params
    const projectId = id
    const body = await request.json()
    const validatedData = updateProjectSchema.parse(body)

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId }
    })
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 如果要更新名称，检查新名称是否已存在
    if (validatedData.name && validatedData.name !== existingProject.name) {
      const nameExists = await prisma.project.findUnique({
        where: { name: validatedData.name }
      })
      if (nameExists) {
        return NextResponse.json({ error: 'Project name already exists' }, { status: 409 })
      }
    }

    // 更新项目
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: validatedData,
      include: {
        _count: {
          select: { vms: true }
        }
      }
    })

    // 记录审计日志
    await AuditService.logProjectUpdate(
      projectId,
      existingProject,
      validatedData,
      user.id,
      user.email
    )

    return NextResponse.json(updatedProject)

  } catch (error) {
    console.error('Error updating project:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[id] - 删除项目（仅管理员）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { id } = await params
    const projectId = id

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: { vms: true }
        }
      }
    })
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 检查项目下是否还有VM记录
    if (existingProject._count.vms > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete project with associated VMs',
          vmCount: existingProject._count.vms
        },
        { status: 409 }
      )
    }

    // 删除项目（级联删除用户分配）
    await prisma.project.delete({
      where: { id: projectId }
    })

    // 记录审计日志
    await AuditService.logProjectDeletion(
      projectId,
      existingProject,
      user.id,
      user.email
    )

    return NextResponse.json({ message: 'Project deleted successfully' })

  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}