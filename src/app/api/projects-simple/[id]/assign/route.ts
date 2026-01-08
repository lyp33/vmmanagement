import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

// Project user assignment endpoint

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if project exists
    const project = await storage.findProjectById(projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user exists
    const user = await storage.findUserById(userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already assigned
    const userProjects = await storage.findUserProjects(userId)
    if (userProjects.some(p => p.id === projectId)) {
      return NextResponse.json(
        { error: 'User is already assigned to this project' },
        { status: 400 }
      )
    }

    const assignment = await storage.createProjectAssignment(userId, projectId)

    return NextResponse.json({ 
      message: 'User assigned to project successfully',
      assignment
    })
  } catch (error) {
    console.error('Error assigning user to project:', error)
    return NextResponse.json(
      { error: 'Failed to assign user to project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { assignmentId, userId } = body

    // Support both assignmentId and userId for flexibility
    if (!assignmentId && !userId) {
      return NextResponse.json(
        { error: 'Assignment ID or User ID is required' },
        { status: 400 }
      )
    }

    let success = false
    
    if (userId) {
      // Remove by userId
      success = await storage.removeProjectAssignment(userId, projectId)
    } else {
      // For assignmentId, we need to find the userId first
      // This is a limitation of the current storage interface
      // For now, return an error asking for userId
      return NextResponse.json(
        { error: 'Please provide userId instead of assignmentId' },
        { status: 400 }
      )
    }
    
    if (!success) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      message: 'User removed from project successfully'
    })
  } catch (error) {
    console.error('Error removing user from project:', error)
    return NextResponse.json(
      { error: 'Failed to remove user from project' },
      { status: 500 }
    )
  }
}
