import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface AuditOperation {
  operation: string
  entityType: string
  entityId: string
  changes?: Record<string, any>
  ipAddress?: string
}

export interface AuditFilters {
  startDate?: Date
  endDate?: Date
  operation?: string
  entityType?: string
  userId?: string
  userEmail?: string
}

export class AuditService {
  /**
   * Log an operation to the audit log
   */
  static async logOperation(
    operation: AuditOperation,
    userId?: string,
    userEmail?: string
  ): Promise<void> {
    try {
      // If user info not provided, try to get from session
      let auditUserId = userId
      let auditUserEmail = userEmail

      if (!auditUserId || !auditUserEmail) {
        const session = await getServerSession(authOptions)
        if (session?.user) {
          auditUserId = session.user.id
          auditUserEmail = session.user.email
        }
      }

      // If still no user info, use system user
      if (!auditUserId || !auditUserEmail) {
        auditUserId = 'system'
        auditUserEmail = 'system@internal'
      }

      await prisma.auditLog.create({
        data: {
          operation: operation.operation,
          entityType: operation.entityType,
          entityId: operation.entityId,
          userId: auditUserId,
          userEmail: auditUserEmail,
          changes: operation.changes ? JSON.stringify(operation.changes) : null,
          ipAddress: operation.ipAddress,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      console.error('Failed to log audit operation:', error)
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get audit logs with optional filtering
   */
  static async getAuditLogs(filters: AuditFilters = {}): Promise<any[]> {
    const where: any = {}

    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate
      }
    }

    if (filters.operation) {
      where.operation = {
        contains: filters.operation,
        mode: 'insensitive'
      }
    }

    if (filters.entityType) {
      where.entityType = {
        contains: filters.entityType,
        mode: 'insensitive'
      }
    }

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.userEmail) {
      where.userEmail = {
        contains: filters.userEmail,
        mode: 'insensitive'
      }
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    })
  }

  /**
   * Log VM creation
   */
  static async logVMCreation(vmId: string, vmData: any, userId?: string, userEmail?: string): Promise<void> {
    await this.logOperation({
      operation: 'CREATE',
      entityType: 'VM',
      entityId: vmId,
      changes: {
        created: vmData
      }
    }, userId, userEmail)
  }

  /**
   * Log VM update
   */
  static async logVMUpdate(vmId: string, oldData: any, newData: any, userId?: string, userEmail?: string): Promise<void> {
    const changes: Record<string, any> = {}
    
    // Compare old and new data to track changes
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        }
      }
    }

    await this.logOperation({
      operation: 'UPDATE',
      entityType: 'VM',
      entityId: vmId,
      changes
    }, userId, userEmail)
  }

  /**
   * Log VM deletion
   */
  static async logVMDeletion(vmId: string, vmData: any, userId?: string, userEmail?: string): Promise<void> {
    await this.logOperation({
      operation: 'DELETE',
      entityType: 'VM',
      entityId: vmId,
      changes: {
        deleted: vmData
      }
    }, userId, userEmail)
  }

  /**
   * Log batch VM update with enhanced metadata
   */
  static async logBatchVMUpdate(vmIds: string[], changes: any, userId?: string, userEmail?: string): Promise<void> {
    const batchId = changes.batchId || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    
    // Log individual entries for each VM in the batch
    for (const vmId of vmIds) {
      await this.logOperation({
        operation: 'BATCH_UPDATE',
        entityType: 'VM',
        entityId: vmId,
        changes: {
          ...changes,
          batchId: batchId,
          vmId: vmId
        }
      }, userId, userEmail)
    }

    // Log batch operation metadata
    await this.logOperation({
      operation: 'BATCH_OPERATION',
      entityType: 'VM_BATCH',
      entityId: batchId,
      changes: {
        operation: 'batch_expiry_update',
        batchId: batchId,
        vmCount: vmIds.length,
        vmIds: vmIds,
        ...changes,
        timestamp: new Date()
      }
    }, userId, userEmail)
  }

  /**
   * Log batch operation failure
   */
  static async logBatchOperationFailure(
    operation: string,
    vmIds: string[],
    error: string,
    userId?: string,
    userEmail?: string
  ): Promise<void> {
    const batchId = `failed_batch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    
    await this.logOperation({
      operation: 'BATCH_OPERATION_FAILED',
      entityType: 'VM_BATCH',
      entityId: batchId,
      changes: {
        operation: operation,
        batchId: batchId,
        vmCount: vmIds.length,
        vmIds: vmIds,
        error: error,
        timestamp: new Date()
      }
    }, userId, userEmail)
  }

  /**
   * Get batch operation logs
   */
  static async getBatchOperationLogs(batchId?: string): Promise<any[]> {
    const where: any = {
      OR: [
        { operation: 'BATCH_UPDATE' },
        { operation: 'BATCH_OPERATION' },
        { operation: 'BATCH_OPERATION_FAILED' }
      ]
    }

    if (batchId) {
      where.changes = {
        path: ['batchId'],
        equals: batchId
      }
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      }
    })
  }

  /**
   * Get batch operation summary
   */
  static async getBatchOperationSummary(batchId: string): Promise<any> {
    const logs = await this.getBatchOperationLogs(batchId)
    
    const batchMetadata = logs.find(log => log.operation === 'BATCH_OPERATION')
    const individualLogs = logs.filter(log => log.operation === 'BATCH_UPDATE')
    const failureLogs = logs.filter(log => log.operation === 'BATCH_OPERATION_FAILED')

    return {
      batchId,
      metadata: batchMetadata,
      individualOperations: individualLogs,
      failures: failureLogs,
      totalOperations: individualLogs.length,
      hasFailures: failureLogs.length > 0
    }
  }

  /**
   * Log project creation
   */
  static async logProjectCreation(projectId: string, projectData: any, userId?: string, userEmail?: string): Promise<void> {
    await this.logOperation({
      operation: 'CREATE',
      entityType: 'PROJECT',
      entityId: projectId,
      changes: {
        created: projectData
      }
    }, userId, userEmail)
  }

  /**
   * Log project update
   */
  static async logProjectUpdate(projectId: string, oldData: any, newData: any, userId?: string, userEmail?: string): Promise<void> {
    const changes: Record<string, any> = {}
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        }
      }
    }

    await this.logOperation({
      operation: 'UPDATE',
      entityType: 'PROJECT',
      entityId: projectId,
      changes
    }, userId, userEmail)
  }

  /**
   * Log project deletion
   */
  static async logProjectDeletion(projectId: string, projectData: any, userId?: string, userEmail?: string): Promise<void> {
    await this.logOperation({
      operation: 'DELETE',
      entityType: 'PROJECT',
      entityId: projectId,
      changes: {
        deleted: projectData
      }
    }, userId, userEmail)
  }

  /**
   * Log user assignment to project
   */
  static async logProjectAssignment(userId: string, projectId: string, assignmentData: any, operatorUserId?: string, operatorUserEmail?: string): Promise<void> {
    await this.logOperation({
      operation: 'ASSIGN',
      entityType: 'PROJECT_ASSIGNMENT',
      entityId: `${userId}-${projectId}`,
      changes: {
        assigned: assignmentData
      }
    }, operatorUserId, operatorUserEmail)
  }

  /**
   * Log renewal operation
   */
  static async logVMRenewal(vmId: string, renewalData: any, userId?: string, userEmail?: string): Promise<void> {
    await this.logOperation({
      operation: 'RENEW',
      entityType: 'VM',
      entityId: vmId,
      changes: {
        renewal: renewalData
      }
    }, userId, userEmail)
  }

  /**
   * Log notification sent
   */
  static async logNotificationSent(vmId: string, notificationData: any, userId?: string, userEmail?: string): Promise<void> {
    await this.logOperation({
      operation: 'NOTIFICATION_SENT',
      entityType: 'VM',
      entityId: vmId,
      changes: {
        notification: notificationData
      }
    }, userId, userEmail)
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  static async cleanupOldLogs(daysToKeep: number = 365): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    })
  }
}