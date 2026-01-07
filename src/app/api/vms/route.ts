import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { AuditService } from '@/lib/audit'
import { validation } from '@/lib/validation'
import { ErrorHandler, createError, asyncHandler } from '@/lib/error-handling'



// GET /api/vms - 获取VM列表
export const GET = asyncHandler(async (request: NextRequest) => {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    throw createError.authentication()
  }

  const { searchParams } = new URL(request.url)
  const validation_result = validation.helpers.validateQueryParams(searchParams, validation.vm.query)
  
  if (!validation_result.success) {
    throw createError.validation(validation_result.error, validation_result.details)
  }

  const validatedQuery = validation_result.data

  // 构建查询条件
  const where: any = {}

  // 权限过滤：普通用户只能看到自己项目的VM
  if (user.role !== 'ADMIN') {
    const userProjects = await prisma.projectAssignment.findMany({
      where: { userId: user.id },
      select: { projectId: true }
    })
    const projectIds = userProjects.map((p: any) => p.projectId)
    where.projectId = { in: projectIds }
  }

  // 项目筛选
  if (validatedQuery.projectId) {
    // 检查用户是否有权限访问该项目
    if (user.role !== 'ADMIN') {
      const hasAccess = await prisma.projectAssignment.findFirst({
        where: { userId: user.id, projectId: validatedQuery.projectId }
      })
      if (!hasAccess) {
        throw createError.projectAccessDenied()
      }
    }
    where.projectId = validatedQuery.projectId
  }

  if (validatedQuery.projectName) {
    where.project = {
      name: { contains: validatedQuery.projectName, mode: 'insensitive' }
    }
  }

  // VM信息筛选
  if (validatedQuery.email) {
    where.email = { contains: validatedQuery.email, mode: 'insensitive' }
  }

  if (validatedQuery.vmAccount) {
    where.vmAccount = { contains: validatedQuery.vmAccount, mode: 'insensitive' }
  }

  if (validatedQuery.vmDomain) {
    where.vmDomain = { contains: validatedQuery.vmDomain, mode: 'insensitive' }
  }

  if (validatedQuery.vmInternalIP) {
    where.vmInternalIP = { contains: validatedQuery.vmInternalIP, mode: 'insensitive' }
  }

  // 到期时间筛选
  if (validatedQuery.expiryDateFrom || validatedQuery.expiryDateTo || validatedQuery.expiringInDays) {
    where.currentExpiryDate = {}
    
    if (validatedQuery.expiryDateFrom) {
      where.currentExpiryDate.gte = new Date(validatedQuery.expiryDateFrom)
    }
    
    if (validatedQuery.expiryDateTo) {
      where.currentExpiryDate.lte = new Date(validatedQuery.expiryDateTo)
    }
    
    if (validatedQuery.expiringInDays) {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + validatedQuery.expiringInDays)
      where.currentExpiryDate.lte = futureDate
      where.currentExpiryDate.gte = new Date() // 确保不包括已过期的
    }
  }

  // 创建时间筛选
  if (validatedQuery.createdDateFrom || validatedQuery.createdDateTo) {
    where.createdAt = {}
    if (validatedQuery.createdDateFrom) {
      where.createdAt.gte = new Date(validatedQuery.createdDateFrom)
    }
    if (validatedQuery.createdDateTo) {
      where.createdAt.lte = new Date(validatedQuery.createdDateTo)
    }
  }

  // 全文搜索（在多个字段中搜索）
  if (validatedQuery.search) {
    const searchTerm = validatedQuery.search
    where.OR = [
      { email: { contains: searchTerm, mode: 'insensitive' } },
      { vmAccount: { contains: searchTerm, mode: 'insensitive' } },
      { vmDomain: { contains: searchTerm, mode: 'insensitive' } },
      { vmInternalIP: { contains: searchTerm, mode: 'insensitive' } },
      { project: { name: { contains: searchTerm, mode: 'insensitive' } } }
    ]
  }

  // 排序设置
  const sortBy = validatedQuery.sortBy || 'createdAt'
  const sortOrder = validatedQuery.sortOrder || 'desc'
  const orderBy: any = {}
  
  orderBy[sortBy] = sortOrder

  // 分页参数
  const page = validatedQuery.page || 1
  const limit = validatedQuery.limit || 10
  const skip = (page - 1) * limit

  // 查询VM记录
  const [vms, total] = await Promise.all([
    prisma.vMRecord.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: orderBy,
      skip,
      take: limit
    }),
    prisma.vMRecord.count({ where })
  ])

  // 添加过期状态信息
  const enrichedVMs = vms.map((vm: any) => ({
    ...vm,
    isExpired: vm.currentExpiryDate < new Date(),
    daysUntilExpiry: Math.ceil((vm.currentExpiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  }))

  return NextResponse.json({
    data: enrichedVMs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    filters: {
      applied: Object.keys(Object.fromEntries(searchParams.entries())).length > 0 ? Object.fromEntries(searchParams.entries()) : null,
      available: {
        projectId: 'Filter by specific project ID',
        projectName: 'Filter by project name (partial match)',
        email: 'Filter by email (partial match)',
        vmAccount: 'Filter by VM account (partial match)',
        vmDomain: 'Filter by VM domain (partial match)',
        vmInternalIP: 'Filter by VM internal IP (partial match)',
        expiryDateFrom: 'Filter VMs expiring after this date',
        expiryDateTo: 'Filter VMs expiring before this date',
        expiringInDays: 'Filter VMs expiring within N days',
        createdDateFrom: 'Filter VMs created after this date',
        createdDateTo: 'Filter VMs created before this date',
        search: 'Search across multiple fields',
        sortBy: 'Sort by field (createdAt, currentExpiryDate, email, vmAccount)',
        sortOrder: 'Sort order (asc, desc)'
      }
    }
  })
})

// POST /api/vms - 创建新VM记录
export const POST = asyncHandler(async (request: NextRequest) => {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    throw createError.authentication()
  }

  const validation_result = await validation.helpers.validateRequestBody(request, validation.vm.create)
  
  if (!validation_result.success) {
    throw createError.validation(validation_result.error, validation_result.details)
  }

  const validatedData = validation_result.data

  // 检查项目是否存在
  const project = await prisma.project.findUnique({
    where: { id: validatedData.projectId }
  })
  if (!project) {
    throw createError.projectNotFound()
  }

  // 检查用户是否有权限访问该项目
  if (user.role !== 'ADMIN') {
    const hasAccess = await prisma.projectAssignment.findFirst({
      where: { userId: user.id, projectId: validatedData.projectId }
    })
    if (!hasAccess) {
      throw createError.projectAccessDenied()
    }
  }

  // 验证到期时间必须是未来时间
  const expiryDate = new Date(validatedData.currentExpiryDate)
  if (expiryDate <= new Date()) {
    throw createError.expiryDateInPast()
  }

  // 创建VM记录
  const vm = await prisma.vMRecord.create({
    data: {
      email: validatedData.email,
      vmAccount: validatedData.vmAccount,
      vmInternalIP: validatedData.vmInternalIP,
      vmDomain: validatedData.vmDomain,
      currentExpiryDate: expiryDate,
      lastExpiryDate: validatedData.lastExpiryDate ? new Date(validatedData.lastExpiryDate) : null,
      projectId: validatedData.projectId,
      createdBy: user.id
    },
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
  await AuditService.logVMCreation(
    vm.id,
    validatedData,
    user.id,
    user.email
  )

  return NextResponse.json(vm, { status: 201 })
})