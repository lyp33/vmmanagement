import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCurrentUserForAudit, safeCreateAuditLog } from '@/lib/audit-helper'

export async function GET() {
  try {
    const projects = await storage.findAllProjects()
    
    // Get all VMs to count per project
    const allVMs = await storage.findAllVMs()
    
    // Get all users to count assignments per project
    const allUsers = await storage.findAllUsers()
    
    // Add counts to each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        // Count VMs for this project
        const vmCount = allVMs.filter(vm => vm.projectId === project.id).length
        
        // Count user assignments for this project
        let userAssignmentCount = 0
        for (const user of allUsers) {
          const userProjects = await storage.findUserProjects(user.id)
          if (userProjects.some(p => p.id === project.id)) {
            userAssignmentCount++
          }
        }
        
        return {
          ...project,
          _count: {
            vms: vmCount,
            userAssignments: userAssignmentCount
          }
        }
      })
    )
    
    return NextResponse.json({ 
      projects: projectsWithCounts,
      total: projectsWithCounts.length
    })
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      )
    }

    // Check if project with same name already exists
    const projects = await storage.findAllProjects()
    const existingProject = projects.find(p => p.name === name)
    if (existingProject) {
      return NextResponse.json(
        { error: 'Project with this name already exists' },
        { status: 409 }
      )
    }

    // Create new project
    const newProject = await storage.createProject({
      name,
      description
    })

    // Log audit
    const auditUser = await getCurrentUserForAudit()
    await safeCreateAuditLog({
      operation: 'CREATE_PROJECT',
      entityType: 'Project',
      entityId: newProject.id,
      userId: auditUser.userId,
      userEmail: auditUser.userEmail,
      changes: {
        name: newProject.name,
        description: newProject.description
      }
    })

    return NextResponse.json({ 
      project: newProject,
      message: 'Project created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}