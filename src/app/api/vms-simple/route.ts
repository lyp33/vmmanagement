import { NextResponse } from 'next/server'
import { mockData } from '@/lib/mock-data'

// GET /api/vms-simple - Get all VMs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const projectId = searchParams.get('projectId')
    const expiryStatus = searchParams.get('expiryStatus')

    let vms = mockData.getVMs()

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      vms = vms.filter(vm => 
        vm.email.toLowerCase().includes(searchLower) ||
        vm.vmAccount.toLowerCase().includes(searchLower) ||
        vm.vmDomain.toLowerCase().includes(searchLower)
      )
    }

    if (projectId) {
      vms = vms.filter(vm => vm.project.id === projectId)
    }

    if (expiryStatus && expiryStatus !== 'all') {
      const now = new Date()
      vms = vms.filter(vm => {
        const expiry = new Date(vm.currentExpiryDate)
        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (expiryStatus === 'expired') return daysUntilExpiry < 0
        if (expiryStatus === 'expiring') return daysUntilExpiry >= 0 && daysUntilExpiry <= 7
        if (expiryStatus === 'active') return daysUntilExpiry > 7
        return true
      })
    }

    return NextResponse.json({
      vms,
      total: vms.length
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
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, vmAccount, vmInternalIP, vmDomain, projectId, currentExpiryDate } = body

    // Validate required fields
    if (!email || !vmAccount || !vmInternalIP || !vmDomain || !projectId || !currentExpiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find project
    const project = mockData.getProjectById(projectId)
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Create VM
    const newVM = mockData.createVM({
      email,
      vmAccount,
      vmInternalIP,
      vmDomain,
      currentExpiryDate,
      project: {
        id: project.id,
        name: project.name
      },
      createdBy: 'admin'
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
