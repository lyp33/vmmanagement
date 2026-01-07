import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'

// 批量操作查询参数验证schema
const batchQuerySchema = z.object({
  batchId: z.string().optional(),
  limit: z.string().transform(val => parseInt(val)).optional(),
  offset: z.string().transform(val => parseInt(val)).optional()
})

// GET /api/audit/batch - 获取批量操作审计日志（仅管理员）
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 只有管理员可以访问审计日志
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedParams = batchQuerySchema.parse(queryParams)

    if (validatedParams.batchId) {
      // 获取特定批量操作的详细信息
      const batchSummary = await AuditService.getBatchOperationSummary(validatedParams.batchId)
      return NextResponse.json(batchSummary)
    } else {
      // 获取所有批量操作日志
      const batchLogs = await AuditService.getBatchOperationLogs()
      
      // 应用分页
      const limit = validatedParams.limit || 50
      const offset = validatedParams.offset || 0
      const paginatedLogs = batchLogs.slice(offset, offset + limit)

      return NextResponse.json({
        logs: paginatedLogs,
        pagination: {
          total: batchLogs.length,
          limit,
          offset,
          hasMore: offset + limit < batchLogs.length
        }
      })
    }

  } catch (error) {
    console.error('Error fetching batch audit logs:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}