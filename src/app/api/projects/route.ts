import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { AuditService } from '@/lib/audit'
import { validation } from '@/lib/validation'
import { ErrorHandler, createError, asyncHandler } from '@/lib/error-handling'



// GET /api/projects - 获取项目列表
export const GET = asyncHandler(async (request: NextRequest) => {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    throw createError.authentication()
  }

  let projects

  if (user.role === 'ADMIN') {
    // 管理员可以看到所有项目
    projects = await prisma.project.findMany({
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
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } else {
    // 普通用户只能看到自己被分配的项目
    const userAssignments = await prisma.projectAssignment.findMany({
      where: { userId: user.id },
      include: {
        project: {
          include: {
            _count: {
              select: { vms: true }
            }
          }
        }
      }
    })
    projects = userAssignments.map((assignment: any) => assignment.project)
  }

  return NextResponse.json(projects)
})
// POST /api/projects - 创建新项目（仅管理员）
export const POST = asyncHandler(async (request: NextRequest) => {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    throw createError.authentication()
  }

  const validation_result = await validation.helpers.validateRequestBody(request, validation.project.create)
  
  if (!validation_result.success) {
    throw createError.validation(validation_result.error, validation_result.details)
  }

  const validatedData = validation_result.data

  // 检查项目名称是否已存在
  const existingProject = await prisma.project.findUnique({
    where: { name: validatedData.name }
  })
  if (existingProject) {
    throw createError.conflict('项目名称已存在')
  }

  // 创建项目
  const project = await prisma.project.create({
    data: {
      name: validatedData.name,
      description: validatedData.description
    },
    include: {
      _count: {
        select: { vms: true }
      }
    }
  })

  // 记录审计日志
  await AuditService.logProjectCreation(
    project.id,
    validatedData,
    user.id,
    user.email
  )

  return NextResponse.json(project, { status: 201 })
})