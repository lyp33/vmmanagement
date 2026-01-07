import { NextRequest, NextResponse } from 'next/server'
import { mockData } from '@/lib/mock-data'

export async function GET() {
  try {
    const projects = mockData.getProjects()
    return NextResponse.json({ 
      projects,
      total: projects.length
    })
  } catch (error) {
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
    const projects = mockData.getProjects()
    const existingProject = projects.find(p => p.name === name)
    if (existingProject) {
      return NextResponse.json(
        { error: 'Project with this name already exists' },
        { status: 409 }
      )
    }

    // Create new project
    const newProject = mockData.createProject({
      name,
      description,
      _count: {
        vms: 0,
        userAssignments: 0
      }
    })

    return NextResponse.json({ 
      project: newProject,
      message: 'Project created successfully'
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}