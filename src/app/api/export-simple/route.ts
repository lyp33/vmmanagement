import { NextRequest, NextResponse } from 'next/server'

// Simplified export API for mock data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'vm'
    const format = searchParams.get('format') || 'json'

    let exportData: any[] = []
    let filename = ''

    // Mock data for export
    switch (type) {
      case 'vm':
        exportData = [
          {
            id: 'vm1',
            email: 'user1@example.com',
            vmAccount: 'vm-user1',
            vmInternalIP: '192.168.1.10',
            vmDomain: 'vm1.example.com',
            projectName: '项目A',
            currentExpiryDate: '2024-04-01',
            status: '已过期',
            createdAt: '2024-01-01'
          },
          {
            id: 'vm2',
            email: 'user2@example.com',
            vmAccount: 'vm-user2',
            vmInternalIP: '192.168.1.11',
            vmDomain: 'vm2.example.com',
            projectName: '项目B',
            currentExpiryDate: '2024-01-10',
            status: '已过期',
            createdAt: '2024-01-02'
          }
        ]
        filename = `vm-export-${new Date().toISOString().slice(0, 10)}.${format}`
        break

      case 'project':
        exportData = [
          {
            id: 'proj1',
            name: '项目A',
            description: '合作伙伴A的开发项目',
            vmCount: 2,
            userCount: 1,
            createdAt: '2024-01-01'
          },
          {
            id: 'proj2',
            name: '项目B',
            description: '合作伙伴B的开发项目',
            vmCount: 1,
            userCount: 2,
            createdAt: '2024-01-02'
          },
          {
            id: 'proj3',
            name: '测试项目C',
            description: '这是一个自动化测试创建的项目',
            vmCount: 0,
            userCount: 0,
            createdAt: '2026-01-06'
          }
        ]
        filename = `project-export-${new Date().toISOString().slice(0, 10)}.${format}`
        break

      case 'audit':
        exportData = [
          {
            id: 'audit1',
            operation: 'CREATE',
            entityType: 'VMRecord',
            userEmail: 'admin@example.com',
            timestamp: '2024-01-01 18:00:00',
            changes: 'email: "user1@example.com", vmAccount: "vm-user1"',
            ipAddress: '192.168.1.100'
          },
          {
            id: 'audit2',
            operation: 'UPDATE',
            entityType: 'VMRecord',
            userEmail: 'admin@example.com',
            timestamp: '2024-01-02 22:30:00',
            changes: 'currentExpiryDate: "2024-04-01T00:00:00Z"',
            ipAddress: '192.168.1.100'
          },
          {
            id: 'audit3',
            operation: 'LOGIN',
            entityType: 'User',
            userEmail: 'user@example.com',
            timestamp: '2024-01-03 17:15:00',
            changes: '无变更',
            ipAddress: '192.168.1.101'
          }
        ]
        filename = `audit-export-${new Date().toISOString().slice(0, 10)}.${format}`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        )
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csvContent = convertToCSV(exportData)
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    } else {
      // JSON format
      const jsonContent = JSON.stringify({
        exportInfo: {
          type,
          format,
          exportedAt: new Date().toISOString(),
          recordCount: exportData.length
        },
        data: exportData
      }, null, 2)

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Helper function to convert data to CSV
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''

  // Get headers from the first object
  const headers = Object.keys(data[0])
  
  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Handle null/undefined values
        if (value === null || value === undefined) return ''
        // Handle objects and arrays
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        // Handle strings with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return String(value)
      }).join(',')
    )
  ].join('\n')

  return csvContent
}
