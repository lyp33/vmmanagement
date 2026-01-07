import { NextRequest, NextResponse } from 'next/server'
import { mockData } from '@/lib/mock-data'

// Project user assignment endpoint

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { userId } = body

    console.log('Assign user request:', { projectId, userId })

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const assignment = mockData.assignUserToProject(projectId, userId)
    
    console.log('Assignment result:', assignment)
    
    if (!assignment) {
      // Get more details for debugging
      const project = mockData.getProjectById(projectId)
      const user = mockData.getUserById(userId)
      
      console.log('Debug info:', {
        projectExists: !!project,
        userExists: !!user,
        currentAssignments: project?.userAssignments?.map(a => a.user.id)
      })
      
      return NextResponse.json(
        { error: 'Failed to assign user (user may already be assigned or project/user not found)' },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      message: 'User assigned to project successfully',
      assignment
    })
  } catch (error) {
    console.error('Error in assign user API:', error)
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
    const { assignmentId } = body

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    const success = mockData.unassignUserFromProject(projectId, assignmentId)
    
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
    return NextResponse.json(
      { error: 'Failed to remove user from project' },
      { status: 500 }
    )
  }
}
