import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware';
import { renewalService } from '@/lib/renewal';

// GET /api/renewals - Get renewal statistics and information
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');
    const includeHistory = searchParams.get('includeHistory') === 'true';

    // Get VMs needing renewal
    let vmsNeedingRenewal = await renewalService.getVMsNeedingRenewal(daysAhead);

    // Filter by user permissions if not admin
    if (user.role !== 'ADMIN') {
      const userProjectIds = await prisma.projectAssignment.findMany({
        where: { userId: user.id },
        select: { projectId: true }
      });

      const accessibleProjectIds = userProjectIds.map((assignment: any) => assignment.projectId);
      vmsNeedingRenewal = vmsNeedingRenewal.filter(vm => 
        accessibleProjectIds.includes(vm.projectId)
      );
    }

    // Calculate renewal statistics
    const now = new Date();
    const expiringIn7Days = vmsNeedingRenewal.filter(vm => {
      const daysUntilExpiry = Math.ceil((vm.currentExpiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return daysUntilExpiry <= 7;
    });

    const expiringIn30Days = vmsNeedingRenewal.filter(vm => {
      const daysUntilExpiry = Math.ceil((vm.currentExpiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return daysUntilExpiry <= 30;
    });

    const expiredVMs = vmsNeedingRenewal.filter(vm => vm.currentExpiryDate < now);

    // Get recent renewal activity (last 30 days) if requested
    let recentRenewals: any[] = [];
    if (includeHistory) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const renewalLogs = await prisma.auditLog.findMany({
        where: {
          operation: 'RENEW',
          entityType: 'VM',
          timestamp: {
            gte: thirtyDaysAgo
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 50,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      recentRenewals = renewalLogs.map(log => {
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
          vmId: log.entityId,
          vmAccount: renewalData.vmAccount || 'Unknown',
          projectName: renewalData.projectName || 'Unknown',
          renewalDate: log.timestamp,
          previousExpiryDate: renewalData.previousExpiryDate,
          newExpiryDate: renewalData.newExpiryDate,
          renewalPeriodMonths: renewalData.renewalPeriodMonths || 3,
          performedBy: log.user?.name || 'Unknown',
          performedByEmail: log.user?.email || log.userEmail
        };
      });
    }

    // Group VMs by project for better organization
    const vmsByProject = vmsNeedingRenewal.reduce((acc, vm) => {
      const projectName = vm.project.name;
      if (!acc[projectName]) {
        acc[projectName] = [];
      }
      acc[projectName].push({
        ...vm,
        daysUntilExpiry: Math.ceil((vm.currentExpiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24)),
        suggestedRenewalDate: renewalService.calculateDefaultRenewalDate(vm.currentExpiryDate)
      });
      return acc;
    }, {} as Record<string, any[]>);

    const response: any = {
      statistics: {
        totalVMsNeedingRenewal: vmsNeedingRenewal.length,
        expiringIn7Days: expiringIn7Days.length,
        expiringIn30Days: expiringIn30Days.length,
        expiredVMs: expiredVMs.length,
        searchCriteria: {
          daysAhead,
          userRole: user.role
        }
      },
      vmsByProject,
      renewalSettings: {
        defaultRenewalPeriodMonths: 3,
        maxRenewalPeriodMonths: 24,
        notificationDaysBeforeExpiry: 7
      }
    };

    if (includeHistory) {
      response.recentRenewals = recentRenewals;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching renewal information:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}