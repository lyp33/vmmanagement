import { NextResponse } from 'next/server'
import { mockData } from '@/lib/mock-data'

// GET /api/vms-simple/[id] - Get VM by ID
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const vm = mockData.getVMById(id)
    
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

// PUT /api/vms-simple/[id] - Update VM
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { email, vmAccount, vmInternalIP, vmDomain, projectId, currentExpiryDate } = body

    // Find project if projectId is provided
    let projectInfo: any = undefined
    if (projectId) {
      const project = mockData.getProjectById(projectId)
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
      projectInfo = {
        id: project.id,
        name: project.name
      }
    }

    // Update VM
    const updatedVM = mockData.updateVM(id, {
      email,
      vmAccount,
      vmInternalIP,
      vmDomain,
      currentExpiryDate,
      ...(projectInfo && { project: projectInfo })
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

// DELETE /api/vms-simple/[id] - Delete VM
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const success = mockData.deleteVM(id)
    
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
