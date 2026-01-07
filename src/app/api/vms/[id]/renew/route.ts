import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getCurrentUser } from '@/lib/middleware/auth-middleware';
import { renewalService, RenewalRequest } from '@/lib/renewal';
import { z } from 'zod';

// VM renewal request validation schema
const renewVMSchema = z.object({
  newExpiryDate: z.string().datetime('Invalid expiry date format').optional(),
  renewalPeriodMonths: z.number().min(1, 'Renewal period must be at least 1 month').max(24, 'Renewal period cannot exceed 24 months').optional()
});

// Check if user has access to the VM
async function checkVMAccess(vmId: string, userId: string, isAdmin: boolean) {
  const vm = await prisma.vMRecord.findUnique({
    where: { id: vmId },
    include: { project: true }
  });

  if (!vm) {
    return { hasAccess: false, vm: null, error: 'VM not found' };
  }

  if (isAdmin) {
    return { hasAccess: true, vm, error: null };
  }

  // Check if regular user has access to the VM's project
  const hasAccess = await prisma.projectAssignment.findFirst({
    where: { userId, projectId: vm.projectId }
  });

  if (!hasAccess) {
    return { hasAccess: false, vm: null, error: 'Access denied to this VM' };
  }

  return { hasAccess: true, vm, error: null };
}

// POST /api/vms/[id]/renew - Renew a specific VM
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const vmId = id;
    const body = await request.json();
    const validatedData = renewVMSchema.parse(body);

    // Check VM access permissions
    const { hasAccess, vm, error } = await checkVMAccess(vmId, user.id, user.role === 'ADMIN');

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'VM not found' ? 404 : 403 }
      );
    }

    // Prepare renewal request
    const renewalRequest: RenewalRequest = {
      vmId,
      newExpiryDate: validatedData.newExpiryDate ? new Date(validatedData.newExpiryDate) : undefined,
      renewalPeriodMonths: validatedData.renewalPeriodMonths
    };

    // Validate renewal date if provided
    if (renewalRequest.newExpiryDate) {
      const validation = renewalService.validateRenewalDate(renewalRequest.newExpiryDate);
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Perform the renewal
    const renewalResult = await renewalService.renewVM(
      renewalRequest,
      user.id,
      user.email
    );

    if (!renewalResult.success) {
      return NextResponse.json(
        { error: renewalResult.error || 'Renewal failed' },
        { status: 400 }
      );
    }

    // Get updated VM data to return
    const updatedVM = await prisma.vMRecord.findUnique({
      where: { id: vmId },
      include: {
        project: {
          select: { id: true, name: true, description: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json({
      message: 'VM renewed successfully',
      vm: updatedVM,
      renewal: {
        previousExpiryDate: renewalResult.previousExpiryDate,
        newExpiryDate: renewalResult.newExpiryDate,
        renewalPeriodMonths: renewalResult.renewalPeriodMonths
      }
    });

  } catch (error) {
    console.error('Error renewing VM:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/vms/[id]/renew - Get renewal information and history for a VM
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const vmId = id;

    // Check VM access permissions
    const { hasAccess, vm, error } = await checkVMAccess(vmId, user.id, user.role === 'ADMIN');

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'VM not found' ? 404 : 403 }
      );
    }

    // Get renewal history
    const renewalHistory = await renewalService.getVMRenewalHistory(vmId);

    // Calculate suggested renewal date (default 3 months)
    const suggestedRenewalDate = renewalService.calculateDefaultRenewalDate(vm!.currentExpiryDate);

    // Calculate days until expiry
    const now = new Date();
    const daysUntilExpiry = Math.ceil((vm!.currentExpiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    return NextResponse.json({
      vm: {
        id: vm!.id,
        vmAccount: vm!.vmAccount,
        currentExpiryDate: vm!.currentExpiryDate,
        lastExpiryDate: vm!.lastExpiryDate,
        project: vm!.project
      },
      renewalInfo: {
        daysUntilExpiry,
        suggestedRenewalDate,
        defaultRenewalPeriodMonths: 3
      },
      renewalHistory
    });

  } catch (error) {
    console.error('Error fetching VM renewal info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}