import { NextRequest, NextResponse } from 'next/server'
import { mockData } from '@/lib/mock-data'

export async function GET() {
  try {
    const users = mockData.getUsers()
    return NextResponse.json({ 
      users,
      total: users.length
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, password, role } = body

    // Validate required fields
    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const users = mockData.getUsers()
    const existingUser = users.find(u => u.email === email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create new user
    const newUser = mockData.createUser({
      email,
      name,
      role: role as 'ADMIN' | 'USER',
      _count: {
        projectAssignments: 0
      }
    })

    return NextResponse.json({ 
      user: newUser,
      message: 'User created successfully'
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}