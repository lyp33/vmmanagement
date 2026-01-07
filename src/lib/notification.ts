import { prisma } from './prisma';
import { emailService, VMExpiryEmailData } from './email';
import { AuditService } from './audit';

export interface NotificationResult {
  success: boolean;
  vmId: string;
  recipientEmail: string;
  error?: string;
  messageId?: string;
}

export interface ExpiryCheckResult {
  totalVMs: number;
  expiringVMs: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: string[];
}

export class NotificationService {
  private static instance: NotificationService;
  private readonly EXPIRY_WARNING_DAYS = 7;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY_MS = 5000; // 5 seconds

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check for VMs expiring in 7 days and send notifications
   */
  async checkExpiringVMs(): Promise<ExpiryCheckResult> {
    const result: ExpiryCheckResult = {
      totalVMs: 0,
      expiringVMs: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      errors: []
    };

    try {
      // Calculate the target date (7 days from now)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + this.EXPIRY_WARNING_DAYS);
      
      // Set to start of day for comparison
      const startOfTargetDay = new Date(targetDate);
      startOfTargetDay.setHours(0, 0, 0, 0);
      
      // Set to end of day for comparison
      const endOfTargetDay = new Date(targetDate);
      endOfTargetDay.setHours(23, 59, 59, 999);

      // Get all VMs
      const totalVMs = await prisma.vMRecord.count();
      result.totalVMs = totalVMs;

      // Find VMs expiring exactly 7 days from now
      const expiringVMs = await prisma.vMRecord.findMany({
        where: {
          currentExpiryDate: {
            gte: startOfTargetDay,
            lte: endOfTargetDay
          }
        },
        include: {
          project: true
        }
      });

      result.expiringVMs = expiringVMs.length;

      // Process each expiring VM
      for (const vm of expiringVMs) {
        try {
          // Check if notification was already sent today
          const existingNotification = await this.checkExistingNotification(vm.id);
          if (existingNotification) {
            continue; // Skip if already notified today
          }

          // Send notification
          const notificationResult = await this.sendExpiryNotification(vm);
          
          if (notificationResult.success) {
            result.notificationsSent++;
          } else {
            result.notificationsFailed++;
            if (notificationResult.error) {
              result.errors.push(`VM ${vm.vmAccount}: ${notificationResult.error}`);
            }
          }
        } catch (error) {
          result.notificationsFailed++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`VM ${vm.vmAccount}: ${errorMessage}`);
        }
      }

      // Log the expiry check operation
      await AuditService.logOperation({
        operation: 'EXPIRY_CHECK',
        entityType: 'SYSTEM',
        entityId: 'expiry-check',
        changes: {
          totalVMs: result.totalVMs,
          expiringVMs: result.expiringVMs,
          notificationsSent: result.notificationsSent,
          notificationsFailed: result.notificationsFailed,
          targetDate: targetDate.toISOString()
        }
      }, 'system', 'system@vm-expiry-management');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`System error: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Send expiry notification for a specific VM
   */
  async sendExpiryNotification(vm: any): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: false,
      vmId: vm.id,
      recipientEmail: vm.email
    };

    try {
      // Prepare email data
      const emailData: VMExpiryEmailData = {
        vmAccount: vm.vmAccount,
        vmDomain: vm.vmDomain,
        vmInternalIP: vm.vmInternalIP,
        currentExpiryDate: vm.currentExpiryDate,
        projectName: vm.project.name,
        recipientEmail: vm.email
      };

      // Send email with retry mechanism
      const emailResult = await this.sendEmailWithRetry(emailData);
      
      if (emailResult.success) {
        result.success = true;
        result.messageId = emailResult.messageId;

        // Log successful notification
        await this.logNotification(vm.id, vm.email, 'SENT', emailResult.messageId);
        
        // Log audit entry
        await AuditService.logOperation({
          operation: 'NOTIFICATION_SENT',
          entityType: 'VM',
          entityId: vm.id,
          changes: {
            recipientEmail: vm.email,
            expiryDate: vm.currentExpiryDate.toISOString(),
            messageId: emailResult.messageId
          }
        }, 'system', 'system@vm-expiry-management');
      } else {
        result.error = emailResult.error;
        
        // Log failed notification
        await this.logNotification(vm.id, vm.email, 'FAILED', undefined, emailResult.error);
        
        // Log audit entry for failure
        await AuditService.logOperation({
          operation: 'NOTIFICATION_FAILED',
          entityType: 'VM',
          entityId: vm.id,
          changes: {
            recipientEmail: vm.email,
            error: emailResult.error,
            expiryDate: vm.currentExpiryDate.toISOString()
          }
        }, 'system', 'system@vm-expiry-management');
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed notification
      await this.logNotification(vm.id, vm.email, 'FAILED', undefined, result.error);
    }

    return result;
  }

  /**
   * Send email with retry mechanism
   */
  private async sendEmailWithRetry(emailData: VMExpiryEmailData, retryCount = 0): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await emailService.sendExpiryNotification(emailData);
      
      if (!result.success && retryCount < this.MAX_RETRY_COUNT) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
        return this.sendEmailWithRetry(emailData, retryCount + 1);
      }
      
      return result;
    } catch (error) {
      if (retryCount < this.MAX_RETRY_COUNT) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
        return this.sendEmailWithRetry(emailData, retryCount + 1);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log notification status to database
   */
  private async logNotification(
    vmId: string, 
    recipientEmail: string, 
    status: 'PENDING' | 'SENT' | 'FAILED',
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.notificationLog.create({
        data: {
          vmId,
          recipientEmail,
          status,
          sentAt: status === 'SENT' ? new Date() : null,
          errorMessage,
          retryCount: 0
        }
      });
    } catch (error) {
      // Log error but don't throw - notification logging shouldn't break the main flow
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Check if notification was already sent today for a VM
   */
  private async checkExistingNotification(vmId: string): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingNotification = await prisma.notificationLog.findFirst({
        where: {
          vmId,
          status: 'SENT',
          sentAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      return !!existingNotification;
    } catch (error) {
      // If we can't check, assume no notification was sent to be safe
      return false;
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(): Promise<{ retriedCount: number; successCount: number; errors: string[] }> {
    const result = {
      retriedCount: 0,
      successCount: 0,
      errors: [] as string[]
    };

    try {
      // Get failed notifications from the last 24 hours that haven't exceeded retry limit
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const failedNotifications = await prisma.notificationLog.findMany({
        where: {
          status: 'FAILED',
          retryCount: {
            lt: this.MAX_RETRY_COUNT
          },
          createdAt: {
            gte: yesterday
          }
        },
        include: {
          vm: {
            include: {
              project: true
            }
          }
        }
      });

      for (const notification of failedNotifications) {
        result.retriedCount++;
        
        try {
          // Retry sending the notification
          const retryResult = await this.sendExpiryNotification(notification.vm);
          
          if (retryResult.success) {
            result.successCount++;
            
            // Update the notification log
            await prisma.notificationLog.update({
              where: { id: notification.id },
              data: {
                status: 'SENT',
                sentAt: new Date(),
                retryCount: notification.retryCount + 1,
                errorMessage: null
              }
            });
          } else {
            // Update retry count
            await prisma.notificationLog.update({
              where: { id: notification.id },
              data: {
                retryCount: notification.retryCount + 1,
                errorMessage: retryResult.error
              }
            });
            
            if (retryResult.error) {
              result.errors.push(`VM ${notification.vm.vmAccount}: ${retryResult.error}`);
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`VM ${notification.vm.vmAccount}: ${errorMessage}`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`System error: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(days = 30): Promise<{
    totalNotifications: number;
    sentNotifications: number;
    failedNotifications: number;
    pendingNotifications: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await prisma.notificationLog.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate
        }
      },
      _count: {
        status: true
      }
    });

    const result = {
      totalNotifications: 0,
      sentNotifications: 0,
      failedNotifications: 0,
      pendingNotifications: 0
    };

    stats.forEach(stat => {
      result.totalNotifications += stat._count.status;
      
      switch (stat.status) {
        case 'SENT':
          result.sentNotifications = stat._count.status;
          break;
        case 'FAILED':
          result.failedNotifications = stat._count.status;
          break;
        case 'PENDING':
          result.pendingNotifications = stat._count.status;
          break;
      }
    });

    return result;
  }
}

export const notificationService = NotificationService.getInstance();