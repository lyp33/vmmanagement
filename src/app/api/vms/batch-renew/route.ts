import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware';
import { renewalService } from '@/lib/renewal';
import { z } from 'zod';

// Batch renewal request validation schema
const batchRenewSchema = z.object({
  vmIds: z.array(z.string().min(1, 'VM ID is required')).min(1, 'At least one VM ID is required'),
  renewalPeriodMonths: z.number().min(1, 'Renewal period must be at least 1 month').max(24, 'Renewal period cannot exceed 24 months').optional()
});

// Check if user has access to all specified VMs
async function checkBatchVMAccess(vmIds: string[], userId: string, isAdmin: boolean) {
  const vms = await prisma.vMRecord.findMany({
    where: { id: { in: vmIds } },
    include: { project: true }
  });

  if (vms.length !== vmIds.length) {
    const foundIds = vms.map(vm => vm.id);
    const missingIds = vmIds.filter(id => !foundIds.includes(id));
    return { 
      hasAccess: false, 
      vms: [], 
      error: `VMs not found: ${missingIds.join(', ')}` 
    };
  }

  if (isAdmin) {
    return { hasAccess: true, vms, error: null };
  }

  // Check if regular user has access to all VM projects
  const userProjectIds = await prisma.projectAssignment.findMany({
    where: { userId },
    select: { projectId: true }
  });

  const accessibleProjectIds = userProjectIds.map((assignment: any) => assignment.projectId);
  const inaccessibleVMs = vms.filter(vm => !accessibleProjectIds.includes(vm.projectId));

  if (inaccessibleVMs.length > 0) {
    const inaccessibleAccounts = inaccessibleVMs.map(vm => vm.vmAccount);
    return { 
      hasAccess: false, 
      vms: [], 
      error: `Access denied to VMs: ${inaccessibleAccounts.join(', ')}` 
    };
  }

  return { hasAccess: true, vms, error: null };
}

// POST /api/vms/batch-renew - Batch renew multiple VMs
export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = batchRenewSchema.parse(body);

    // Check access to all VMs
    const { hasAccess, vms, error } = await checkBatchVMAccess(
      validatedData.vmIds, 
      user.id, 
      user.role === 'ADMIN'
    );

    if (!hasAccess) {
      return NextResponse.json({ error }, { status: 403 });
    }

    // Perform batch renewal
    const batchResult = await renewalService.batchRenewVMs(
      validatedData.vmIds,
      validatedData.renewalPeriodMonths,
      user.id,
      user.email
    );

    // Get updated VM data for successful renewals
    const updatedVMs = await prisma.vMRecord.findMany({
      where: { 
        id: { 
          in: batchResult.successful.map(result => result.vmId) 
        } 
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json({
      message: `Batch renewal completed: ${batchResult.successful.length} successful, ${batchResult.failed.length} failed`,
      results: {
        totalProcessed: batchResult.totalProcessed,
        successful: batchResult.successful.length,
        failed: batchResult.failed.length
      },
      renewedVMs: updatedVMs,
      failures: batchResult.failed.map(failure => ({
        vmId: failure.vmId,
        error: failure.error
      })),
      renewalDetails: {
        renewalPeriodMonths: validatedData.renewalPeriodMonths || 3,
        renewalDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in batch VM renewal:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/vms/batch-renew - Get VMs that need renewal soon
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

    // Calculate days until expiry for each VM
    const now = new Date();
    const vmsWithExpiryInfo = vmsNeedingRenewal.map(vm => ({
      ...vm,
      daysUntilExpiry: Math.ceil((vm.currentExpiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24)),
      suggestedRenewalDate: renewalService.calculateDefaultRenewalDate(vm.currentExpiryDate)
    }));

    return NextResponse.json({
      vmsNeedingRenewal: vmsWithExpiryInfo,
      totalCount: vmsWithExpiryInfo.length,
      searchCriteria: {
        daysAhead,
        userRole: user.role
      }
    });

  } catch (error) {
    console.error('Error fetching VMs needing renewal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}