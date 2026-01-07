import { prisma } from '@/lib/prisma'

// Define UserRole type since we don't use Prisma
type UserRole = 'ADMIN' | 'USER'

export interface ExportOptions {
  format: 'json' | 'csv'
  includeDeleted?: boolean
  dateRange?: {
    from: Date
    to: Date
  }
}

export interface VMExportData {
  id: string
  email: string
  vmAccount: string
  vmInternalIP: string
  vmDomain: string
  createdAt: Date
  lastExpiryDate: Date | null
  currentExpiryDate: Date
  projectId: string
  projectName: string
  createdBy: string
  creatorName: string
  creatorEmail: string
  updatedAt: Date
  isExpired: boolean
  daysUntilExpiry: number
}

export interface ProjectExportData {
  id: string
  name: string
  description: string | null
  createdAt: Date
  updatedAt: Date
  vmCount: number
  assignedUsers: Array<{
    userId: string
    userName: string
    userEmail: string
    assignedAt: Date
  }>
}

export interface AuditLogExportData {
  id: string
  operation: string
  entityType: string
  entityId: string
  userId: string
  userEmail: string
  userName: string
  userRole: string
  changes: any
  timestamp: Date
  ipAddress: string | null
}

export class ExportService {
  /**
   * Export VM data with user permission filtering
   */
  static async exportVMData(
    userId: string,
    userRole: UserRole,
    options: ExportOptions = { format: 'json' }
  ): Promise<VMExportData[]> {
    // Build query conditions
    const where: any = {}

    // Apply user permission filtering
    if (userRole !== 'ADMIN') {
      const userProjects = await prisma.projectAssignment.findMany({
        where: { userId },
        select: { projectId: true }
      })
      const projectIds = userProjects.map(p => p.projectId)
      where.projectId = { in: projectIds }
    }

    // Apply date range filtering if specified
    if (options.dateRange) {
      where.createdAt = {
        gte: options.dateRange.from,
        lte: options.dateRange.to
      }
    }

    const vms = await prisma.vMRecord.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform data for export
    return vms.map(vm => {
      const now = new Date()
      const daysUntilExpiry = Math.ceil(
        (vm.currentExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      return {
        id: vm.id,
        email: vm.email,
        vmAccount: vm.vmAccount,
        vmInternalIP: vm.vmInternalIP,
        vmDomain: vm.vmDomain,
        createdAt: vm.createdAt,
        lastExpiryDate: vm.lastExpiryDate,
        currentExpiryDate: vm.currentExpiryDate,
        projectId: vm.projectId,
        projectName: vm.project.name,
        createdBy: vm.createdBy,
        creatorName: vm.creator.name,
        creatorEmail: vm.creator.email,
        updatedAt: vm.updatedAt,
        isExpired: vm.currentExpiryDate < now,
        daysUntilExpiry
      }
    })
  }

  /**
   * Export project data (admin only or user's assigned projects)
   */
  static async exportProjectData(
    userId: string,
    userRole: UserRole,
    options: ExportOptions = { format: 'json' }
  ): Promise<ProjectExportData[]> {
    let projects

    if (userRole === 'ADMIN') {
      // Admin can export all projects
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
      // Regular users can only export their assigned projects
      const userAssignments = await prisma.projectAssignment.findMany({
        where: { userId },
        include: {
          project: {
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
            }
          }
        }
      })
      projects = userAssignments.map(assignment => assignment.project)
    }

    // Transform data for export
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      vmCount: project._count.vms,
      assignedUsers: project.userAssignments.map(assignment => ({
        userId: assignment.user.id,
        userName: assignment.user.name,
        userEmail: assignment.user.email,
        assignedAt: assignment.assignedAt
      }))
    }))
  }

  /**
   * Export audit log data (admin only)
   */
  static async exportAuditLogData(
    options: ExportOptions & {
      operation?: string
      entityType?: string
      userEmail?: string
    } = { format: 'json' }
  ): Promise<AuditLogExportData[]> {
    const where: any = {}

    // Apply date range filtering if specified
    if (options.dateRange) {
      where.timestamp = {
        gte: options.dateRange.from,
        lte: options.dateRange.to
      }
    }

    // Apply operation filtering
    if (options.operation) {
      where.operation = options.operation
    }

    // Apply entity type filtering
    if (options.entityType) {
      where.entityType = options.entityType
    }

    // Apply user email filtering
    if (options.userEmail) {
      where.userEmail = {
        contains: options.userEmail,
        mode: 'insensitive'
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { name: true, role: true }
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    // Transform data for export
    return auditLogs.map(log => ({
      id: log.id,
      operation: log.operation,
      entityType: log.entityType,
      entityId: log.entityId,
      userId: log.userId,
      userEmail: log.userEmail,
      userName: log.user.name,
      userRole: log.user.role,
      changes: log.changes ? JSON.parse(log.changes) : null,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress
    }))
  }

  /**
   * Convert data to CSV format
   */
  static convertToCSV(data: any[]): string {
    if (data.length === 0) return ''

    // Get headers from the first object
    const headers = Object.keys(data[0])
    
    // Create CSV content
    const csvContent = [
      // Header row
      headers.join(','),
      // Data rows
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Handle null/undefined values
          if (value === null || value === undefined) return ''
          // Handle objects and arrays
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
          // Handle strings with commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value)
        }).join(',')
      )
    ].join('\n')

    return csvContent
  }

  /**
   * Generate filename for export
   */
  static generateFilename(type: 'vm' | 'project' | 'audit', format: 'json' | 'csv'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    return `${type}-export-${timestamp}.${format}`
  }

  /**
   * Validate export permissions
   */
  static validateExportPermissions(
    exportType: 'vm' | 'project' | 'audit',
    userRole: UserRole
  ): { allowed: boolean; reason?: string } {
    switch (exportType) {
      case 'vm':
      case 'project':
        // All authenticated users can export VM and project data (filtered by permissions)
        return { allowed: true }
      
      case 'audit':
        // Only admins can export audit logs
        if (userRole !== 'ADMIN') {
          return { 
            allowed: false, 
            reason: 'Audit log export is restricted to administrators only' 
          }
        }
        return { allowed: true }
      
      default:
        return { 
          allowed: false, 
          reason: 'Invalid export type' 
        }
    }
  }
}