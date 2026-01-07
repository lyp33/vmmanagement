import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware'

// GET /api/filters/suggestions - 获取筛选建议
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    // 获取用户可访问的项目ID（用于权限过滤）
    let accessibleProjectIds: string[] = []
    if (user.role !== 'ADMIN') {
      const userProjects = await prisma.projectAssignment.findMany({
        where: { userId: user.id },
        select: { projectId: true }
      })
      accessibleProjectIds = userProjects.map((p: any) => p.projectId)
    }

    // 构建基础查询条件
    const baseWhere = user.role === 'ADMIN' ? {} : { projectId: { in: accessibleProjectIds } }

    // 获取可用的项目选项
    const projectWhere = user.role === 'ADMIN' ? {} : { id: { in: accessibleProjectIds } }
    const projects = await prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    })

    // 获取唯一的邮箱域名（用于邮箱筛选建议）
    const vms = await prisma.vMRecord.findMany({
      where: baseWhere,
      select: { email: true, vmDomain: true, vmAccount: true }
    })

    const emailDomains = [...new Set(vms.map((vm: any) => vm.email.split('@')[1]).filter(Boolean))]
    const vmDomains = [...new Set(vms.map((vm: any) => vm.vmDomain).filter(Boolean))]
    const vmAccounts = [...new Set(vms.map((vm: any) => vm.vmAccount).filter(Boolean))]

    // 获取到期时间范围
    const expiryStats = await prisma.vMRecord.aggregate({
      where: baseWhere,
      _min: { currentExpiryDate: true },
      _max: { currentExpiryDate: true }
    })

    // 获取创建时间范围
    const creationStats = await prisma.vMRecord.aggregate({
      where: baseWhere,
      _min: { createdAt: true },
      _max: { createdAt: true }
    })

    // 计算即将到期的VM数量（不同天数范围）
    const now = new Date()
    const expiryRanges = [7, 14, 30, 60, 90]
    const expiringCounts = await Promise.all(
      expiryRanges.map(async (days) => {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + days)
        
        const count = await prisma.vMRecord.count({
          where: {
            ...baseWhere,
            currentExpiryDate: {
              gte: now,
              lte: futureDate
            }
          }
        })
        
        return { days, count }
      })
    )

    return NextResponse.json({
      projects: projects.map((p: any) => ({ value: p.id, label: p.name })),
      emailDomains: emailDomains.slice(0, 20).map(domain => ({ value: domain, label: `@${domain}` })),
      vmDomains: vmDomains.slice(0, 20).map(domain => ({ value: domain, label: domain })),
      vmAccounts: vmAccounts.slice(0, 20).map(account => ({ value: account, label: account })),
      dateRanges: {
        expiry: {
          min: expiryStats._min.currentExpiryDate,
          max: expiryStats._max.currentExpiryDate
        },
        creation: {
          min: creationStats._min.createdAt,
          max: creationStats._max.createdAt
        }
      },
      expiringCounts,
      commonFilters: [
        {
          name: 'Expiring Soon',
          description: 'VMs expiring within 7 days',
          filter: { expiringInDays: 7 }
        },
        {
          name: 'Expiring This Month',
          description: 'VMs expiring within 30 days',
          filter: { expiringInDays: 30 }
        },
        {
          name: 'Recently Created',
          description: 'VMs created in the last 7 days',
          filter: { 
            createdDateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        },
        {
          name: 'Expired',
          description: 'VMs that have already expired',
          filter: { 
            expiryDateTo: new Date().toISOString()
          }
        }
      ],
      sortOptions: [
        { value: 'createdAt', label: 'Creation Date' },
        { value: 'currentExpiryDate', label: 'Expiry Date' },
        { value: 'email', label: 'Email' },
        { value: 'vmAccount', label: 'VM Account' }
      ]
    })

  } catch (error) {
    console.error('Error fetching filter suggestions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}