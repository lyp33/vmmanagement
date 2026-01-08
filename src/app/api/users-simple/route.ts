import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const users = await storage.findAllUsers()
    
    // Remove password from response
    const safeUsers = users.map(({ password, ...user }) => user)
    
    return NextResponse.json({ 
      users: safeUsers,
      total: safeUsers.length
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
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

    // Validate role
    if (role !== 'ADMIN' && role !== 'USER') {
      return NextResponse.json(
        { error: 'Invalid role. Must be ADMIN or USER' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await storage.findUserByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = await storage.createUser({
      email,
      name,
      password: hashedPassword,
      role: role as 'ADMIN' | 'USER'
    })

    // Remove password from response
    const { password: _, ...safeUser } = newUser

    return NextResponse.json({ 
      user: safeUser,
      message: 'User created successfully'
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}