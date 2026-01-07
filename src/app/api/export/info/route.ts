import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware'

// GET /api/export/info - Get export information and available options
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Get available export types based on user role
  const availableExports = [
    {
      type: 'vm',
      name: 'VM Records',
      description: 'Export virtual machine records with project and user information',
      permissions: 'All users (filtered by assigned projects for regular users)',
      formats: ['json', 'csv']
    },
    {
      type: 'project',
      name: 'Projects',
      description: 'Export project information with assigned users and VM counts',
      permissions: 'All users (filtered by assigned projects for regular users)',
      formats: ['json', 'csv']
    }
  ]

  // Add audit export for admins
  if (user.role === 'ADMIN') {
    availableExports.push({
      type: 'audit',
      name: 'Audit Logs',
      description: 'Export system audit logs with user actions and changes',
      permissions: 'Administrators only',
      formats: ['json', 'csv']
    })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    availableExports,
    supportedFormats: ['json', 'csv'],
    filterOptions: {
      dateRange: {
        description: 'Filter records by creation/modification date',
        parameters: ['dateFrom', 'dateTo'],
        format: 'ISO 8601 datetime string'
      },
      auditFilters: {
        description: 'Additional filters for audit log exports (admin only)',
        parameters: ['operation', 'entityType', 'userEmail'],
        availableOperations: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'],
        availableEntityTypes: ['VM', 'PROJECT', 'USER', 'AUDIT']
      }
    },
    usage: {
      endpoint: '/api/export',
      method: 'GET',
      requiredParams: ['type'],
      optionalParams: ['format', 'dateFrom', 'dateTo', 'operation', 'entityType', 'userEmail'],
      examples: [
        '/api/export?type=vm&format=csv',
        '/api/export?type=project&format=json&dateFrom=2024-01-01T00:00:00Z',
        '/api/export?type=audit&format=csv&operation=CREATE&dateFrom=2024-01-01T00:00:00Z'
      ]
    }
  })
}