import { kvStorage } from './kv-storage';
import { emailService, VMExpiryEmailData, BatchExpiryEmailData, ProjectVMGroup, VMSummary } from './email';
import { AuditService } from './audit';

export interface NotificationResult {
  success: boolean;
  vmId?: string;
  recipientEmail: string;
  error?: string;
  messageId?: string;
  vmCount?: number;
}

export interface ExpiryCheckResult {
  totalVMs: number;
  expiringVMs: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: string[];
  userNotifications: number;
  adminNotifications: number;
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
   * Groups VMs by project and sends:
   * - Project-specific emails to project users
   * - Complete list to all admins
   */
  async checkExpiringVMs(): Promise<ExpiryCheckResult> {
    const result: ExpiryCheckResult = {
      totalVMs: 0,
      expiringVMs: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      errors: [],
      userNotifications: 0,
      adminNotifications: 0
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

      // Get all VMs from KV storage
      const allVMs = await kvStorage.findAllVMs();
      result.totalVMs = allVMs.length;

      // Find VMs expiring exactly 7 days from now
      const expiringVMs = allVMs.filter(vm => {
        const expiryDate = new Date(vm.currentExpiryDate);
        return expiryDate >= startOfTargetDay && expiryDate <= endOfTargetDay;
      });

      result.expiringVMs = expiringVMs.length;

      if (expiringVMs.length === 0) {
        console.log('No VMs expiring in 7 days');
        return result;
      }

      // Enrich VMs with project and user data
      const enrichedVMs = await Promise.all(
        expiringVMs.map(async (vm) => {
          const project = await kvStorage.findProjectById(vm.projectId);
          const projectUsers = await this.getProjectUsers(vm.projectId);
          
          return {
            ...vm,
            project: project || { id: vm.projectId, name: 'Unknown Project' },
            users: projectUsers
          };
        })
      );

      // Group VMs by project
      const projectGroups = this.groupVMsByProject(enrichedVMs);

      // Get all admin users
      const allUsers = await kvStorage.findAllUsers();
      const adminUsers = allUsers.filter(u => u.role === 'ADMIN');

      // Send notifications to project users
      const projectUserEmails = new Set<string>();
      
      for (const [projectId, projectData] of Object.entries(projectGroups)) {
        const projectUsers = projectData.users;
        
        for (const user of projectUsers) {
          // Skip if already notified today
          const alreadyNotified = await this.checkBatchNotificationSent(user.email, projectId);
          if (alreadyNotified) {
            continue;
          }

          projectUserEmails.add(user.email);

          // Send project-specific notification
          const notificationResult = await this.sendBatchNotification({
            recipientEmail: user.email,
            recipientName: user.name,
            isAdmin: false,
            projectGroups: [{
              projectName: projectData.projectName,
              vms: projectData.vms
            }]
          });

          if (notificationResult.success) {
            result.notificationsSent++;
            result.userNotifications++;
            await this.logBatchNotification(user.email, projectId, 'SENT', notificationResult.messageId, projectData.vms.length);
          } else {
            result.notificationsFailed++;
            result.errors.push(`User ${user.email} (Project ${projectData.projectName}): ${notificationResult.error}`);
            await this.logBatchNotification(user.email, projectId, 'FAILED', undefined, projectData.vms.length, notificationResult.error);
          }
        }
      }

      // Send complete list to all admins
      const allProjectGroups: ProjectVMGroup[] = Object.values(projectGroups).map(pg => ({
        projectName: pg.projectName,
        vms: pg.vms
      }));

      for (const admin of adminUsers) {
        // Skip if already notified today
        const alreadyNotified = await this.checkBatchNotificationSent(admin.email, 'ALL_PROJECTS');
        if (alreadyNotified) {
          continue;
        }

        // Send admin notification with all projects
        const notificationResult = await this.sendBatchNotification({
          recipientEmail: admin.email,
          recipientName: admin.name,
          isAdmin: true,
          projectGroups: allProjectGroups
        });

        if (notificationResult.success) {
          result.notificationsSent++;
          result.adminNotifications++;
          await this.logBatchNotification(admin.email, 'ALL_PROJECTS', 'SENT', notificationResult.messageId, expiringVMs.length);
        } else {
          result.notificationsFailed++;
          result.errors.push(`Admin ${admin.email}: ${notificationResult.error}`);
          await this.logBatchNotification(admin.email, 'ALL_PROJECTS', 'FAILED', undefined, expiringVMs.length, notificationResult.error);
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
          userNotifications: result.userNotifications,
          adminNotifications: result.adminNotifications,
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
   * Get users assigned to a project
   */
  private async getProjectUsers(projectId: string): Promise<any[]> {
    const allUsers = await kvStorage.findAllUsers();
    const projectUsers: any[] = [];
    
    for (const user of allUsers) {
      const userProjects = await kvStorage.findUserProjects(user.id);
      if (userProjects.some(p => p.id === projectId)) {
        projectUsers.push(user);
      }
    }
    
    return projectUsers;
  }

  /**
   * Group VMs by project
   */
  private groupVMsByProject(vms: any[]): Record<string, { projectName: string; vms: VMSummary[]; users: any[] }> {
    const groups: Record<string, { projectName: string; vms: VMSummary[]; users: any[] }> = {};

    for (const vm of vms) {
      if (!groups[vm.projectId]) {
        groups[vm.projectId] = {
          projectName: vm.project.name,
          vms: [],
          users: vm.users || []
        };
      }

      groups[vm.projectId].vms.push({
        vmAccount: vm.vmAccount,
        vmDomain: vm.vmDomain,
        vmInternalIP: vm.vmInternalIP,
        currentExpiryDate: new Date(vm.currentExpiryDate),
        email: vm.email
      });
    }

    return groups;
  }

  /**
   * Send batch notification email
   */
  private async sendBatchNotification(data: BatchExpiryEmailData): Promise<NotificationResult> {
    const result: NotificationResult = {
      success: false,
      recipientEmail: data.recipientEmail,
      vmCount: data.projectGroups.reduce((sum, pg) => sum + pg.vms.length, 0)
    };

    try {
      const emailResult = await this.sendEmailWithRetryBatch(data);
      
      if (emailResult.success) {
        result.success = true;
        result.messageId = emailResult.messageId;
      } else {
        result.error = emailResult.error;
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Send batch email with retry mechanism
   */
  private async sendEmailWithRetryBatch(emailData: BatchExpiryEmailData, retryCount = 0): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await emailService.sendBatchExpiryNotification(emailData);
      
      if (!result.success && retryCount < this.MAX_RETRY_COUNT) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
        return this.sendEmailWithRetryBatch(emailData, retryCount + 1);
      }
      
      return result;
    } catch (error) {
      if (retryCount < this.MAX_RETRY_COUNT) {
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
        return this.sendEmailWithRetryBatch(emailData, retryCount + 1);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Log batch notification to KV storage
   */
  private async logBatchNotification(
    recipientEmail: string,
    projectId: string,
    status: 'PENDING' | 'SENT' | 'FAILED',
    messageId?: string,
    vmCount?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { kv } = await import('@vercel/kv');
      const { createId } = await import('@paralleldrive/cuid2');
      
      const log = {
        id: createId(),
        recipientEmail,
        projectId,
        status,
        vmCount: vmCount || 0,
        sentAt: status === 'SENT' ? new Date().toISOString() : null,
        messageId,
        errorMessage,
        retryCount: 0,
        createdAt: new Date().toISOString()
      };

      await kv.lpush('batch_notification_logs', JSON.stringify(log));
      
      // Keep only last 5000 logs
      await kv.ltrim('batch_notification_logs', 0, 4999);
      
      // Also store by recipient and date for quick lookup
      const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const lookupKey = `batch_notif:${recipientEmail}:${projectId}:${dateKey}`;
      await kv.set(lookupKey, log, { ex: 86400 * 7 }); // Expire after 7 days
    } catch (error) {
      console.error('Failed to log batch notification:', error);
    }
  }

  /**
   * Check if batch notification was already sent today
   */
  private async checkBatchNotificationSent(recipientEmail: string, projectId: string): Promise<boolean> {
    try {
      const { kv } = await import('@vercel/kv');
      const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const lookupKey = `batch_notif:${recipientEmail}:${projectId}:${dateKey}`;
      
      const existingLog = await kv.get(lookupKey);
      
      if (existingLog && typeof existingLog === 'object') {
        const log = existingLog as any;
        return log.status === 'SENT';
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check batch notification:', error);
      return false;
    }
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
   * Log notification status to KV storage
   */
  private async logNotification(
    vmId: string, 
    recipientEmail: string, 
    status: 'PENDING' | 'SENT' | 'FAILED',
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await kvStorage.createNotificationLog({
        vmId,
        recipientEmail,
        status,
        sentAt: status === 'SENT' ? new Date().toISOString() : undefined,
        errorMessage,
        retryCount: 0
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
      const { kv } = await import('@vercel/kv');
      const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const lookupKey = `notif:${vmId}:${dateKey}`;
      
      const existingLog = await kv.get(lookupKey);
      
      if (existingLog && typeof existingLog === 'object') {
        const log = existingLog as any;
        return log.status === 'SENT';
      }
      
      return false;
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
      // Get failed notifications from KV storage
      const logs = await kvStorage.findNotificationLogs(1000);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const failedNotifications = logs.filter(log => 
        log.status === 'FAILED' &&
        log.retryCount < this.MAX_RETRY_COUNT &&
        new Date(log.createdAt) >= yesterday
      );

      for (const notification of failedNotifications) {
        result.retriedCount++;
        
        try {
          // Get VM details
          const vm = await kvStorage.findVMById(notification.vmId);
          if (!vm) {
            result.errors.push(`VM ${notification.vmId} not found`);
            continue;
          }

          // Get project details
          const project = await kvStorage.findProjectById(vm.projectId);
          
          // Retry sending the notification
          const retryResult = await this.sendExpiryNotification({
            ...vm,
            project: project || { name: 'Unknown Project' }
          });
          
          if (retryResult.success) {
            result.successCount++;
          } else if (retryResult.error) {
            result.errors.push(`VM ${vm.vmAccount}: ${retryResult.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`VM ${notification.vmId}: ${errorMessage}`);
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
    try {
      const logs = await kvStorage.findNotificationLogs(10000);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const recentLogs = logs.filter(log => new Date(log.createdAt) >= startDate);

      const result = {
        totalNotifications: recentLogs.length,
        sentNotifications: recentLogs.filter(l => l.status === 'SENT').length,
        failedNotifications: recentLogs.filter(l => l.status === 'FAILED').length,
        pendingNotifications: recentLogs.filter(l => l.status === 'PENDING').length
      };

      return result;
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return {
        totalNotifications: 0,
        sentNotifications: 0,
        failedNotifications: 0,
        pendingNotifications: 0
      };
    }
  }
}

export const notificationService = NotificationService.getInstance();