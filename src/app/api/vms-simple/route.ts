import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCurrentUserForAudit, safeCreateAuditLog } from '@/lib/audit-helper'

// GET /api/vms-simple - Get all VMs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const projectId = searchParams.get('projectId')
    const expiryStatus = searchParams.get('expiryStatus')

    // Get all VMs from storage
    let vms = await storage.findAllVMs()

    // Fetch all projects for mapping
    const projects = await storage.findAllProjects()
    const projectMap = new Map(projects.map(p => [p.id, p]))

    // Add project information to each VM
    const vmsWithProjects = vms.map(vm => {
      const project = projectMap.get(vm.projectId)
      return {
        ...vm,
        project: project ? {
          id: project.id,
          name: project.name,
          description: project.description
        } : {
          id: vm.projectId,
          name: 'Unknown Project',
          description: undefined
        }
      }
    })

    // Apply filters
    let filteredVMs = vmsWithProjects
    
    if (search) {
      const searchLower = search.toLowerCase()
      filteredVMs = filteredVMs.filter(vm => 
        vm.email.toLowerCase().includes(searchLower) ||
        vm.vmAccount.toLowerCase().includes(searchLower) ||
        vm.vmDomain.toLowerCase().includes(searchLower)
      )
    }

    if (projectId) {
      filteredVMs = filteredVMs.filter(vm => vm.projectId === projectId)
    }

    if (expiryStatus && expiryStatus !== 'all') {
      const now = new Date()
      filteredVMs = filteredVMs.filter(vm => {
        const expiry = new Date(vm.currentExpiryDate)
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (expiryStatus === 'expired') return daysUntilExpiry < 0
        if (expiryStatus === 'expiring') return daysUntilExpiry >= 0 && daysUntilExpiry <= 7
        if (expiryStatus === 'active') return daysUntilExpiry > 7
        return true
      })
    }

    return NextResponse.json({
      vms: filteredVMs,
      total: filteredVMs.length
    })
  } catch (error) {
    console.error('Error fetching VMs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VMs' },
      { status: 500 }
    )
  }
}

// POST /api/vms-simple - Create new VM
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, vmAccount, vmInternalIP, vmDomain, vmStartDate, projectId, currentExpiryDate, comment } = body

    // Validate required fields
    if (!email || !vmAccount || !vmInternalIP || !vmDomain || !vmStartDate || !projectId || !currentExpiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find project
    const project = await storage.findProjectById(projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
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

    // Create VM
    const newVM = await storage.createVMRecord({
      email,
      vmAccount,
      vmInternalIP,
      vmDomain,
      vmStartDate,
      currentExpiryDate,
      projectId,
      createdBy: currentUser.id,
      comment: comment || undefined
    })

    // Log audit
    const auditUser = await getCurrentUserForAudit()
    await safeCreateAuditLog({
      operation: 'CREATE_VM',
      entityType: 'VMRecord',
      entityId: newVM.id,
      userId: auditUser.userId,
      userEmail: auditUser.userEmail,
      changes: {
        email: newVM.email,
        vmAccount: newVM.vmAccount,
        vmInternalIP: newVM.vmInternalIP,
        vmDomain: newVM.vmDomain,
        vmStartDate: newVM.vmStartDate,
        currentExpiryDate: newVM.currentExpiryDate,
        projectId: newVM.projectId
      }
    })

    return NextResponse.json(newVM, { status: 201 })
  } catch (error) {
    console.error('Error creating VM:', error)
    return NextResponse.json(
      { error: 'Failed to create VM' },
      { status: 500 }
    )
  }
}
