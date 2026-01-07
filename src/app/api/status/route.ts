import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test all simplified APIs
    const apis = [
      { name: 'VMs', url: '/api/vms-simple' },
      { name: 'Projects', url: '/api/projects-simple' },
      { name: 'Users', url: '/api/users-simple' },
      { name: 'Audit', url: '/api/audit-simple' }
    ]

    const results = []
    
    for (const api of apis) {
      try {
        const response = await fetch(`http://localhost:3000${api.url}`)
        results.push({
          name: api.name,
          status: response.ok ? 'OK' : 'ERROR',
          statusCode: response.status
        })
      } catch (error) {
        results.push({
          name: api.name,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'VM到期管理系统状态检查',
      timestamp: new Date().toISOString(),
      apis: results,
      overall: results.every(r => r.status === 'OK') ? 'HEALTHY' : 'PARTIAL'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}