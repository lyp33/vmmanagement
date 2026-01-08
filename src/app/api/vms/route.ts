import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/vms - Get VM list
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current user
    const currentUser = await storage.findUserByEmail(session.user.email)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const isAdmin = currentUser.role === 'ADMIN'
    
    // Get VMs based on user permissions
    const vms = await storage.findVMsByUserPermissions(currentUser.id, isAdmin)

    // Add expiry status information
    const enrichedVMs = vms.map((vm) => {
      const now = new Date()
      const expiryDate = new Date(vm.currentExpiryDate)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...vm,
        isExpired: expiryDate < now,
        daysUntilExpiry
      }
    })

    return NextResponse.json({
      vms: enrichedVMs,
      total: enrichedVMs.length
    })
  } catch (error) {
    console.error('Error fetching VMs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VMs' },
      { status: 500 }
    )
  }
}

// POST /api/vms - Create new VM record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current user
    const currentUser = await storage.findUserByEmail(session.user.email)
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { email, vmAccount, vmInternalIP, vmDomain, projectId, currentExpiryDate } = body

    // Validate required fields
    if (!email || !vmAccount || !vmInternalIP || !vmDomain || !projectId || !currentExpiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Validate expiry date is in the future
    const expiryDate = new Date(currentExpiryDate)
    if (expiryDate <= new Date()) {
      return NextResponse.json(
        { error: 'Expiry date must be in the future' },
        { status: 400 }
      )
    }

    // Create VM record
    const vm = await storage.createVMRecord({
      email,
      vmAccount,
      vmInternalIP,
      vmDomain,
      currentExpiryDate,
      projectId,
      createdBy: currentUser.id
    })

    return NextResponse.json(vm, { status: 201 })
  } catch (error) {
    console.error('Error creating VM:', error)
    return NextResponse.json(
      { error: 'Failed to create VM' },
      { status: 500 }
    )
  }
}