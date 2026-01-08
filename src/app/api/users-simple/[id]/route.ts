import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCurrentUserForAudit, safeCreateAuditLog } from '@/lib/audit-helper'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await storage.findUserById(id)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove password from response
    const { password, ...safeUser } = user

    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
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
    
    // Get old user data for audit
    const oldUser = await storage.findUserById(id)
    if (!oldUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // If password is being updated, hash it
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10)
    }
    
    const updatedUser = await storage.updateUser(id, body)
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Log audit
    const auditUser = await getCurrentUserForAudit()
    const changes: Record<string, any> = {}
    if (body.name && body.name !== oldUser.name) changes.name = { from: oldUser.name, to: body.name }
    if (body.email && body.email !== oldUser.email) changes.email = { from: oldUser.email, to: body.email }
    if (body.role && body.role !== oldUser.role) changes.role = { from: oldUser.role, to: body.role }
    if (body.password) changes.password = 'updated'
    
    await safeCreateAuditLog({
      operation: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      userId: auditUser.userId,
      userEmail: auditUser.userEmail,
      changes
    })

    // Remove password from response
    const { password, ...safeUser } = updatedUser

    return NextResponse.json({ 
      user: safeUser,
      message: 'User updated successfully'
    })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
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
    
    // Check if user exists
    const user = await storage.findUserById(id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Note: In KV storage, we need to implement deleteUser method
    // For now, we'll return an error
    return NextResponse.json(
      { error: 'User deletion not yet implemented in storage layer' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}