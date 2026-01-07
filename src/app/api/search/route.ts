import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { z } from 'zod'

// 搜索请求验证schema
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.enum(['all', 'vms', 'projects']).optional().default('all'),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional()
})

// GET /api/search - 全局搜索
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = searchSchema.parse(queryParams)

    const searchTerm = validatedQuery.query
    const searchType = validatedQuery.type
    const limit = validatedQuery.limit || 20

    const results: any = {
      query: searchTerm,
      results: {}
    }

    // 获取用户可访问的项目ID（用于权限过滤）
    let accessibleProjectIds: string[] = []
    if (user.role !== 'ADMIN') {
      const userProjects = await prisma.projectAssignment.findMany({
        where: { userId: user.id },
        select: { projectId: true }
      })
      accessibleProjectIds = userProjects.map(p => p.projectId)
    }

    // 搜索VM记录
    if (searchType === 'all' || searchType === 'vms') {
      const vmWhere: any = {
        OR: [
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { vmAccount: { contains: searchTerm, mode: 'insensitive' } },
          { vmDomain: { contains: searchTerm, mode: 'insensitive' } },
          { vmInternalIP: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }

      // 应用权限过滤
      if (user.role !== 'ADMIN') {
        vmWhere.projectId = { in: accessibleProjectIds }
      }

      const vms = await prisma.vMRecord.findMany({
        where: vmWhere,
        include: {
          project: {
            select: { id: true, name: true }
          }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })

      results.results.vms = vms.map(vm => ({
        ...vm,
        type: 'vm',
        isExpired: vm.currentExpiryDate < new Date(),
        daysUntilExpiry: Math.ceil((vm.currentExpiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      }))
    }

    // 搜索项目
    if (searchType === 'all' || searchType === 'projects') {
      const projectWhere: any = {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ]
      }

      // 应用权限过滤
      if (user.role !== 'ADMIN') {
        projectWhere.id = { in: accessibleProjectIds }
      }

      const projects = await prisma.project.findMany({
        where: projectWhere,
        include: {
          _count: {
            select: { vms: true }
          }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })

      results.results.projects = projects.map(project => ({
        ...project,
        type: 'project'
      }))
    }

    // 计算总结果数
    const totalResults = Object.values(results.results).reduce((sum: number, items: any) => sum + items.length, 0)

    return NextResponse.json({
      ...results,
      totalResults,
      searchType,
      limit
    })

  } catch (error) {
    console.error('Error performing search:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}