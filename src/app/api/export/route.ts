import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware'
import { ExportService, ExportOptions } from '@/lib/export'
import { AuditService } from '@/lib/audit'
import { z } from 'zod'
import { createError, asyncHandler } from '@/lib/error-handling'

// Export query parameters validation schema
const exportQuerySchema = z.object({
  type: z.enum(['vm', 'project', 'audit']),
  format: z.enum(['json', 'csv']).default('json'),
  
  // Date range filtering
  dateFrom: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  }),
  dateTo: z.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Invalid date format"
  }),
  
  // Audit-specific filters
  operation: z.string().optional(),
  entityType: z.string().optional(),
  userEmail: z.string().optional(),
  
  // Options
  includeDeleted: z.string().transform(val => val === 'true').optional()
})

// GET /api/export - Export data based on type and user permissions
export const GET = asyncHandler(async (request: NextRequest) => {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    throw createError.authentication()
  }

  const { searchParams } = new URL(request.url)
  const queryParams = Object.fromEntries(searchParams.entries())
  
  let validatedQuery
  try {
    validatedQuery = exportQuerySchema.parse(queryParams)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError.validation('Invalid export parameters', error.issues)
    }
    throw error
  }

  // Validate export permissions
  const permissionCheck = ExportService.validateExportPermissions(
    validatedQuery.type,
    user.role
  )
  
  if (!permissionCheck.allowed) {
    throw createError.authorization(permissionCheck.reason)
  }

  // Build export options
  const options: ExportOptions & {
    operation?: string
    entityType?: string
    userEmail?: string
  } = {
    format: validatedQuery.format,
    includeDeleted: validatedQuery.includeDeleted
  }

  if (validatedQuery.dateFrom || validatedQuery.dateTo) {
    options.dateRange = {
      from: validatedQuery.dateFrom ? new Date(validatedQuery.dateFrom) : new Date(0),
      to: validatedQuery.dateTo ? new Date(validatedQuery.dateTo) : new Date()
    }
  }

  // Add audit-specific filters
  if (validatedQuery.operation) options.operation = validatedQuery.operation
  if (validatedQuery.entityType) options.entityType = validatedQuery.entityType
  if (validatedQuery.userEmail) options.userEmail = validatedQuery.userEmail

  let exportData: any[]
  let filename: string

  try {
    // Export data based on type
    switch (validatedQuery.type) {
      case 'vm':
        exportData = await ExportService.exportVMData(user.id, user.role, options)
        filename = ExportService.generateFilename('vm', validatedQuery.format)
        break
      
      case 'project':
        exportData = await ExportService.exportProjectData(user.id, user.role, options)
        filename = ExportService.generateFilename('project', validatedQuery.format)
        break
      
      case 'audit':
        exportData = await ExportService.exportAuditLogData(options)
        filename = ExportService.generateFilename('audit', validatedQuery.format)
        break
      
      default:
        throw createError.validation('Invalid export type')
    }

    // Log the export operation
    await AuditService.logOperation({
      operation: 'EXPORT',
      entityType: validatedQuery.type.toUpperCase(),
      entityId: 'bulk',
      changes: {
        exportType: validatedQuery.type,
        format: validatedQuery.format,
        recordCount: exportData.length,
        filters: {
          dateRange: options.dateRange,
          operation: options.operation,
          entityType: options.entityType,
          userEmail: options.userEmail
        }
      }
    }, user.id, user.email)

    // Format response based on requested format
    if (validatedQuery.format === 'csv') {
      const csvContent = ExportService.convertToCSV(exportData)
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    } else {
      // JSON format
      const jsonContent = JSON.stringify({
        exportInfo: {
          type: validatedQuery.type,
          format: validatedQuery.format,
          exportedAt: new Date().toISOString(),
          exportedBy: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          recordCount: exportData.length,
          filters: options
        },
        data: exportData
      }, null, 2)

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

  } catch (error) {
    console.error('Export error:', error)
    throw createError.internalError('Failed to export data')
  }
})

