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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await storage.findProjectById(id)
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Get VMs for this project
    const allVMs = await storage.findAllVMs()
    const projectVMs = allVMs.filter(vm => vm.projectId === id)

    // Get all users and find those assigned to this project
    const allUsers = await storage.findAllUsers()
    const userAssignments: any[] = []
    
    for (const user of allUsers) {
      const userProjects = await storage.findUserProjects(user.id)
      const isAssigned = userProjects.some(p => p.id === id)
      
      if (isAssigned) {
        userAssignments.push({
          id: `${user.id}-${id}`, // Generate a pseudo assignment ID
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          assignedAt: new Date().toISOString() // We don't have actual assignment date in current storage
        })
      }
    }

    // Build response with counts
    const projectWithDetails = {
      ...project,
      vms: projectVMs,
      userAssignments,
      _count: {
        vms: projectVMs.length,
        userAssignments: userAssignments.length
      }
    }

    return NextResponse.json({ project: projectWithDetails })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Get old project data for audit
    const oldProject = await storage.findProjectById(id)
    if (!oldProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    const updatedProject = await storage.updateProject(id, {
      name: body.name,
      description: body.description
    })
    
    if (!updatedProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Log audit
    const auditUser = await getCurrentUserForAudit()
    const changes: Record<string, any> = {}
    if (body.name && body.name !== oldProject.name) changes.name = { from: oldProject.name, to: body.name }
    if (body.description && body.description !== oldProject.description) changes.description = { from: oldProject.description, to: body.description }
    
    await storage.createAuditLog({
      operation: 'UPDATE_PROJECT',
      entityType: 'Project',
      entityId: id,
      userId: auditUser.userId,
      userEmail: auditUser.userEmail,
      changes
    })

    return NextResponse.json({ 
      project: updatedProject,
      message: 'Project updated successfully'
    })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if project has VMs
    const allVMs = await storage.findAllVMs()
    const projectVMs = allVMs.filter(vm => vm.projectId === id)
    
    if (projectVMs.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete project with existing VMs' },
        { status: 400 }
      )
    }
    
    // Get project data for audit before deletion
    const project = await storage.findProjectById(id)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    const deleted = await storage.deleteProject(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Log audit
    const auditUser = await getCurrentUserForAudit()
    await storage.createAuditLog({
      operation: 'DELETE_PROJECT',
      entityType: 'Project',
      entityId: id,
      userId: auditUser.userId,
      userEmail: auditUser.userEmail,
      changes: {
        deleted: {
          name: project.name,
          description: project.description
        }
      }
    })

    return NextResponse.json({ 
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
