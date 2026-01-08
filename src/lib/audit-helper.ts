import { storage } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Get current user for audit logging
 * Returns system user if no session found
 */
export async function getCurrentUserForAudit() {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.email) {
      const user = await storage.findUserByEmail(session.user.email)
      if (user) {
        return { userId: user.id, userEmail: user.email }
      }
    }
  } catch (error) {
    console.error('Failed to get current user for audit:', error)
  }
  return { userId: 'system', userEmail: 'system@internal' }
}

/**
 * Safely create audit log without breaking main operation
 * Logs errors but doesn't throw
 */
export async function safeCreateAuditLog(logData: {
  operation: string
  entityType: string
  entityId: string
  userId: string
  userEmail: string
  changes?: Record<string, any>
}) {
  try {
    console.log('Creating audit log:', logData)
    const result = await storage.createAuditLog(logData)
    console.log('Audit log created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Failed to create audit log:', error)
    console.error('Audit log data:', logData)
    // Don't throw - audit failure shouldn't break main operation
  }
}
