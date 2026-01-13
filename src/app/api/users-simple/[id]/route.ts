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
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can delete users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete users' },
        { status: 403 }
      )
    }

    const { id } = await params
    
    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }
    
    // Check if user exists
    const user = await storage.findUserById(id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete user
    const deleted = await storage.deleteUser(id)
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    // Log audit
    const auditUser = await getCurrentUserForAudit()
    await safeCreateAuditLog({
      operation: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      userId: auditUser.userId,
      userEmail: auditUser.userEmail,
      changes: {
        deletedUser: {
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}