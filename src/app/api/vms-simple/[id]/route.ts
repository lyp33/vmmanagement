import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Helper function to get current user for audit logging
async function getCurrentUserForAudit() {
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

// GET /api/vms-simple/[id] - Get VM by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const vm = await storage.findVMById(id)
    
    if (!vm) {
      return NextResponse.json(
        { error: 'VM not found' },
        { status: 404 }
      )
    }

    // Fetch project information
    const project = await storage.findProjectById(vm.projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Return VM with project information
    return NextResponse.json({
      ...vm,
      project: {
        id: project.id,
        name: project.name,
        description: project.description
      }
    })
  } catch (error) {
    console.error('Error fetching VM:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VM' },
      { status: 500 }
    )
  }
}

// PUT /api/vms-simple/[id] - Update VM (full update)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { email, vmAccount, vmInternalIP, vmDomain, projectId, currentExpiryDate, lastExpiryDate } = body

    // Validate project exists if projectId is provided
    if (projectId) {
      const project = await storage.findProjectById(projectId)
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
    }

    // Update VM
    const updatedVM = await storage.updateVMRecord(id, {
      email,
      vmAccount,
      vmInternalIP,
      vmDomain,
      currentExpiryDate,
      lastExpiryDate,
      ...(projectId && { projectId })
    })

    if (!updatedVM) {
      return NextResponse.json(
        { error: 'VM not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedVM)
  } catch (error) {
    console.error('Error updating VM:', error)
    return NextResponse.json(
      { error: 'Failed to update VM' },
      { status: 500 }
    )
  }
}

// PATCH /api/vms-simple/[id] - Partial update VM (for renewal)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()

    // Get old VM data for audit
    const oldVM = await storage.findVMById(id)
    if (!oldVM) {
      return NextResponse.json(
        { error: 'VM not found' },
        { status: 404 }
      )
    }

    // Update VM with partial data
    const updatedVM = await storage.updateVMRecord(id, body)

    if (!updatedVM) {
      return NextResponse.json(
        { error: 'VM not found' },
        { status: 404 }
      )
    }

    // Log audit
    const auditUser = await getCurrentUserForAudit()
    const changes: Record<string, any> = {}
    
    // Track all changes
    for (const [key, value] of Object.entries(body)) {
      if (value !== oldVM[key as keyof typeof oldVM]) {
        changes[key] = {
          from: oldVM[key as keyof typeof oldVM],
          to: value
        }
      }
    }
    
    // Determine operation type (renewal vs regular update)
    const operation = body.lastExpiryDate && body.currentExpiryDate !== oldVM.currentExpiryDate 
      ? 'RENEW_VM' 
      : 'UPDATE_VM'
    
    await storage.createAuditLog({
      operation,
      entityType: 'VMRecord',
      entityId: id,
      userId: auditUser.userId,
      userEmail: auditUser.userEmail,
      changes
    })

    return NextResponse.json(updatedVM)
  } catch (error) {
    console.error('Error updating VM:', error)
    return NextResponse.json(
      { error: 'Failed to update VM' },
      { status: 500 }
    )
  }
}

// DELETE /api/vms-simple/[id] - Delete VM
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const success = await storage.deleteVMRecord(id)
    
    if (!success) {
      return NextResponse.json(
        { error: 'VM not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'VM deleted successfully' })
  } catch (error) {
    console.error('Error deleting VM:', error)
    return NextResponse.json(
      { error: 'Failed to delete VM' },
      { status: 500 }
    )
  }
}
