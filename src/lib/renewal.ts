import { prisma } from './prisma';
import { AuditService } from './audit';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export interface RenewalRequest {
  vmId: string;
  newExpiryDate?: Date;
  renewalPeriodMonths?: number;
}

export interface RenewalResult {
  success: boolean;
  vmId: string;
  previousExpiryDate: Date;
  newExpiryDate: Date;
  renewalPeriodMonths: number;
  error?: string;
}

export interface RenewalHistory {
  vmId: string;
  vmAccount: string;
  renewalDate: Date;
  previousExpiryDate: Date;
  newExpiryDate: Date;
  renewalPeriodMonths: number;
  performedBy: string;
  performedByEmail: string;
}

export class RenewalService {
  private static instance: RenewalService;
  private readonly DEFAULT_RENEWAL_MONTHS = 3;

  private constructor() {}

  public static getInstance(): RenewalService {
    if (!RenewalService.instance) {
      RenewalService.instance = new RenewalService();
    }
    return RenewalService.instance;
  }

  /**
   * Renew a VM with history preservation
   * Requirements: 5.1, 5.2, 5.3, 5.5
   */
  async renewVM(request: RenewalRequest, userId?: string, userEmail?: string): Promise<RenewalResult> {
    const result: RenewalResult = {
      success: false,
      vmId: request.vmId,
      previousExpiryDate: new Date(),
      newExpiryDate: new Date(),
      renewalPeriodMonths: request.renewalPeriodMonths || this.DEFAULT_RENEWAL_MONTHS
    };

    try {
      // Get user info if not provided
      if (!userId || !userEmail) {
        const session = await getServerSession(authOptions);
        if (session?.user) {
          userId = session.user.id;
          userEmail = session.user.email;
        } else {
          result.error = 'Authentication required for renewal operation';
          return result;
        }
      }

      // Get the VM record
      const vm = await prisma.vMRecord.findUnique({
        where: { id: request.vmId },
        include: {
          project: true
        }
      });

      if (!vm) {
        result.error = 'VM not found';
        return result;
      }

      // Store the current expiry date as previous
      result.previousExpiryDate = vm.currentExpiryDate;

      // Calculate new expiry date
      let newExpiryDate: Date;
      
      if (request.newExpiryDate) {
        // Use provided date
        newExpiryDate = new Date(request.newExpiryDate);
        
        // Calculate renewal period for logging
        const timeDiff = newExpiryDate.getTime() - vm.currentExpiryDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        result.renewalPeriodMonths = Math.round(daysDiff / 30); // Approximate months
      } else {
        // Use default 3-month renewal from current expiry date
        newExpiryDate = new Date(vm.currentExpiryDate);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + result.renewalPeriodMonths);
      }

      // Validate that new expiry date is in the future
      const now = new Date();
      if (newExpiryDate <= now) {
        result.error = 'Renewal date must be in the future';
        return result;
      }

      result.newExpiryDate = newExpiryDate;

      // Update VM record with history preservation
      // Requirement 5.1: Update current expiry date
      // Requirement 5.2: Preserve history by updating lastExpiryDate
      const updatedVM = await prisma.vMRecord.update({
        where: { id: request.vmId },
        data: {
          lastExpiryDate: vm.currentExpiryDate, // Preserve history
          currentExpiryDate: newExpiryDate,     // Update to new expiry
          updatedAt: new Date()
        },
        include: {
          project: true
        }
      });

      // Log the renewal operation (Requirement 5.4)
      await AuditService.logVMRenewal(
        request.vmId,
        {
          previousExpiryDate: result.previousExpiryDate.toISOString(),
          newExpiryDate: result.newExpiryDate.toISOString(),
          renewalPeriodMonths: result.renewalPeriodMonths,
          vmAccount: vm.vmAccount,
          projectName: vm.project.name,
          renewalDate: new Date().toISOString()
        },
        userId,
        userEmail
      );

      result.success = true;
      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error during renewal';
      console.error('VM renewal error:', error);
      return result;
    }
  }

  /**
   * Calculate default renewal date (3 months from current expiry)
   * Requirement 5.5: Default 3-month renewal period
   */
  calculateDefaultRenewalDate(currentExpiryDate: Date): Date {
    const renewalDate = new Date(currentExpiryDate);
    renewalDate.setMonth(renewalDate.getMonth() + this.DEFAULT_RENEWAL_MONTHS);
    return renewalDate;
  }

  /**
   * Validate renewal date is in the future
   * Requirement 5.3: Validate renewal dates
   */
  validateRenewalDate(renewalDate: Date): { isValid: boolean; error?: string } {
    const now = new Date();
    
    if (renewalDate <= now) {
      return {
        isValid: false,
        error: 'Renewal date must be in the future'
      };
    }

    // Additional validation: not too far in the future (e.g., max 2 years)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2);
    
    if (renewalDate > maxFutureDate) {
      return {
        isValid: false,
        error: 'Renewal date cannot be more than 2 years in the future'
      };
    }

    return { isValid: true };
  }

  /**
   * Get renewal history for a VM
   */
  async getVMRenewalHistory(vmId: string): Promise<RenewalHistory[]> {
    try {
      // Get audit logs for renewal operations on this VM
      const renewalLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'VM',
          entityId: vmId,
          operation: 'RENEW'
        },
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      // Get VM info for context
      const vm = await prisma.vMRecord.findUnique({
        where: { id: vmId },
        select: {
          vmAccount: true
        }
      });

      if (!vm) {
        return [];
      }

      // Parse renewal history from audit logs
      const history: RenewalHistory[] = renewalLogs.map(log => {
        let renewalData: any = {};
        
        try {
          renewalData = JSON.parse(log.changes || '{}');
          if (renewalData.renewal) {
            renewalData = renewalData.renewal;
          }
        } catch (error) {
          console.error('Error parsing renewal log changes:', error);
        }

        return {
          vmId: vmId,
          vmAccount: vm.vmAccount,
          renewalDate: log.timestamp,
          previousExpiryDate: renewalData.previousExpiryDate ? new Date(renewalData.previousExpiryDate) : new Date(),
          newExpiryDate: renewalData.newExpiryDate ? new Date(renewalData.newExpiryDate) : new Date(),
          renewalPeriodMonths: renewalData.renewalPeriodMonths || this.DEFAULT_RENEWAL_MONTHS,
          performedBy: log.user?.name || 'Unknown',
          performedByEmail: log.user?.email || log.userEmail
        };
      });

      return history;

    } catch (error) {
      console.error('Error fetching renewal history:', error);
      return [];
    }
  }

  /**
   * Get VMs that need renewal soon (within specified days)
   */
  async getVMsNeedingRenewal(daysAhead: number = 30): Promise<any[]> {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysAhead);

      const vmsNeedingRenewal = await prisma.vMRecord.findMany({
        where: {
          currentExpiryDate: {
            lte: targetDate
          }
        },
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          creator: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          currentExpiryDate: 'asc'
        }
      });

      return vmsNeedingRenewal;

    } catch (error) {
      console.error('Error fetching VMs needing renewal:', error);
      return [];
    }
  }

  /**
   * Batch renewal for multiple VMs
   */
  async batchRenewVMs(
    vmIds: string[], 
    renewalPeriodMonths?: number, 
    userId?: string, 
    userEmail?: string
  ): Promise<{
    successful: RenewalResult[];
    failed: RenewalResult[];
    totalProcessed: number;
  }> {
    const results = {
      successful: [] as RenewalResult[],
      failed: [] as RenewalResult[],
      totalProcessed: vmIds.length
    };

    for (const vmId of vmIds) {
      const renewalRequest: RenewalRequest = {
        vmId,
        renewalPeriodMonths: renewalPeriodMonths || this.DEFAULT_RENEWAL_MONTHS
      };

      const result = await this.renewVM(renewalRequest, userId, userEmail);
      
      if (result.success) {
        results.successful.push(result);
      } else {
        results.failed.push(result);
      }
    }

    // Log batch renewal operation
    if (userId && userEmail) {
      await AuditService.logOperation({
        operation: 'BATCH_RENEWAL',
        entityType: 'VM_BATCH',
        entityId: `batch_renewal_${Date.now()}`,
        changes: {
          vmIds,
          renewalPeriodMonths: renewalPeriodMonths || this.DEFAULT_RENEWAL_MONTHS,
          successfulCount: results.successful.length,
          failedCount: results.failed.length,
          totalProcessed: results.totalProcessed
        }
      }, userId, userEmail);
    }

    return results;
  }
}

export const renewalService = RenewalService.getInstance();