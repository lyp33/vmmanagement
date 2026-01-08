import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

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

    return NextResponse.json(vm)
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

    // Update VM with partial data
    const updatedVM = await storage.updateVMRecord(id, body)

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
