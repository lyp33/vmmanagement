import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { AuditService, AuditFilters } from '@/lib/audit'
import { z } from 'zod'

// Audit log query parameters validation schema
const auditQuerySchema = z.object({
  // Time range filtering
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  
  // Operation filtering
  operation: z.string().optional(),
  entityType: z.string().optional(),
  
  // User filtering
  userId: z.string().optional(),
  userEmail: z.string().optional(),
  
  // Pagination
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 50, 100)).optional(),
  
  // Sorting
  sortBy: z.enum(['timestamp', 'operation', 'entityType', 'userEmail']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

// GET /api/audit - Get audit logs (Admin only)
export async function GET(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdmin(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    const validatedQuery = auditQuerySchema.parse(queryParams)

    // Build audit filters
    const filters: AuditFilters = {}

    if (validatedQuery.startDate) {
      filters.startDate = new Date(validatedQuery.startDate)
    }

    if (validatedQuery.endDate) {
      filters.endDate = new Date(validatedQuery.endDate)
    }

    if (validatedQuery.operation) {
      filters.operation = validatedQuery.operation
    }

    if (validatedQuery.entityType) {
      filters.entityType = validatedQuery.entityType
    }

    if (validatedQuery.userId) {
      filters.userId = validatedQuery.userId
    }

    if (validatedQuery.userEmail) {
      filters.userEmail = validatedQuery.userEmail
    }

    // Get audit logs
    const auditLogs = await AuditService.getAuditLogs(filters)

    // Apply pagination and sorting
    const page = validatedQuery.page || 1
    const limit = validatedQuery.limit || 50
    const sortBy = validatedQuery.sortBy || 'timestamp'
    const sortOrder = validatedQuery.sortOrder || 'desc'

    // Sort the results
    const sortedLogs = auditLogs.sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]

      // Handle date sorting
      if (sortBy === 'timestamp') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // Apply pagination
    const total = sortedLogs.length
    const skip = (page - 1) * limit
    const paginatedLogs = sortedLogs.slice(skip, skip + limit)

    // Format the response
    const formattedLogs = paginatedLogs.map(log => ({
      id: log.id,
      operation: log.operation,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      userEmail: log.userEmail,
      user: log.user ? {
        name: log.user.name,
        email: log.user.email,
        role: log.user.role
      } : null,
      changes: log.changes ? JSON.parse(log.changes) : null,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress
    }))

    return NextResponse.json({
      data: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        applied: Object.keys(queryParams).length > 0 ? queryParams : null,
        available: {
          startDate: 'Filter logs after this date (ISO format)',
          endDate: 'Filter logs before this date (ISO format)',
          operation: 'Filter by operation type (CREATE, UPDATE, DELETE, etc.)',
          entityType: 'Filter by entity type (VM, PROJECT, etc.)',
          userId: 'Filter by specific user ID',
          userEmail: 'Filter by user email (partial match)',
          sortBy: 'Sort by field (timestamp, operation, entityType, userEmail)',
          sortOrder: 'Sort order (asc, desc)'
        }
      },
      summary: {
        totalLogs: total,
        dateRange: {
          earliest: sortedLogs.length > 0 ? sortedLogs[sortedLogs.length - 1].timestamp : null,
          latest: sortedLogs.length > 0 ? sortedLogs[0].timestamp : null
        },
        operationTypes: [...new Set(sortedLogs.map(log => log.operation))],
        entityTypes: [...new Set(sortedLogs.map(log => log.entityType))],
        uniqueUsers: [...new Set(sortedLogs.map(log => log.userEmail))]
      }
    })

  } catch (error) {
    console.error('Error fetching audit logs:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}