import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

// 用户分配请求验证schema
const assignUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  action: z.enum(['assign', 'unassign'])
})



// POST /api/projects/[id]/assign - 分配或取消分配用户到项目（仅管理员）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const currentUser = await getCurrentUser(request)
  if (!currentUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { id } = await params
    const projectId = id
    const body = await request.json()
    const validatedData = assignUserSchema.parse(body)

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (validatedData.action === 'assign') {
      // 检查是否已经分配
      const existingAssignment = await prisma.projectAssignment.findUnique({
        where: {
          userId_projectId: {
            userId: validatedData.userId,
            projectId: projectId
          }
        }
      })

      if (existingAssignment) {
        return NextResponse.json({ error: 'User is already assigned to this project' }, { status: 409 })
      }

      // 创建分配
      const assignment = await prisma.projectAssignment.create({
        data: {
          userId: validatedData.userId,
          projectId: projectId
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          project: {
            select: { id: true, name: true }
          }
        }
      })

      // 记录审计日志
      await AuditService.logProjectAssignment(
        validatedData.userId,
        projectId,
        { assignedUserId: validatedData.userId, assignedUserEmail: user.email },
        currentUser.id,
        currentUser.email
      )

      return NextResponse.json({
        message: 'User assigned to project successfully',
        assignment
      }, { status: 201 })

    } else { // unassign
      // 检查分配是否存在
      const existingAssignment = await prisma.projectAssignment.findUnique({
        where: {
          userId_projectId: {
            userId: validatedData.userId,
            projectId: projectId
          }
        }
      })

      if (!existingAssignment) {
        return NextResponse.json({ error: 'User is not assigned to this project' }, { status: 404 })
      }

      // 删除分配
      await prisma.projectAssignment.delete({
        where: {
          userId_projectId: {
            userId: validatedData.userId,
            projectId: projectId
          }
        }
      })

      // 记录审计日志
      await AuditService.logOperation(
        {
          operation: 'UNASSIGN_USER',
          entityType: 'PROJECT',
          entityId: projectId,
          changes: { unassignedUserId: validatedData.userId, unassignedUserEmail: user.email }
        },
        currentUser.id,
        currentUser.email
      )

      return NextResponse.json({
        message: 'User unassigned from project successfully'
      })
    }

  } catch (error) {
    console.error('Error managing user assignment:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/projects/[id]/assign - 获取项目的用户分配列表（仅管理员）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const { id } = await params
    const projectId = id

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 获取项目的用户分配
    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { assignedAt: 'desc' }
    })

    return NextResponse.json({
      project: { id: project.id, name: project.name },
      assignments
    })

  } catch (error) {
    console.error('Error fetching project assignments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}